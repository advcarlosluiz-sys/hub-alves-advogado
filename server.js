const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { Pool } = require('pg');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const app = express();
const PORT = process.env.PORT || 3000;

// ──────────────────────────────────────────────
// Database Connection Configuration (PostgreSQL for Supabase in Cloud/Production)
let pool = null;
if (process.env.DATABASE_URL) {
    console.log('[INFO] DATABASE_URL detectada. Usando banco de dados PostgreSQL (Supabase).');
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
} else {
    console.log('[INFO] Nenhuma DATABASE_URL configurada. Usando fallback de arquivos JSON locais.');
}

const DB_DIR = path.join(__dirname, 'db');
const BACKUP_DIR = path.join(__dirname, 'backups', 'local');
const LEADS_FILE = path.join(DB_DIR, 'leads.json');
const LOGS_FILE = path.join(DB_DIR, 'logs.json');
const SETTINGS_FILE = path.join(DB_DIR, 'settings.json');

// Ensure database folders exist (only if not using database)
if (!pool) {
    try {
        if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
        if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

        // Initialize files if they don't exist
        const initJSONFile = (filePath, defaultVal = []) => {
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2), 'utf-8');
            }
        };

        initJSONFile(LEADS_FILE, []);
        initJSONFile(LOGS_FILE, []);
        initJSONFile(SETTINGS_FILE, { logRetentionDays: 90 });
    } catch (err) {
        console.warn('[AVISO] Falha ao inicializar sistema de arquivos local:', err.message);
    }
}

// Helper Database Functions for Local JSON fallback
function readJSON(file) {
    try {
        const raw = fs.readFileSync(file, 'utf-8');
        return JSON.parse(raw);
    } catch (err) {
        console.error(`Erro ao ler arquivo ${file}:`, err);
        return [];
    }
}

function writeJSON(file, data) {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
        console.error(`Erro ao escrever no arquivo ${file}:`, err);
    }
}

// Auto-create tables in Supabase PostgreSQL
async function initDB() {
    if (!pool) return;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS leads (
                id VARCHAR(255) PRIMARY KEY,
                nome TEXT,
                email TEXT,
                "telefoneWhatsapp" TEXT,
                "temaJuridico" TEXT,
                "motivoContato" TEXT,
                "interessePresumido" TEXT,
                origem TEXT,
                "paginaOrigem" TEXT,
                "consentimentoLgpd" BOOLEAN,
                "consentimentoTextoVersao" TEXT,
                "dataCriacao" TIMESTAMP WITH TIME ZONE,
                status TEXT DEFAULT 'novo',
                "observacoesInternas" TEXT DEFAULT ''
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS logs (
                id VARCHAR(255) PRIMARY KEY,
                type VARCHAR(50),
                timestamp TIMESTAMP WITH TIME ZONE,
                event TEXT,
                action TEXT,
                "actorEmail" TEXT,
                "entityType" TEXT,
                "entityId" TEXT,
                reason TEXT,
                message TEXT,
                "previousHash" TEXT,
                "integrityHash" TEXT,
                metadata JSONB
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS settings (
                key VARCHAR(255) PRIMARY KEY,
                value JSONB
            )
        `);

        console.log('[OK] Tabelas do banco de dados (Supabase) verificadas/criadas com sucesso.');
    } catch (err) {
        console.error('[ERRO] Falha ao inicializar tabelas do banco de dados:', err);
    }
}

// Run database init if active
if (pool) {
    initDB();
}

// ──────────────────────────────────────────────
// Database Abstraction Adapter (Hybrid JSON / PG)
// ──────────────────────────────────────────────

async function getLeadsFromDB() {
    if (pool) {
        const res = await pool.query('SELECT id, nome, email, "telefoneWhatsapp", "temaJuridico", "motivoContato", "interessePresumido", origem, "paginaOrigem", "consentimentoLgpd", "consentimentoTextoVersao", "dataCriacao", status, "observacoesInternas" FROM leads');
        return res.rows.map(row => ({
            id: row.id,
            nome: row.nome,
            email: row.email,
            telefoneWhatsapp: row.telefoneWhatsapp,
            temaJuridico: row.temaJuridico,
            motivoContato: row.motivoContato,
            interessePresumido: row.interessePresumido,
            origem: row.origem,
            paginaOrigem: row.paginaOrigem,
            consentimentoLgpd: row.consentimentoLgpd,
            consentimentoTextoVersao: row.consentimentoTextoVersao,
            dataCriacao: row.dataCriacao ? row.dataCriacao.toISOString() : null,
            status: row.status,
            observacoesInternas: row.observacoesInternas
        }));
    }
    return readJSON(LEADS_FILE);
}

async function saveLeadToDB(lead) {
    if (pool) {
        await pool.query(
            `INSERT INTO leads (id, nome, email, "telefoneWhatsapp", "temaJuridico", "motivoContato", "interessePresumido", origem, "paginaOrigem", "consentimentoLgpd", "consentimentoTextoVersao", "dataCriacao", status, "observacoesInternas")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
                lead.id,
                lead.nome,
                lead.email,
                lead.telefoneWhatsapp,
                lead.temaJuridico,
                lead.motivoContato,
                lead.interessePresumido,
                lead.origem,
                lead.paginaOrigem,
                lead.consentimentoLgpd,
                lead.consentimentoTextoVersao,
                lead.dataCriacao || new Date().toISOString(),
                lead.status || 'novo',
                lead.observacoesInternas || ''
            ]
        );
    } else {
        const leads = readJSON(LEADS_FILE);
        leads.push(lead);
        writeJSON(LEADS_FILE, leads);
    }
}

async function getLogsFromDB(type, limit) {
    if (pool) {
        let query = 'SELECT id, type, timestamp, event, action, "actorEmail", "entityType", "entityId", reason, message, "previousHash", "integrityHash", metadata FROM logs';
        const params = [];
        if (type) {
            query += ' WHERE type = $1';
            params.push(type);
        }
        query += ' ORDER BY timestamp DESC';
        if (limit) {
            query += ` LIMIT $${params.length + 1}`;
            params.push(parseInt(limit));
        }
        const res = await pool.query(query, params);
        return res.rows.map(row => ({
            id: row.id,
            type: row.type,
            timestamp: row.timestamp ? row.timestamp.toISOString() : null,
            event: row.event,
            action: row.action,
            actorEmail: row.actorEmail,
            entityType: row.entityType,
            entityId: row.entityId,
            reason: row.reason,
            message: row.message,
            previousHash: row.previousHash,
            integrityHash: row.integrityHash,
            metadata: row.metadata
        }));
    }
    const logs = readJSON(LOGS_FILE);
    let filtered = logs;
    if (type) filtered = logs.filter(l => l.type === type);
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    if (limit) filtered = filtered.slice(0, parseInt(limit));
    return filtered;
}

async function saveLogToDB(log) {
    if (pool) {
        await pool.query(
            `INSERT INTO logs (id, type, timestamp, event, action, "actorEmail", "entityType", "entityId", reason, message, "previousHash", "integrityHash", metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
                log.id,
                log.type,
                log.timestamp || new Date().toISOString(),
                log.event || null,
                log.action || null,
                log.actorEmail || null,
                log.entityType || null,
                log.entityId || null,
                log.reason || null,
                log.message || null,
                log.previousHash || null,
                log.integrityHash || null,
                log.metadata ? JSON.stringify(log.metadata) : null
            ]
        );
    } else {
        const logs = readJSON(LOGS_FILE);
        logs.push(log);
        writeJSON(LOGS_FILE, logs);
    }
}

async function getSettingsFromDB() {
    if (pool) {
        const res = await pool.query('SELECT value FROM settings WHERE key = $1', ['global']);
        if (res.rows.length > 0) {
            return typeof res.rows[0].value === 'string' ? JSON.parse(res.rows[0].value) : res.rows[0].value;
        }
        return { logRetentionDays: 90 };
    }
    return readJSON(SETTINGS_FILE);
}

async function saveSettingsToDB(val) {
    if (pool) {
        await pool.query(
            `INSERT INTO settings (key, value) VALUES ($1, $2)
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
            ['global', JSON.stringify(val)]
        );
    } else {
        writeJSON(SETTINGS_FILE, val);
    }
}

// Helper Audit Log & Sanitization
function getIPHash(req) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    return crypto.createHash('sha256').update(ip).digest('hex');
}

function sanitizeText(str) {
    if (typeof str !== 'string') return '';
    let sanitized = str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    sanitized = sanitized.replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, '[CPF-MASCARADO]');
    sanitized = sanitized.replace(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g, '[CNPJ-MASCARADO]');
    return sanitized;
}

// Write to logs (supports hybrid storage and integrity chain)
async function addLog(type, eventData) {
    const newLog = {
        id: crypto.randomUUID(),
        type,
        timestamp: new Date().toISOString(),
        ...eventData
    };

    if (newLog.reason) newLog.reason = sanitizeText(newLog.reason);
    if (newLog.message) newLog.message = sanitizeText(newLog.message);

    if (type === 'audit') {
        let prevHash = 'GENESIS_AUDIT_LOG_CLA';
        if (pool) {
            const res = await pool.query('SELECT "integrityHash" FROM logs WHERE type = \'audit\' ORDER BY timestamp DESC LIMIT 1');
            if (res.rows.length > 0) {
                prevHash = res.rows[0].integrityHash;
            }
        } else {
            const logs = readJSON(LOGS_FILE);
            const auditLogs = logs.filter(l => l.type === 'audit');
            const lastAuditLog = auditLogs[auditLogs.length - 1];
            if (lastAuditLog) {
                prevHash = lastAuditLog.integrityHash;
            }
        }
        
        newLog.previousHash = prevHash;
        newLog.integrityHash = crypto.createHash('sha256')
            .update(newLog.id + (newLog.actorEmail || '') + (newLog.action || '') + prevHash + newLog.timestamp)
            .digest('hex');
    }

    await saveLogToDB(newLog);

    try {
        const settings = await getSettingsFromDB();
        const retentionDays = settings.logRetentionDays || 90;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        if (pool) {
            await pool.query('DELETE FROM logs WHERE timestamp < $1', [cutoffDate]);
        } else {
            const logs = readJSON(LOGS_FILE);
            const filteredLogs = logs.filter(log => new Date(log.timestamp) > cutoffDate);
            writeJSON(LOGS_FILE, filteredLogs);
        }
    } catch(e) {
        console.error('Erro na retenção de logs:', e);
    }
}

// ──────────────────────────────────────────────
// 2. Middlewares & Rate Limits
// ──────────────────────────────────────────────
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Helmet Headers configuration
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://carlosanalytics.vercel.app", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'", "https://*.supabase.co", "wss://*.supabase.co", "https://api.openai.com", "https://carlosanalytics.vercel.app", "https://formsubmit.co"],
            frameAncestors: ["'none'"]
        }
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xFrameOptions: { action: 'deny' }
}));

// Add some custom security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});

// Rate Limits
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 mins
    max: 5, // Limit 5 attempts
    message: { message: 'Muitas tentativas de login. Tente novamente após 15 minutos.' },
    handler: async (req, res, next, options) => {
        await addLog('auth', {
            event: 'login_failed',
            email: req.body.email || 'N/A',
            ipHash: getIPHash(req),
            userAgent: req.headers['user-agent'],
            success: false,
            reason: 'Rate limit de login excedido'
        });
        res.status(options.statusCode).send(options.message);
    }
});

const formSubmissionLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 10, // Max 10 submissions per IP per hour
    message: { message: 'Limite de envio de formulários excedido por hoje.' }
});

// ──────────────────────────────────────────────
// 3. User Authentication Middleware
// ──────────────────────────────────────────────
const authenticateJWT = async (req, res, next) => {
    const token = req.cookies.admin_session || (req.headers.authorization && req.headers.authorization.split(' ')[1]) || req.query.token;

    if (!token) {
        await addLog('auth', {
            event: 'unauthorized_access_attempt',
            ipHash: getIPHash(req),
            userAgent: req.headers['user-agent'],
            success: false,
            reason: `Tentativa de acesso sem token na rota: ${req.originalUrl}`
        });
        return res.status(401).json({ message: 'Acesso negado. Faça login para continuar.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        req.user = decoded;
        
        // Allowed email check
        if (decoded.email !== process.env.ADMIN_ALLOWED_EMAIL) {
            return res.status(403).json({ message: 'Acesso não autorizado para esta conta.' });
        }
        
        next();
    } catch (err) {
        await addLog('auth', {
            event: 'session_expired',
            ipHash: getIPHash(req),
            success: false,
            reason: 'Token de sessão inválido ou expirado'
        });
        return res.status(403).json({ message: 'Sessão inválida ou expirada. Faça login novamente.' });
    }
};

// ──────────────────────────────────────────────
// 4. API Endpoints
// ──────────────────────────────────────────────

// Public API: Contact Form Submission (Fase 2)
app.post('/api/leads', formSubmissionLimiter, async (req, res) => {
    try {
        const { Nome, Email, Telefone, Mensagem, _consent, website_confirm } = req.body;

        // Simple Honeypot Check
        if (website_confirm) {
            await addLog('audit', {
                actorEmail: 'SYSTEM_HONEYPOT',
                action: 'spam_blocked',
                entityType: 'submission',
                metadata: { ipHash: getIPHash(req) }
            });
            return res.status(200).json({ success: true, message: 'Solicitação recebida com sucesso!' });
        }

        // Check LGPD consent
        if (_consent !== 'true' && _consent !== true) {
            await addLog('error', {
                event: 'form_submission_error',
                message: 'Submissão de formulário recusada por falta de consentimento LGPD'
            });
            return res.status(400).json({ message: 'Você precisa concordar com os termos de privacidade para enviar a solicitação.' });
        }

        // Validations
        if (!Nome || !Telefone || !Mensagem) {
            return res.status(400).json({ message: 'Campos Nome, Telefone e Mensagem são obrigatórios.' });
        }

        // Inputs Sanitization and Length enforcement
        const sName = sanitizeText(Nome).substring(0, 100);
        const sEmail = Email ? sanitizeText(Email).substring(0, 100) : '';
        const sPhone = sanitizeText(Telefone).substring(0, 30);
        const sMessage = sanitizeText(Mensagem).substring(0, 1000);

        // Theme and Presumed Interest classification
        let deducedCategory = 'Direito Civil';
        let deducedInterest = 'Direito Civil / Outros';
        
        const lowerMsg = sMessage.toLowerCase();
        
        if (lowerMsg.includes('inventário') || lowerMsg.includes('partilha') || lowerMsg.includes('divórcio') || lowerMsg.includes('pensão') || lowerMsg.includes('guarda') || lowerMsg.includes('herança') || lowerMsg.includes('sucess') || lowerMsg.includes('testamento')) {
            deducedCategory = 'Família e Sucessões';
            deducedInterest = 'Família e Sucessões / ';
            if (lowerMsg.includes('inventário')) deducedInterest += 'Inventário';
            else if (lowerMsg.includes('divórcio')) deducedInterest += 'Divórcio';
            else deducedInterest += 'Planejamento Sucessório';
        } else if (lowerMsg.includes('imóvel') || lowerMsg.includes('imobiliário') || lowerMsg.includes('aluguel') || lowerMsg.includes('locação') || lowerMsg.includes('escritura') || lowerMsg.includes('posse') || lowerMsg.includes('propriedade') || lowerMsg.includes('usucapião')) {
            deducedCategory = 'Direito Imobiliário';
            deducedInterest = 'Direito Imobiliário / ';
            if (lowerMsg.includes('locação') || lowerMsg.includes('aluguel')) deducedInterest += 'Contrato de Locação';
            else if (lowerMsg.includes('usucapião')) deducedInterest += 'Regularização de Posse';
            else deducedInterest += 'Operações Imobiliárias';
        } else if (lowerMsg.includes('reforma tributária') || lowerMsg.includes('tributo') || lowerMsg.includes('imposto') || lowerMsg.includes('cbs') || lowerMsg.includes('ibs') || lowerMsg.includes('simples nacional') || lowerMsg.includes('fisco') || lowerMsg.includes('planejamento tributário')) {
            deducedCategory = 'Reforma Tributária';
            deducedInterest = 'Reforma Tributária / ';
            if (lowerMsg.includes('cbs') || lowerMsg.includes('ibs')) deducedInterest += 'Transição CBS/IBS';
            else deducedInterest += 'Planejamento Fiscal';
        } else if (lowerMsg.includes('empresarial') || lowerMsg.includes('sócio') || lowerMsg.includes('sociedade') || lowerMsg.includes('empresa') || lowerMsg.includes('holding') || lowerMsg.includes('societário')) {
            deducedCategory = 'Empresarial';
            deducedInterest = 'Empresarial / ';
            if (lowerMsg.includes('holding')) deducedInterest += 'Holding Familiar';
            else deducedInterest += 'Conflito Societário';
        } else if (lowerMsg.includes('contrato') || lowerMsg.includes('cláusula') || lowerMsg.includes('revisar')) {
            deducedCategory = 'Contratos';
            deducedInterest = 'Contratos / Revisão Contratual';
        } else if (lowerMsg.includes('banco') || lowerMsg.includes('juros') || lowerMsg.includes('empréstimo') || lowerMsg.includes('financiamento') || lowerMsg.includes('fraude bancária') || lowerMsg.includes('golpe')) {
            deducedCategory = 'Bancário';
            deducedInterest = 'Consumidor/Bancário / Juros e Taxas';
        } else if (lowerMsg.includes('cobrança') || lowerMsg.includes('execução') || lowerMsg.includes('dívida') || lowerMsg.includes('recuperar') || lowerMsg.includes('crédito') || lowerMsg.includes('cheque') || lowerMsg.includes('duplicata')) {
            deducedCategory = 'Execução e Cobrança';
            deducedInterest = 'Execução/Cobrança / Recuperação de Créditos';
        } else if (lowerMsg.includes('consumidor') || lowerMsg.includes('compra') || lowerMsg.includes('atraso') || lowerMsg.includes('danos morais') || lowerMsg.includes('produto') || lowerMsg.includes('defeito')) {
            deducedCategory = 'Consumidor';
            deducedInterest = 'Consumidor / Indenização';
        }

        const newLead = {
            id: crypto.randomUUID(),
            nome: sName,
            email: sEmail,
            telefoneWhatsapp: sPhone,
            temaJuridico: deducedCategory,
            motivoContato: sMessage,
            interessePresumido: deducedInterest,
            origem: req.body._origin || 'Website Principal',
            paginaOrigem: req.body._page_origin || '/',
            consentimentoLgpd: true,
            consentimentoTextoVersao: 'Li e concordo com a Política de Privacidade...',
            dataCriacao: new Date().toISOString(),
            status: 'novo',
            observacoesInternas: ''
        };

        await saveLeadToDB(newLead);

        await addLog('audit', {
            actorEmail: 'SYSTEM_API',
            action: 'lead_created',
            entityType: 'lead',
            entityId: newLead.id,
            metadata: {
                tema: deducedCategory,
                interesse: deducedInterest
            }
        });

        return res.status(200).json({ success: true, message: 'Solicitação enviada com sucesso!' });
    } catch (err) {
        await addLog('error', {
            event: 'form_submission_error',
            message: `Erro na submissão do formulário: ${err.message}`
        });
        return res.status(500).json({ message: 'Erro interno ao processar solicitação.' });
    }
});

// Admin Authentication: Login (Fase 1)
app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });
        }

        // Allowed email check (Allowlist)
        if (email !== process.env.ADMIN_ALLOWED_EMAIL) {
            await addLog('auth', {
                event: 'login_failed',
                email,
                ipHash: getIPHash(req),
                userAgent: req.headers['user-agent'],
                success: false,
                reason: 'E-mail administrativo não cadastrado'
            });
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        // Bcrypt comparison
        const isMatch = bcrypt.compareSync(password, process.env.ADMIN_PASSWORD_HASH);
        if (!isMatch) {
            await addLog('auth', {
                event: 'login_failed',
                email,
                ipHash: getIPHash(req),
                userAgent: req.headers['user-agent'],
                success: false,
                reason: 'Senha incorreta'
            });
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        // Issue JWT token
        const token = jwt.sign(
            { email, role: 'admin' },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '2h' }
        );

        // Store in HttpOnly Cookie
        res.cookie('admin_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 2 * 60 * 60 * 1000
        });

        await addLog('auth', {
            event: 'login_success',
            email,
            ipHash: getIPHash(req),
            userAgent: req.headers['user-agent'],
            success: true
        });

        return res.status(200).json({
            success: true,
            token,
            user: { email, name: 'Dr. Carlos Luiz Alves' }
        });
    } catch (err) {
        await addLog('error', {
            event: 'unexpected_error',
            message: `Erro na autenticação de login: ${err.message}`
        });
        return res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});

// Admin Authentication: Logout
app.post('/api/auth/logout', async (req, res) => {
    const token = req.cookies.admin_session;
    let email = 'N/A';
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
            email = decoded.email;
        } catch(e){}
    }

    res.clearCookie('admin_session');
    await addLog('auth', {
        event: 'logout',
        email,
        ipHash: getIPHash(req),
        success: true
    });
    return res.status(200).json({ success: true, message: 'Sessão encerrada.' });
});

// Admin: Get Metrics (Fase 1 Overview)
app.get('/api/admin/metrics', authenticateJWT, async (req, res) => {
    try {
        const leads = await getLeadsFromDB();
        const logs = await getLogsFromDB();
        
        const totalLeads = leads.length;
        const newLeads = leads.filter(l => l.status === 'novo').length;

        // Calculate logs count today
        const startOfToday = new Date();
        startOfToday.setHours(0,0,0,0);
        const securityLogsToday = logs.filter(l => l.type === 'auth' && new Date(l.timestamp) >= startOfToday).length;

        // Last backup info
        let lastBackup = 'Não realizado';
        if (fs.existsSync(BACKUP_DIR)) {
            const manifests = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.manifest.json'));
            if (manifests.length > 0) {
                manifests.sort();
                const newest = manifests[manifests.length - 1];
                try {
                    const mData = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, newest), 'utf-8'));
                    lastBackup = new Date(mData.timestamp).toLocaleString('pt-BR');
                } catch (e) {}
            }
        }

        // Requests by theme distribution
        const leadsByTema = {};
        leads.forEach(l => {
            leadsByTema[l.temaJuridico] = (leadsByTema[l.temaJuridico] || 0) + 1;
        });

        return res.status(200).json({
            totalLeads,
            newLeads,
            securityLogsToday,
            lastBackup,
            leadsByTema
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Erro ao carregar métricas.' });
    }
});

// Admin: Get Leads (Fase 1/2)
app.get('/api/admin/leads', authenticateJWT, async (req, res) => {
    try {
        const leads = await getLeadsFromDB();
        leads.sort((a,b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
        return res.status(200).json(leads);
    } catch (err) {
        return res.status(500).json({ message: 'Erro ao ler leads.' });
    }
});

// Admin: Update Lead (Fase 9 details edit)
app.put('/api/admin/leads/:id', authenticateJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, observacoesInternas } = req.body;

        if (pool) {
            const checkRes = await pool.query('SELECT status, "observacoesInternas" FROM leads WHERE id = $1', [id]);
            if (checkRes.rows.length === 0) {
                return res.status(404).json({ message: 'Lead não encontrado.' });
            }
            const oldLead = checkRes.rows[0];
            const newStatus = status || oldLead.status;
            const newObs = observacoesInternas !== undefined ? sanitizeText(observacoesInternas) : oldLead.observacoesInternas;

            await pool.query(
                'UPDATE leads SET status = $1, "observacoesInternas" = $2 WHERE id = $3',
                [newStatus, newObs, id]
            );

            await addLog('audit', {
                actorEmail: req.user.email,
                action: 'lead_updated',
                entityType: 'lead',
                entityId: id,
                metadata: {
                    oldStatus: oldLead.status,
                    newStatus
                }
            });

            const updatedLeadRes = await pool.query('SELECT id, nome, email, "telefoneWhatsapp", "temaJuridico", "motivoContato", "interessePresumido", origem, "paginaOrigem", "consentimentoLgpd", "consentimentoTextoVersao", "dataCriacao", status, "observacoesInternas" FROM leads WHERE id = $1', [id]);
            const row = updatedLeadRes.rows[0];
            return res.status(200).json({
                success: true,
                lead: {
                    id: row.id,
                    nome: row.nome,
                    email: row.email,
                    telefoneWhatsapp: row.telefoneWhatsapp,
                    temaJuridico: row.temaJuridico,
                    motivoContato: row.motivoContato,
                    interessePresumido: row.interessePresumido,
                    origem: row.origem,
                    paginaOrigem: row.paginaOrigem,
                    consentimentoLgpd: row.consentimentoLgpd,
                    consentimentoTextoVersao: row.consentimentoTextoVersao,
                    dataCriacao: row.dataCriacao ? row.dataCriacao.toISOString() : null,
                    status: row.status,
                    observacoesInternas: row.observacoesInternas
                }
            });
        } else {
            const leads = readJSON(LEADS_FILE);
            const idx = leads.findIndex(l => l.id === id);
            if (idx === -1) {
                return res.status(404).json({ message: 'Lead não encontrado.' });
            }
            const oldLead = leads[idx];
            leads[idx] = {
                ...oldLead,
                status: status || oldLead.status,
                observacoesInternas: observacoesInternas !== undefined ? sanitizeText(observacoesInternas) : oldLead.observacoesInternas
            };
            writeJSON(LEADS_FILE, leads);

            await addLog('audit', {
                actorEmail: req.user.email,
                action: 'lead_updated',
                entityType: 'lead',
                entityId: id,
                metadata: {
                    oldStatus: oldLead.status,
                    newStatus: status
                }
            });
            return res.status(200).json({ success: true, lead: leads[idx] });
        }
    } catch (err) {
        return res.status(500).json({ message: 'Erro ao salvar dados.' });
    }
});

// Admin: Deletion Request GDPR Holder (Fase 8 Config delete)
app.delete('/api/admin/leads/holder', authenticateJWT, async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ message: 'E-mail inválido.' });

        if (pool) {
            const countRes = await pool.query('SELECT count(*) FROM leads WHERE email = $1', [email]);
            const deletedCount = parseInt(countRes.rows[0].count);
            if (deletedCount === 0) {
                return res.status(404).json({ message: 'Nenhum lead encontrado para este e-mail.' });
            }

            await pool.query('DELETE FROM leads WHERE email = $1', [email]);

            await addLog('audit', {
                actorEmail: req.user.email,
                action: 'lead_deleted_holder_gdpr',
                entityType: 'holder_request',
                metadata: { email, count: deletedCount }
            });

            return res.status(200).json({ success: true, message: `Excluídos ${deletedCount} leads vinculados ao e-mail ${email}.` });
        } else {
            const leads = readJSON(LEADS_FILE);
            const filtered = leads.filter(l => l.email !== email);
            const deletedCount = leads.length - filtered.length;

            if (deletedCount === 0) {
                return res.status(404).json({ message: 'Nenhum lead encontrado para este e-mail.' });
            }

            writeJSON(LEADS_FILE, filtered);

            await addLog('audit', {
                actorEmail: req.user.email,
                action: 'lead_deleted_holder_gdpr',
                entityType: 'holder_request',
                metadata: { email, count: deletedCount }
            });

            return res.status(200).json({ success: true, message: `Excluídos ${deletedCount} leads vinculados ao e-mail ${email}.` });
        }
    } catch (err) {
        return res.status(500).json({ message: 'Erro ao excluir dados do titular.' });
    }
});

// Admin: Delete Single Lead (Fase 9 delete)
app.delete('/api/admin/leads/:id', authenticateJWT, async (req, res) => {
    try {
        const { id } = req.params;
        if (pool) {
            const checkRes = await pool.query('SELECT nome FROM leads WHERE id = $1', [id]);
            if (checkRes.rows.length === 0) {
                return res.status(404).json({ message: 'Lead não encontrado.' });
            }
            const name = checkRes.rows[0].nome;
            await pool.query('DELETE FROM leads WHERE id = $1', [id]);

            await addLog('audit', {
                actorEmail: req.user.email,
                action: 'lead_deleted',
                entityType: 'lead',
                entityId: id,
                metadata: { name }
            });

            return res.status(200).json({ success: true, message: 'Lead excluído permanentemente.' });
        } else {
            const leads = readJSON(LEADS_FILE);
            const idx = leads.findIndex(l => l.id === id);

            if (idx === -1) {
                return res.status(404).json({ message: 'Lead não encontrado.' });
            }

            const name = leads[idx].nome;
            leads.splice(idx, 1);
            writeJSON(LEADS_FILE, leads);

            await addLog('audit', {
                actorEmail: req.user.email,
                action: 'lead_deleted',
                entityType: 'lead',
                entityId: id,
                metadata: { name }
            });

            return res.status(200).json({ success: true, message: 'Lead excluído permanentemente.' });
        }
    } catch (err) {
        return res.status(500).json({ message: 'Erro ao excluir lead.' });
    }
});

// Admin: Get Logs (Fase 3 & 9)
app.get('/api/admin/logs', authenticateJWT, async (req, res) => {
    try {
        const { type, limit } = req.query;
        const logs = await getLogsFromDB(type, limit);
        return res.status(200).json(logs);
    } catch (err) {
        return res.status(500).json({ message: 'Erro ao ler logs.' });
    }
});

// Admin: Post Export Event Log
app.post('/api/admin/logs/export', authenticateJWT, async (req, res) => {
    const { file, format } = req.body;
    await addLog('audit', {
        actorEmail: req.user.email,
        action: 'lead_exported',
        entityType: 'export',
        metadata: { file, format }
    });
    return res.status(200).json({ success: true });
});

// Admin: List backups (Fase 4)
app.get('/api/admin/backups', authenticateJWT, (req, res) => {
    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            return res.status(200).json([]);
        }
        const files = fs.readdirSync(BACKUP_DIR);
        const manifests = files.filter(f => f.endsWith('.manifest.json'));
        
        const backupList = [];
        manifests.forEach(m => {
            try {
                const data = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, m), 'utf-8'));
                backupList.push(data);
            } catch(e){}
        });

        // Sort desc
        backupList.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        return res.status(200).json(backupList);
    } catch (err) {
        return res.status(500).json({ message: 'Erro ao listar backups.' });
    }
});

// Admin: Trigger Backup (Fase 4)
app.post('/api/admin/backups', authenticateJWT, async (req, res) => {
    try {
        if (pool) {
            // Backup postgres data into JSON files first
            const leads = await getLeadsFromDB();
            const logs = await getLogsFromDB();
            const settings = await getSettingsFromDB();
            writeJSON(LEADS_FILE, leads);
            writeJSON(LOGS_FILE, logs);
            writeJSON(SETTINGS_FILE, settings);
        }

        const backupScript = require('./scripts/backup-local.js');
        const backupInfo = backupScript.runBackupSync();
        
        await addLog('audit', {
            actorEmail: req.user.email,
            action: 'backup_created',
            entityType: 'backup',
            metadata: { filename: backupInfo.filename }
        });

        return res.status(200).json({ success: true, filename: backupInfo.filename });
    } catch (err) {
        await addLog('error', {
            event: 'backup_error',
            message: `Erro ao gerar backup: ${err.message}`
        });
        return res.status(500).json({ message: `Erro ao gerar backup: ${err.message}` });
    }
});

// Admin: Verify backups (Fase 4)
app.post('/api/admin/backups/verify', authenticateJWT, async (req, res) => {
    try {
        const verifyScript = require('./scripts/backup-verify.js');
        const results = verifyScript.verifyAllSync();
        
        await addLog('audit', {
            actorEmail: req.user.email,
            action: 'backup_verified',
            entityType: 'backup',
            metadata: { results }
        });

        return res.status(200).json({ success: true, message: 'Todos os backups estão íntegros.' });
    } catch (err) {
        await addLog('error', {
            event: 'backup_error',
            message: `Erro na verificação de backups: ${err.message}`
        });
        return res.status(500).json({ message: `Erro na verificação: ${err.message}` });
    }
});

// Admin: Restore Backup (Fase 4)
app.post('/api/admin/backups/restore', authenticateJWT, async (req, res) => {
    try {
        const { filename } = req.body;
        if (!filename) return res.status(400).json({ message: 'Arquivo não informado.' });

        const restoreScript = require('./scripts/restore-local.js');
        restoreScript.restoreFileSync(filename);

        if (pool) {
            // Write restored JSON data to postgres Supabase
            const leads = readJSON(LEADS_FILE);
            const logs = readJSON(LOGS_FILE);
            const settings = readJSON(SETTINGS_FILE);

            await pool.query('DELETE FROM leads');
            for (const lead of leads) {
                await saveLeadToDB(lead);
            }

            await pool.query('DELETE FROM logs');
            for (const log of logs) {
                await saveLogToDB(log);
            }

            await saveSettingsToDB(settings);
        }

        await addLog('audit', {
            actorEmail: req.user.email,
            action: 'backup_restored',
            entityType: 'backup',
            metadata: { filename }
        });

        return res.status(200).json({ success: true, message: 'Backup restaurado com sucesso!' });
    } catch (err) {
        await addLog('error', {
            event: 'restore_error',
            message: `Erro ao restaurar backup: ${err.message}`
        });
        return res.status(500).json({ message: `Falha na restauração: ${err.message}` });
    }
});

// Admin: Download Encrypted Backup File Direct (Fase 8)
app.get('/api/admin/backups/download', async (req, res) => {
    const token = req.query.token;
    if (!token) return res.status(401).send('Token de download expirado ou ausente.');

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        if (decoded.email !== process.env.ADMIN_ALLOWED_EMAIL) {
            return res.status(403).send('Não autorizado.');
        }

        const { filename } = req.query;
        const filePath = path.join(BACKUP_DIR, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).send('Arquivo de backup não encontrado.');
        }

        await addLog('audit', {
            actorEmail: decoded.email,
            action: 'backup_exported',
            entityType: 'backup',
            metadata: { filename }
        });

        res.download(filePath);
    } catch (err) {
        return res.status(403).send('Link inválido ou sessão expirada.');
    }
});

// Admin: Get Settings
app.get('/api/admin/settings', authenticateJWT, async (req, res) => {
    try {
        const settings = await getSettingsFromDB();
        return res.status(200).json(settings);
    } catch (err) {
        return res.status(500).json({ message: 'Erro ao carregar configurações.' });
    }
});

// Admin: Save settings (Fase 8 Config)
app.put('/api/admin/settings', authenticateJWT, async (req, res) => {
    try {
        const { logRetentionDays } = req.body;
        if (!logRetentionDays || logRetentionDays < 30) {
            return res.status(400).json({ message: 'Retenção inválida (mínimo de 30 dias).' });
        }

        const settings = { logRetentionDays };
        await saveSettingsToDB(settings);

        await addLog('audit', {
            actorEmail: req.user.email,
            action: 'settings_changed',
            entityType: 'settings',
            metadata: settings
        });

        return res.status(200).json({ success: true, settings });
    } catch (err) {
        return res.status(500).json({ message: 'Erro ao salvar configurações.' });
    }
});

// ──────────────────────────────────────────────
// 5. Static Files Serving
// ──────────────────────────────────────────────
const isAdminEnabled = () => {
    return process.env.VITE_ENABLE_ADMIN === 'true';
};

app.use('/admin', (req, res, next) => {
    if (!isAdminEnabled()) {
        return res.status(404).send('Página não encontrada.');
    }
    next();
});

const scancontractsSiblingPath = path.join(__dirname, '..', 'SCANCONTRACTS');
if (fs.existsSync(scancontractsSiblingPath)) {
    app.use('/scancontracts', express.static(scancontractsSiblingPath));
    console.log(`[INFO] Rota /scancontracts mapeada localmente para: ${scancontractsSiblingPath}`);
}

app.use(express.static(path.join(__dirname)));

app.get('/politica-de-privacidade', (req, res) => {
    res.sendFile(path.join(__dirname, 'politica-de-privacidade.html'));
});

app.get('/termos-de-uso', (req, res) => {
    res.sendFile(path.join(__dirname, 'termos-de-uso.html'));
});

// ──────────────────────────────────────────────
// 6. Error Sanitization & Initialization
// ──────────────────────────────────────────────
app.use((err, req, res, next) => {
    addLog('error', {
        event: 'unexpected_error',
        message: `Erro global no servidor: ${err.message}`
    });
    res.status(500).json({ message: 'Ocorreu um erro inesperado no servidor local.' });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`[OK] Servidor local ativo em: http://localhost:${PORT}`);
        console.log(`[INFO] Painel Administrativo disponível em: http://localhost:${PORT}/admin/ (Ativo: ${isAdminEnabled()})`);
    });
}

module.exports = app;
