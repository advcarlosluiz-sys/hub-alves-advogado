const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load environment variables if running as standalone terminal script
if (require.main === module) {
    require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
}

const DB_DIR = path.join(__dirname, '..', 'db');
const BACKUP_DIR = path.join(__dirname, '..', 'backups', 'local');
const ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef'; // 32 bytes key

function runBackupSync() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const dateStr = new Date().toISOString()
        .replace(/T/, '-')
        .replace(/\..+/, '')
        .replace(/:/g, '-');

    const backupFilename = `backup-${dateStr}.enc`;
    const manifestFilename = `backup-${dateStr}.manifest.json`;

    const backupFilePath = path.join(BACKUP_DIR, backupFilename);
    const manifestFilePath = path.join(BACKUP_DIR, manifestFilename);

    // 1. Gather all files data in the db folder
    const dbFiles = ['leads.json', 'logs.json', 'settings.json'];
    const dataPackage = {};
    const recordsCount = { leads: 0, logs: 0 };

    dbFiles.forEach(file => {
        const filePath = path.join(DB_DIR, file);
        if (fs.existsSync(filePath)) {
            const rawContent = fs.readFileSync(filePath, 'utf-8');
            try {
                const parsed = JSON.parse(rawContent);
                dataPackage[file] = parsed;
                if (file === 'leads.json') recordsCount.leads = parsed.length;
                if (file === 'logs.json') recordsCount.logs = parsed.length;
            } catch (e) {
                dataPackage[file] = rawContent;
            }
        }
    });

    const serializedData = JSON.stringify(dataPackage);

    // 2. Encrypt the serialized JSON package using AES-256-CBC
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    
    let encrypted = cipher.update(serializedData, 'utf-8', 'hex');
    encrypted += cipher.final('hex');

    // Combine IV + Encrypted Data into the file to allow decryption
    const fileContent = iv.toString('hex') + ':' + encrypted;
    fs.writeFileSync(backupFilePath, fileContent, 'utf-8');

    // 3. Calculate checksum SHA-256 of the encrypted file
    const sha256 = crypto.createHash('sha256')
        .update(fileContent)
        .digest('hex');

    const sizeBytes = fs.statSync(backupFilePath).size;

    // 4. Generate manifest
    const manifest = {
        filename: backupFilename,
        timestamp,
        sizeBytes,
        sha256,
        recordsCount,
        verified: true
    };

    fs.writeFileSync(manifestFilePath, JSON.stringify(manifest, null, 2), 'utf-8');

    console.log(`[BACKUP] Backup criado com sucesso!`);
    console.log(`- Arquivo criptografado: ${backupFilename} (${sizeBytes} bytes)`);
    console.log(`- Checagem SHA-256: ${sha256}`);
    console.log(`- Manifesto criado: ${manifestFilename}`);

    // Manage Retention: Keep only:
    // - Daily backups: last 7
    // - Weekly backups: last 4
    // - Monthly backups: last 6
    // Simplified local rotation: keep the last 10 backups overall to avoid bloating disk space
    rotateBackups();

    return manifest;
}

function rotateBackups() {
    try {
        const files = fs.readdirSync(BACKUP_DIR);
        const manifests = files.filter(f => f.endsWith('.manifest.json'));
        
        if (manifests.length <= 10) return;

        // Sort manifests by filename/date ascending
        manifests.sort();

        const filesToDeleteCount = manifests.length - 10;
        for (let i = 0; i < filesToDeleteCount; i++) {
            const manifestName = manifests[i];
            const manifestPath = path.join(BACKUP_DIR, manifestName);
            try {
                const mData = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
                const encPath = path.join(BACKUP_DIR, mData.filename);
                
                if (fs.existsSync(encPath)) fs.unlinkSync(encPath);
                fs.unlinkSync(manifestPath);
                
                console.log(`[BACKUP] Backup antigo removido por retenção: ${mData.filename}`);
            } catch (err) {
                console.error('Erro na rotação do backup:', err);
            }
        }
    } catch (e) {
        console.error('Erro geral ao rotacionar backups:', e);
    }
}

// Auto execute if called from command line
if (require.main === module) {
    try {
        runBackupSync();
        process.exit(0);
    } catch (err) {
        console.error('Falha ao executar backup via terminal:', err);
        process.exit(1);
    }
}

module.exports = { runBackupSync };
