const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load environment variables if running as standalone terminal script
if (require.main === module) {
    require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
}

const isCloud = process.env.VERCEL === '1' || !!process.env.DATABASE_URL || process.env.NODE_ENV === 'production';
const DB_DIR = isCloud ? '/tmp/db' : path.join(__dirname, '..', 'db');
const BACKUP_DIR = isCloud ? '/tmp/BackUp' : path.join(__dirname, '..', 'BackUp');
const ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef';

function restoreFileSync(filename) {
    const encFilePath = path.join(BACKUP_DIR, filename);
    const manifestPath = path.join(BACKUP_DIR, filename.replace('.enc', '.manifest.json'));

    if (!fs.existsSync(encFilePath)) {
        throw new Error(`Arquivo de backup criptografado ausente: ${filename}`);
    }

    // 1. Validate Checksum integrity first
    if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        const fileContent = fs.readFileSync(encFilePath, 'utf-8');
        const calculatedSha = crypto.createHash('sha256')
            .update(fileContent)
            .digest('hex');

        if (calculatedSha !== manifest.sha256) {
            throw new Error(`Checksum do backup inválido! O arquivo pode estar corrompido ou adulterado.`);
        }
    } else {
        console.warn(`[RESTORE] Alerta: Nenhum manifesto encontrado para ${filename}. Procedendo com a restauração por conta própria.`);
    }

    // 2. Decrypt files
    const encryptedData = fs.readFileSync(encFilePath, 'utf-8');
    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
        throw new Error('Formato de arquivo criptografado inválido.');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];

    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');

    // 3. Unpack and write files back to the db folder
    const dataPackage = JSON.parse(decrypted);
    
    Object.entries(dataPackage).forEach(([filename, content]) => {
        const targetPath = path.join(DB_DIR, filename);
        
        // Backup the current file to a temporary file before overwriting just in case
        if (fs.existsSync(targetPath)) {
            fs.copyFileSync(targetPath, targetPath + '.tmp');
        }

        try {
            fs.writeFileSync(targetPath, JSON.stringify(content, null, 2), 'utf-8');
            // Clean temp file
            if (fs.existsSync(targetPath + '.tmp')) {
                fs.unlinkSync(targetPath + '.tmp');
            }
        } catch (e) {
            // Restore from temp backup if write fails
            if (fs.existsSync(targetPath + '.tmp')) {
                fs.copyFileSync(targetPath + '.tmp', targetPath);
                fs.unlinkSync(targetPath + '.tmp');
            }
            throw new Error(`Falha ao restaurar arquivo ${filename}: ${e.message}`);
        }
    });

    console.log(`[RESTORE] Restauração concluída com sucesso do backup: ${filename}`);
}

// Command line executor
if (require.main === module) {
    const args = process.argv.slice(2);
    const filename = args[0];

    if (!filename) {
        console.error('Por favor, informe o nome do arquivo de backup a ser restaurado.');
        console.error('Exemplo: node scripts/restore-local.js backup-2026-06-21-12-00.enc');
        process.exit(1);
    }

    try {
        restoreFileSync(filename);
        process.exit(0);
    } catch (err) {
        console.error('Erro na restauração via terminal:', err.message);
        process.exit(1);
    }
}

module.exports = { restoreFileSync };
