const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BACKUP_DIR = path.join(__dirname, '..', 'backups', 'local');

function verifyAllSync() {
    if (!fs.existsSync(BACKUP_DIR)) {
        console.log('[VERIFY] Pasta de backups não existe.');
        return [];
    }

    const files = fs.readdirSync(BACKUP_DIR);
    const manifests = files.filter(f => f.endsWith('.manifest.json'));
    const results = [];

    console.log(`[VERIFY] Iniciando verificação de integridade para ${manifests.length} backups...`);

    manifests.forEach(manifestName => {
        const manifestPath = path.join(BACKUP_DIR, manifestName);
        try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            const encFilePath = path.join(BACKUP_DIR, manifest.filename);

            if (!fs.existsSync(encFilePath)) {
                console.log(`[ALERTA] Arquivo criptografado ausente para o manifesto: ${manifestName}`);
                manifest.verified = false;
                fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
                results.push({ filename: manifest.filename, status: 'ARQUIVO_AUSENTE', verified: false });
                return;
            }

            // Recalculate SHA-256
            const fileContent = fs.readFileSync(encFilePath, 'utf-8');
            const currentSha256 = crypto.createHash('sha256')
                .update(fileContent)
                .digest('hex');

            const isMatch = (currentSha256 === manifest.sha256);
            
            // Update manifest verification status
            manifest.verified = isMatch;
            fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

            console.log(`- ${manifest.filename}: ${isMatch ? '✔ ÍNTEGRO' : '✘ INTEGRIDADE COMPROMETIDA'}`);
            results.push({ 
                filename: manifest.filename, 
                status: isMatch ? 'INTEGRO' : 'ERRO_CHECKSUM', 
                verified: isMatch 
            });

        } catch (err) {
            console.error(`Erro ao verificar backup para o manifesto ${manifestName}:`, err.message);
            results.push({ filename: manifestName, status: `ERRO: ${err.message}`, verified: false });
        }
    });

    return results;
}

// Auto execute if called from command line
if (require.main === module) {
    try {
        const res = verifyAllSync();
        const failures = res.filter(r => !r.verified);
        if (failures.length > 0) {
            console.error(`[FALHA] A verificação de integridade encontrou problemas em ${failures.length} arquivo(s).`);
            process.exit(1);
        } else {
            console.log('[SUCESSO] Todos os backups foram validados com sucesso.');
            process.exit(0);
        }
    } catch (err) {
        console.error('Falha ao executar verificação via terminal:', err);
        process.exit(1);
    }
}

module.exports = { verifyAllSync };
