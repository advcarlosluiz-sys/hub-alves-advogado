/**
 * ScanContracts - Main Application Logic
 * v3.0 - Cloud Edition com Supabase
 */

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Supabase Client Initialization
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SUPABASE_URL  = 'https://zfrozaesonivlmtkvtpq.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpmcm96YWVzb25pdmxtdGt2dHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2OTE4NDksImV4cCI6MjA5NDI2Nzg0OX0.DLjT1z4O-NLBYL5WgNuR_8NguZ4nA9gSzXOEvdz3yuc';
// Usando sbClient para nÃ£o conflitar com o global window.supabase do CDN
const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Estado global do usuÃ¡rio autenticado
let currentUser = null;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Auth Helpers (chamados pelo HTML inline)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function showAuthTab(tab) {
    const nameField = document.getElementById('auth-name-field');
    const submitBtn = document.getElementById('btn-auth-submit');
    const loginTab  = document.getElementById('tab-login');
    const signupTab = document.getElementById('tab-signup');
    if (tab === 'signup') {
        nameField.style.display = 'block';
        submitBtn.textContent = 'Criar Conta';
        loginTab.style.background  = 'transparent';
        loginTab.style.color       = 'var(--text-muted)';
        signupTab.style.background = 'rgba(0,229,255,0.15)';
        signupTab.style.color      = '#00e5ff';
    } else {
        nameField.style.display = 'none';
        submitBtn.textContent = 'Entrar';
        signupTab.style.background = 'transparent';
        signupTab.style.color      = 'var(--text-muted)';
        loginTab.style.background  = 'rgba(0,229,255,0.15)';
        loginTab.style.color       = '#00e5ff';
    }
}

document.addEventListener('DOMContentLoaded', () => {

    // ──────────────────────────────────────────────
    // Cache de Histórico & Sincronização Supabase
    // ──────────────────────────────────────────────
    let cachedHistory = [];

    async function loadCloudHistory() {
        if (currentUser) {
            try {
                const { data, error } = await sbClient
                    .from('scancontracts_historico')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                if (data) {
                    cachedHistory = data.map(row => ({
                        id: row.id,
                        fileName: row.file_name,
                        date: row.date,
                        risk: row.risk,
                        score: row.score,
                        analysis: row.analysis
                    }));
                    localStorage.setItem('SCANCONTRACTS_HISTORY', JSON.stringify(cachedHistory));
                    return;
                }
            } catch (err) {
                console.error('Erro ao buscar histórico do Supabase:', err);
                showToast('Usando cache local do histórico.', 'warning');
            }
        }
        cachedHistory = JSON.parse(localStorage.getItem('SCANCONTRACTS_HISTORY') || '[]');
    }

    // ──────────────────────────────────────────────
    // PDF.js Worker Setup
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            window.PDF_WORKER_SRC ||
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // DOM References
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const splashScreen    = document.getElementById('splash-screen');
    const appContainer    = document.getElementById('app-container');
    const loaderProgress  = document.querySelector('.loader-progress');
    const navLinks        = document.querySelectorAll('.nav-links li');
    const pageViews       = document.querySelectorAll('.page-view');
    const dropZone        = document.getElementById('drop-zone');
    const fileInput       = document.getElementById('file-input');
    const uploadProgress  = document.getElementById('upload-progress');
    const progressList    = document.getElementById('progress-list');
    const apiKeyInput     = document.getElementById('openai-api-key');
    const btnSaveSettings = document.getElementById('btn-save-settings');
    const toastEl         = document.getElementById('toast');
    const toastIcon       = document.getElementById('toast-icon');
    const toastMessage    = document.getElementById('toast-message');

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Toast Notification
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let toastTimer;
    function showToast(message, type = 'success') {
        const icons = { success: 'âœ…', error: 'âŒ', warning: 'âš ï¸' };
        toastIcon.textContent = icons[type] || 'âœ…';
        toastMessage.textContent = message;
        toastEl.className = `toast ${type}`;
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3500);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Splash Screen + VerificaÃ§Ã£o de SessÃ£o
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 40 + 20;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            // Ao terminar o splash, entra diretamente na aplicação ignorando a autenticação
            setTimeout(async () => {
                const mockUser = {
                    id: 'mock-user-id',
                    email: 'carlos@alvesadvocacia.com.br',
                    user_metadata: { nome: 'Carlos Alves' }
                };
                currentUser = mockUser;
                await loadCloudHistory();
                
                // Tratamento seguro para evitar quebras se o elemento não existir
                const authScreen = document.getElementById('auth-screen');
                if (authScreen) authScreen.classList.remove('active');
                
                splashScreen.classList.add('hidden');
                revealApp(mockUser);
            }, 300);
        }
        loaderProgress.style.width = `${progress}%`;
    }, 100);

    function revealApp(user) {
        // Atualiza dados do usuÃ¡rio na sidebar
        const email = user.email || '';
        const name  = user.user_metadata?.nome || email.split('@')[0];
        const initials = name.substring(0, 2).toUpperCase();
        const avatarEl = document.getElementById('sidebar-avatar');
        const nameEl   = document.getElementById('sidebar-user-name');
        const emailEl  = document.getElementById('sidebar-user-email');
        if (avatarEl) avatarEl.textContent = initials;
        if (nameEl)   nameEl.textContent   = name;
        if (emailEl)  emailEl.textContent  = email;

        splashScreen.classList.add('hidden');
        appContainer.classList.remove('hidden');
        appContainer.classList.add('active');
        renderHistory();
        updateDashboardStats();
        animateRiskBars();
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Navigation
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function navigateTo(pageId) {
        navLinks.forEach(l => l.classList.remove('active'));
        const targetNav = document.querySelector(`[data-page="${pageId}"]`);
        if (targetNav) targetNav.classList.add('active');

        pageViews.forEach(page => {
            page.classList.remove('active');
            if (page.id === `page-${pageId}`) page.classList.add('active');
        });

        if (pageId === 'analysis') {
            dropZone.classList.remove('hidden');
            uploadProgress.classList.add('hidden');
            progressList.innerHTML = '';
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => navigateTo(link.getAttribute('data-page')));
    });

    // Header button â†’ Nova AnÃ¡lise
    const btnNewAnalysis = document.getElementById('btn-new-analysis');
    if (btnNewAnalysis) {
        btnNewAnalysis.addEventListener('click', () => navigateTo('analysis'));
    }

    // Results â†’ back to analysis
    const btnBackToAnalysis = document.getElementById('btn-back-to-analysis');
    if (btnBackToAnalysis) {
        btnBackToAnalysis.addEventListener('click', () => {
            dropZone.classList.remove('hidden');
            uploadProgress.classList.add('hidden');
            progressList.innerHTML = '';
            navigateTo('analysis');
        });
    }

    // "Ver tudo" â†’ history
    const linkViewAll = document.getElementById('link-view-all-history');
    if (linkViewAll) {
        linkViewAll.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('history');
        });
    }

    // Botão Limpar Histórico
    const btnClearHistory = document.getElementById('btn-clear-history');
    if (btnClearHistory) {
        btnClearHistory.addEventListener('click', async () => {
            if(confirm('Tem certeza que deseja limpar todo o histórico?')) {
                if (currentUser) {
                    const { error } = await sbClient
                        .from('scancontracts_historico')
                        .delete()
                        .eq('user_id', currentUser.id);
                    if (error) {
                        console.error('Erro ao limpar histórico na nuvem:', error);
                        showToast('Erro ao limpar histórico na nuvem, mas cache local limpo.', 'warning');
                    }
                }
                cachedHistory = [];
                localStorage.removeItem('SCANCONTRACTS_HISTORY');
                renderHistory();
                updateDashboardStats();
                showToast('Histórico limpo com sucesso.', 'success');
            }
        });
    }
    // Botão Exportar CSV
    const btnExportCSV = document.getElementById('btn-export-csv');
    if (btnExportCSV) {
        btnExportCSV.addEventListener('click', () => {
            const history = cachedHistory;
            if (history.length === 0) {
                showToast('Nenhuma anÃ¡lise no histÃ³rico para exportar.', 'warning');
                return;
            }

            // Headers alinhados com o formato solicitado
            const headers = [
                'Arquivo', 'Cliente', 'CNPJ Cliente', 'Tipo de Documento', 
                'Data de Assinatura', 'Data de Inicio', 'Data de Fim', 'Prazo (Meses)', 
                'Valor Mensal', 'Valor Total', 'Indice de Reajuste', 'Risco Geral', 
                'Pontuacao', 'Risco Tributario', 'Clausula Reforma Tributaria', 
                'Clausula Reequilibrio', 'Red Flags', 'Prioridade'
            ];

            const rows = history.map(item => {
                const data = item.analysis || {};
                const d = data.dados_contrato || {};
                const p = data.partes || {};
                const c = data.clausulas_detectadas || {};
                const risks = data.riscos || {};

                return [
                    item.fileName,
                    p.contratante || 'NÃ£o identificado',
                    p.cnpj_cpf_contratante || 'NÃ£o identificado',
                    data.tipo_documento || 'NÃ£o identificado',
                    d.data_assinatura || 'NÃ£o identificado',
                    d.data_inicio || 'NÃ£o identificado',
                    d.data_fim || 'NÃ£o identificado',
                    d.prazo_meses || 'NÃ£o identificado',
                    d.valor_mensal || 'NÃ£o identificado',
                    d.valor_total || 'NÃ£o identificado',
                    d.indice_reajuste || 'NÃ£o identificado',
                    item.risk,
                    item.score,
                    risks.risco_tributario || 'NÃ£o identificado',
                    c.reforma_tributaria ? 'Presente' : 'Ausente',
                    c.reequilibrio_economico ? 'Presente' : 'Ausente',
                    (data.red_flags || []).join('; '),
                    data.prioridade || 'NÃ£o identificado'
                ];
            });

            // Converte para formato CSV usando ponto-e-vÃ­rgula e UTF-8 com BOM para abrir direto no Excel sem quebrar acentos
            let csvContent = '\ufeff' + headers.join(';') + '\n';
            csvContent += rows.map(r => r.map(val => {
                let clean = String(val).replace(/"/g, '""');
                if (clean.includes(';') || clean.includes('\n') || clean.includes(',')) {
                    clean = `"${clean}"`;
                }
                return clean;
            }).join(';')).join('\n');

            downloadFile('Planilha_Consolidada_ScanContracts.csv', csvContent, 'text/csv;charset=utf-8;');
            showToast('Planilha consolidada CSV baixada com sucesso!', 'success');
        });
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Settings Persistence
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (apiKeyInput) {
        const savedKey = localStorage.getItem('OPENAI_API_KEY');
        if (savedKey) apiKeyInput.value = savedKey;
    }

    if (btnSaveSettings) {
        btnSaveSettings.addEventListener('click', () => {
            const key = apiKeyInput.value.trim();
            if (!key) {
                showToast('Insira uma API Key vÃ¡lida.', 'warning');
                return;
            }
            localStorage.setItem('OPENAI_API_KEY', key);
            showToast('ConfiguraÃ§Ãµes salvas com sucesso!', 'success');
        });
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Upload & Drag-and-Drop
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (dropZone) {
        // Click on the zone (but not on the button â€” handled by inline onclick)
        dropZone.addEventListener('click', (e) => {
            if (e.target.id !== 'btn-select-files') {
                fileInput.click();
            }
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            handleFiles(e.dataTransfer.files);
        });

        fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // System Prompt
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let systemPrompt = '';
    fetch('prompt_scancontracts.md')
        .then(r => r.text())
        .then(t => { systemPrompt = t; console.log('[ScanContracts] System prompt loaded âœ”'); })
        .catch(err => console.warn('[ScanContracts] Could not load system prompt:', err));

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // File Processing Pipeline
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    async function handleFiles(files) {
        if (!files || files.length === 0) return;

        const apiKey = localStorage.getItem('OPENAI_API_KEY');
        if (!apiKey) {
            showToast('Configure sua OpenAI API Key nas ConfiguraÃ§Ãµes antes de continuar.', 'warning');
            navigateTo('settings');
            return;
        }

        dropZone.classList.add('hidden');
        uploadProgress.classList.remove('hidden');
        progressList.innerHTML = '';

        for (const file of Array.from(files)) {
            await processFile(file, apiKey);
        }
    }

    async function processFile(file, apiKey) {
        const item       = createProgressItem(file);
        const statusText = item.querySelector('.status');
        const fill       = item.querySelector('.loader-fill');

        try {
            updateProgress(fill, statusText, 'Lendo arquivo...', 20);
            const text = await extractTextFromFile(file);

            if (!text || text.trim().length < 50) {
                throw new Error('ConteÃºdo do arquivo insuficiente para anÃ¡lise.');
            }

            updateProgress(fill, statusText, 'Enviando para IA...', 55);
            let analysis;

            try {
                analysis = await callOpenAI(text, file.name, apiKey);
            } catch (apiErr) {
                // Auto-retry with countdown if rate limited
                if (apiErr.retrySec) {
                    let remaining = apiErr.retrySec;
                    await new Promise(resolve => {
                        const tick = setInterval(() => {
                            statusText.textContent = `â³ Rate limit â€” aguardando ${remaining}s...`;
                            remaining--;
                            if (remaining < 0) {
                                clearInterval(tick);
                                resolve();
                            }
                        }, 1000);
                    });
                    updateProgress(fill, statusText, 'Reenviando para IA...', 55);
                    analysis = await callOpenAI(text, file.name, apiKey);
                } else {
                    throw apiErr;
                }
            }

            updateProgress(fill, statusText, 'AnÃ¡lise concluÃ­da âœ”', 100);
            statusText.classList.add('positive');

            setTimeout(() => showResults(file.name, analysis), 900);

        } catch (error) {
            console.error('[ScanContracts] Error processing file:', error);
            statusText.textContent = `Erro: ${error.message}`;
            statusText.classList.add('negative');
            showToast(`Falha ao analisar ${file.name}: ${error.message}`, 'error');
        }
    }

    function createProgressItem(file) {
        const item = document.createElement('div');
        item.className = 'progress-item glass';
        item.innerHTML = `
            <div class="item-info">
                <span class="file-name">${file.name}</span>
                <span class="status">Iniciando...</span>
            </div>
            <div class="mini-loader">
                <div class="loader-fill" style="width: 0%"></div>
            </div>
        `;
        progressList.appendChild(item);
        return item;
    }

    function updateProgress(fill, statusEl, text, pct) {
        fill.style.width = `${pct}%`;
        statusEl.textContent = text;
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Text Extraction
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    async function extractTextFromFile(file) {
        if (file.type === 'application/pdf') {
            if (typeof pdfjsLib === 'undefined') throw new Error('PDF.js nÃ£o carregado.');
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page    = await pdf.getPage(i);
                const content = await page.getTextContent();
                fullText += content.items.map(item => item.str).join(' ') + '\n';
            }
            return fullText;
        }

        // Text-based files (txt, docx raw text, csv)
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload  = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Falha ao ler o arquivo.'));
            reader.readAsText(file, 'UTF-8');
        });
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // OpenAI API Call
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const OPENAI_MODELS = [
        'gpt-4o-mini',  // principal â€” rÃ¡pido e econÃ´mico
        'gpt-4o'        // fallback premium
    ];

    async function callOpenAI(contractText, fileName, apiKey) {
        const userContent = `${systemPrompt}

---
DOCUMENTO PARA ANÃLISE:
Nome do arquivo: ${fileName}
ConteÃºdo completo:
${contractText.slice(0, 30000)}`;

        let lastError = null;

        for (const model of OPENAI_MODELS) {
            try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model,
                        messages: [
                            { role: 'user', content: userContent }
                        ],
                        temperature: 0.2,
                        max_tokens: 4096,
                        response_format: { type: 'json_object' }
                    })
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    const errMsg  = errData.error?.message || `HTTP ${response.status}`;
                    const status  = response.status;

                    console.error(`[ScanContracts] OpenAI error (${model}) [${status}]:`, errMsg);

                    // API Key invÃ¡lida â€” para imediatamente
                    if (status === 401) {
                        throw new Error(`API Key OpenAI invÃ¡lida. Verifique em platform.openai.com/api-keys e atualize em ConfiguraÃ§Ãµes.`);
                    }

                    // Rate limit â€” tenta prÃ³ximo modelo
                    if (status === 429) {
                        const retryMatch = errMsg.match(/retry after (\d+)/i);
                        const retrySec = retryMatch ? parseInt(retryMatch[1]) : 60;
                        console.warn(`[ScanContracts] Rate limit no modelo ${model} (aguarde ${retrySec}s), tentando prÃ³ximo...`);
                        const rateErr = new Error(`Taxa de requisiÃ§Ãµes excedida. Aguardando ${retrySec}s para retry automÃ¡tico...`);
                        rateErr.retrySec = retrySec;
                        lastError = rateErr;
                        continue;
                    }

                    // Modelo indisponÃ­vel â€” tenta prÃ³ximo
                    if (status === 404 || status === 400) {
                        console.warn(`[ScanContracts] Modelo ${model} indisponÃ­vel (${status}), tentando prÃ³ximo...`);
                        lastError = new Error(errMsg);
                        continue;
                    }

                    throw new Error(errMsg);
                }

                const data    = await response.json();
                const rawText = data.choices?.[0]?.message?.content;

                if (!rawText) throw new Error('Resposta vazia da API OpenAI.');

                // JSON robusto â€” lida com markdown fences se presentes
                const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/) ||
                                  rawText.match(/```\s*([\s\S]*?)```/);
                const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawText.trim();

                try {
                    return JSON.parse(jsonStr);
                } catch {
                    console.warn('[ScanContracts] JSON parse failed, returning raw text structure.');
                    return { resumo_executivo: rawText, riscos: { pontuacao: 50, risco_geral: 'Indefinido' } };
                }

            } catch (err) {
                if (err.retrySec || !lastError) lastError = err;
                if (!err.retrySec) throw err; // erros nÃ£o-rateLimit param imediatamente
            }
        }

        throw lastError || new Error('Todos os modelos OpenAI falharam. Verifique sua API Key.');
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Results Page & Actions
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let currentAnalysisData = null;
    let currentFileName = "";

    function showResults(fileName, analysis) {
        currentFileName = fileName;
        currentAnalysisData = analysis;
        pageViews.forEach(p => p.classList.remove('active'));
        document.getElementById('page-results').classList.add('active');
        navLinks.forEach(l => l.classList.remove('active'));

        document.getElementById('result-file-name').textContent = `AnÃ¡lise: ${fileName}`;
        renderAnalysisResults(analysis);
        saveToHistory(fileName, analysis);
    }

    function renderAnalysisResults(data) {
        // Summary
        document.getElementById('result-summary').textContent =
            data.resumo_executivo || 'Resumo nÃ£o disponÃ­vel.';

        // Score with animated SVG arc
        const score   = Number(data.riscos?.pontuacao ?? data.score ?? 50);
        const scoreEl = document.getElementById('result-score');
        const arc     = document.getElementById('score-arc');
        const badge   = document.getElementById('result-risk-badge');

        scoreEl.textContent = score;
        badge.textContent   = data.riscos?.risco_geral || 'Risco Indefinido';

        // Animate arc: circumference = 2Ï€r = 2 * Ï€ * 65 â‰ˆ 408.4
        const circumference = 408;
        const offset = circumference - (score / 100) * circumference;
        setTimeout(() => { arc.style.strokeDashoffset = offset; }, 100);

        // Color the badge and arc
        if (score >= 70) {
            badge.style.background = 'var(--success)';
            arc.style.stroke = 'var(--success)';
        } else if (score >= 40) {
            badge.style.background = 'var(--warning)';
            arc.style.stroke = 'var(--warning)';
        } else {
            badge.style.background = 'var(--error)';
            arc.style.stroke = 'var(--error)';
        }

        // Data Grid
        const dataGrid = document.getElementById('result-data-grid');
        const fields = [
            { label: 'Contratante',  value: data.partes?.contratante },
            { label: 'Contratada',   value: data.partes?.contratada },
            { label: 'Objeto',       value: data.dados_contrato?.objeto },
            { label: 'Valor Mensal', value: data.dados_contrato?.valor_mensal },
            { label: 'Prazo',        value: data.dados_contrato?.prazo_meses ? `${data.dados_contrato.prazo_meses} meses` : null },
            { label: 'Vencimento',   value: data.dados_contrato?.data_fim }
        ];
        dataGrid.innerHTML = fields
            .map(f => `
                <div class="data-item">
                    <span class="data-label">${f.label}</span>
                    <span class="data-value">${f.value || 'NÃ£o identificado'}</span>
                </div>`)
            .join('');

        // Recommendations
        const recList = document.getElementById('result-recommendations');
        const recs    = data.recomendacoes || [];
        recList.innerHTML = recs.length > 0
            ? recs.map(r => `<li>${r}</li>`).join('')
            : '<li>Nenhuma recomendaÃ§Ã£o especÃ­fica identificada.</li>';

        // Red Flags
        const redFlagsEl = document.getElementById('result-red-flags');
        const flags      = data.red_flags || [];
        redFlagsEl.innerHTML = flags.length > 0
            ? flags.map(f => `<div class="flag-item">âš ï¸ ${f}</div>`).join('')
            : '<div class="flag-item" style="background:rgba(0,230,118,0.1);color:var(--success);border-color:var(--success);">âœ… Nenhum red flag crÃ­tico identificado.</div>';

        // Checklist por Departamento (JurÃ­dico, ContÃ¡bil, Financeiro, Comercial)
        let currentDept = 'advogado';
        const checklistItems = document.getElementById('checklist-items');
        const tabsContainer  = document.getElementById('checklist-tabs');
        
        function renderChecklist(dept) {
            if (!checklistItems) return;
            const validations = data.validacoes_necessarias || {};
            const items = validations[dept] || [];
            
            if (items.length === 0) {
                checklistItems.innerHTML = `
                    <div class="checklist-item" style="border-left: 3px solid var(--success);">
                        <span>âœ… Nenhuma validaÃ§Ã£o identificada para este departamento neste contrato.</span>
                    </div>`;
                return;
            }
            
            checklistItems.innerHTML = items.map((it, idx) => `
                <div class="checklist-item">
                    <input type="checkbox" id="chk-${dept}-${idx}">
                    <label for="chk-${dept}-${idx}" style="display:flex; cursor:pointer; align-items: flex-start; gap: 0.5rem; width: 100%;">
                        <span>${it}</span>
                    </label>
                </div>
            `).join('');
        }

        // Configurar botÃµes de abas do checklist
        if (tabsContainer) {
            tabsContainer.querySelectorAll('.tab-btn').forEach(btn => {
                // Clonar nÃ³ para remover event listeners antigos se o render for chamado mÃºltiplas vezes
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                
                newBtn.addEventListener('click', () => {
                    tabsContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                    newBtn.classList.add('active');
                    currentDept = newBtn.getAttribute('data-dept');
                    renderChecklist(currentDept);
                });
            });
        }
        
        // Renderizar inicial (JurÃ­dico)
        if (tabsContainer) {
            tabsContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            const initialTab = tabsContainer.querySelector('[data-dept="advogado"]');
            if (initialTab) initialTab.classList.add('active');
        }
        renderChecklist('advogado');
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Export Actions & Minuta Generator Modal
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const docModal           = document.getElementById('doc-modal');
    const modalTitle         = document.getElementById('modal-title');
    const docEditorText      = document.getElementById('doc-editor-text');
    const btnCloseModal      = document.getElementById('btn-close-modal');
    const btnCancelModal     = document.getElementById('btn-cancel-modal');
    const btnDownloadDocx    = document.getElementById('btn-download-docx');
    const btnAiImprove       = document.getElementById('btn-ai-improve');
    const aiLoadingIndicator = document.getElementById('ai-loading-indicator');

    const CLAUSE_TEMPLATES = {
        reforma_tributaria: `\n\nCLÃUSULA DE ADAPTAÃ‡ÃƒO Ã€ REFORMA TRIBUTÃRIA\nAs partes reconhecem que a legislaÃ§Ã£o tributÃ¡ria brasileira encontra-se em perÃ­odo de transiÃ§Ã£o em razÃ£o da Reforma TributÃ¡ria (Emenda Constitucional nÂº 132/2023), incluindo a criaÃ§Ã£o, substituiÃ§Ã£o, extinÃ§Ã£o ou alteraÃ§Ã£o de tributos, tais como CBS, IBS, Imposto Seletivo ou outros que venham a ser instituÃ­dos ou modificados. Caso tais alteraÃ§Ãµes impliquem aumento ou reduÃ§Ã£o relevante da carga tributÃ¡ria sob o contrato, as partes realizarÃ£o revisÃ£o das condiÃ§Ãµes de preÃ§o para restabelecer o equilÃ­brio econÃ´mico-financeiro.`,
        
        reequilibrio: `\n\nCLÃUSULA DE REEQUILÃBRIO ECONÃ”MICO-FINANCEIRO\nO preÃ§o pactuado neste contrato foi definido considerando os custos operacionais, fiscais e econÃ´micos da data de sua assinatura. Na hipÃ³tese de alteraÃ§Ã£o extraordinÃ¡ria ou imprevisÃ­vel dessas premissas que resulte em comprovado desequilÃ­brio para qualquer das partes, os termos financeiros poderÃ£o ser revistos mediante acordo formal escrito.`,
        
        repasse_fornecedores: `\n\nCLÃUSULA DE REPASSE DE CUSTOS DE FORNECEDORES\nEventuais aumentos comprovados nos insumos crÃ­ticos e serviÃ§os necessÃ¡rios para o cumprimento do objeto deste contrato (incluindo, mas nÃ£o se limitando a fretes, seguros e peÃ§as de reposiÃ§Ã£o) poderÃ£o ser repassados proporcionalmente Ã  contratante, mediante aviso prÃ©vio de 30 (trinta) dias e apresentaÃ§Ã£o de planilha justificativa.`,
        
        segregacao_servicos: `\n\nCLÃUSULA DE SEGREGAÃ‡ÃƒO DE SERVIÃ‡OS ACESSÃ“RIOS\nPara fins fiscais e faturamento, as partes acordam que o valor total pactuado engloba de forma segregada os componentes de locaÃ§Ã£o de bens e os serviÃ§os de assistÃªncia tÃ©cnica, frete ou seguro, devendo constar de forma discriminada nas respectivas notas fiscais ou faturas emitidas.`,
        
        creditos_tributarios: `\n\nCLÃUSULA SOBRE CRÃ‰DITOS TRIBUTÃRIOS\nA contratante declara-se ciente de que a apropriaÃ§Ã£o e aproveitamento de crÃ©ditos fiscais (IBS/CBS) dependem unicamente da legislaÃ§Ã£o aplicÃ¡vel ao seu prÃ³prio regime tributÃ¡rio, nÃ£o garantindo a contratada qualquer direito subjetivo a crÃ©dito ou abatimento em decorrÃªncia do faturamento desta operaÃ§Ã£o.`
    };

    function openDocModal(titleText, initialContent) {
        if (!docModal) return;
        modalTitle.textContent = titleText;
        docEditorText.value = initialContent;
        docModal.classList.remove('hidden');
    }

    function closeDocModal() {
        if (!docModal) return;
        docModal.classList.add('hidden');
        if (aiLoadingIndicator) aiLoadingIndicator.classList.add('hidden');
    }

    if (btnCloseModal) btnCloseModal.addEventListener('click', closeDocModal);
    if (btnCancelModal) btnCancelModal.addEventListener('click', closeDocModal);

    // InserÃ§Ã£o rÃ¡pida de clÃ¡usulas
    document.querySelectorAll('.clause-buttons button').forEach(btn => {
        btn.addEventListener('click', () => {
            const clauseKey = btn.getAttribute('data-clause');
            const template = CLAUSE_TEMPLATES[clauseKey];
            if (template && docEditorText) {
                // Inserir ao final
                docEditorText.value = docEditorText.value.trim() + template;
                docEditorText.scrollTop = docEditorText.scrollHeight;
                showToast('ClÃ¡usula anexada ao final do documento!', 'success');
            }
        });
    });

    // AÃ§Ãµes de BotÃµes no painel
    const btnExportReport = document.getElementById('btn-export-report');
    if (btnExportReport) {
        btnExportReport.addEventListener('click', () => {
            if (!currentAnalysisData) return;
            
            const data = currentAnalysisData;
            
            // Cria um container temporÃ¡rio para o layout limpo (PadrÃ£o PDF corporativo)
            const pdfContainer = document.createElement('div');
            pdfContainer.style.padding = '40px';
            pdfContainer.style.fontFamily = 'Arial, sans-serif';
            pdfContainer.style.color = '#000000';
            pdfContainer.style.backgroundColor = '#ffffff';
            pdfContainer.style.width = '800px';
            
            // Helper function for safe data extraction
            const safe = (val) => val || 'NÃ£o identificado';
            
            const riskColor = data.riscos?.risco_geral === 'Alto' ? '#d32f2f' : (data.riscos?.risco_geral === 'MÃ©dio' ? '#f57c00' : '#388e3c');

            pdfContainer.innerHTML = `
                <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px;">
                    <h1 style="margin: 0; color: #111; font-size: 24px; text-transform: uppercase;">RelatÃ³rio de Auditoria Contratual</h1>
                    <p style="margin: 8px 0 0; color: #333; font-size: 16px;">Documento Analisado: <strong>${currentFileName}</strong></p>
                    <p style="margin: 4px 0 0; color: #555; font-size: 14px;">Data da AnÃ¡lise: ${new Date().toLocaleDateString('pt-BR')}</p>
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 30px; text-align: center;">
                    <div style="flex: 1; padding: 20px; border: 1px solid #ddd; border-radius: 8px; margin-right: 15px; background-color: #fafafa;">
                        <h3 style="margin-top: 0; color: #555; font-size: 14px; text-transform: uppercase;">PontuaÃ§Ã£o de SaÃºde</h3>
                        <div style="font-size: 38px; font-weight: bold; color: ${riskColor};">${data.riscos?.pontuacao ?? data.score ?? 50}<span style="font-size:16px; color:#888;">/100</span></div>
                    </div>
                    <div style="flex: 1; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #fafafa;">
                        <h3 style="margin-top: 0; color: #555; font-size: 14px; text-transform: uppercase;">Risco Geral Identificado</h3>
                        <div style="font-size: 32px; font-weight: bold; color: ${riskColor}; margin-top: 4px;">${data.riscos?.risco_geral || 'Indefinido'}</div>
                    </div>
                </div>

                <h2 style="color: #222; border-bottom: 1px solid #ddd; padding-bottom: 8px; font-size: 18px;">1. Resumo Executivo</h2>
                <p style="line-height: 1.6; color: #333; text-align: justify; font-size: 14px;">${safe(data.resumo_executivo)}</p>

                <h2 style="color: #222; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-top: 35px; font-size: 18px;">2. Dados Essenciais ExtraÃ­dos</h2>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
                    <tr>
                        <td style="padding: 12px; border: 1px solid #eee; font-weight: bold; width: 30%; background: #f9f9f9; color: #444;">Contratante</td>
                        <td style="padding: 12px; border: 1px solid #eee; color: #111;">${safe(data.partes?.contratante)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #eee; font-weight: bold; background: #f9f9f9; color: #444;">Contratada</td>
                        <td style="padding: 12px; border: 1px solid #eee; color: #111;">${safe(data.partes?.contratada)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #eee; font-weight: bold; background: #f9f9f9; color: #444;">Objeto Principal</td>
                        <td style="padding: 12px; border: 1px solid #eee; color: #111;">${safe(data.dados_contrato?.objeto)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #eee; font-weight: bold; background: #f9f9f9; color: #444;">Valor Mensal</td>
                        <td style="padding: 12px; border: 1px solid #eee; color: #111;">${safe(data.dados_contrato?.valor_mensal)}</td>
                    </tr>
                </table>

                <h2 style="color: #d32f2f; border-bottom: 1px solid #ffcdd2; padding-bottom: 8px; margin-top: 35px; font-size: 18px;">3. Red Flags e Alertas CrÃ­ticos</h2>
                <ul style="line-height: 1.6; color: #d32f2f; font-size: 14px; padding-left: 20px;">
                    ${(data.red_flags || []).length > 0 ? data.red_flags.map(f => `<li style="margin-bottom: 8px;">${f}</li>`).join('') : '<li style="color: #388e3c; list-style-type: none; margin-left: -20px;">âœ… Nenhum red flag crÃ­tico ou risco grave identificado na anÃ¡lise.</li>'}
                </ul>

                <h2 style="color: #1976d2; border-bottom: 1px solid #bbdefb; padding-bottom: 8px; margin-top: 35px; font-size: 18px;">4. RecomendaÃ§Ãµes PrÃ¡ticas e AÃ§Ãµes</h2>
                <ul style="line-height: 1.6; color: #333; font-size: 14px; padding-left: 20px;">
                    ${(data.recomendacoes || []).length > 0 ? data.recomendacoes.map(r => `<li style="margin-bottom: 8px;">${r}</li>`).join('') : '<li style="list-style-type: none; margin-left: -20px;">Nenhuma recomendaÃ§Ã£o especÃ­fica para este documento.</li>'}
                </ul>
                
                <div style="margin-top: 50px; font-size: 11px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 15px;">
                    RelatÃ³rio gerado automaticamente por ScanContracts AI.
                </div>
            `;
            
            const htmlString = `
                <div style="font-family: Arial, sans-serif; color: #000000; background-color: #ffffff; width: 700px; padding: 20px; margin: 0 auto; box-sizing: border-box;">
                    ${pdfContainer.innerHTML}
                </div>
            `;

            const opt = {
                margin:       10,
                filename:     `Relatorio_ScanContracts_${currentFileName.replace(/\.[^/.]+$/, "")}.pdf`,
                image:        { type: 'jpeg', quality: 1 },
                html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff' }, 
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            showToast('Gerando documento formal (PDF), aguarde...', 'warning');
            
            html2pdf().set(opt).from(htmlString).save().then(() => {
                showToast('RelatÃ³rio PDF exportado com sucesso!', 'success');
            }).catch(err => {
                showToast('Erro ao gerar PDF', 'error');
                console.error(err);
            });
        });
    }

    const btnGenAddendum = document.getElementById('btn-generate-addendum');
    if (btnGenAddendum) {
        btnGenAddendum.addEventListener('click', () => {
            if (!currentAnalysisData) return;
            const content = `MINUTA DE ADITIVO CONTRATUAL\n\nContrato Original: ${currentFileName}\nContratante: ${currentAnalysisData.partes?.contratante || 'NÃ£o identificado'}\nContratada: ${currentAnalysisData.partes?.contratada || 'NÃ£o identificado'}\n\nRECOMENDAÃ‡Ã•ES A SEREM INCLUÃDAS:\n${(currentAnalysisData.recomendacoes || []).map(r => '- ' + r).join('\n')}\n\nALERTAS TRATADOS (RED FLAGS):\n${(currentAnalysisData.red_flags || []).map(f => '- ' + f).join('\n')}\n\n------------------------------------------------\n[Minuta inicial gerada pelo ScanContracts. Clique em "Aprimorar com IA" para formatar juridicamente]`;
            openDocModal('Minuta de Aditivo Contratual', content);
        });
    }

    const btnGenRenegotiation = document.getElementById('btn-generate-renegotiation');
    if (btnGenRenegotiation) {
        btnGenRenegotiation.addEventListener('click', () => {
            if (!currentAnalysisData) return;
            const content = `CARTA DE RENEGOCIAÃ‡ÃƒO\n\nRef: Contrato ${currentFileName}\n\nPrezados,\n\nCom base em nossa revisÃ£o periÃ³dica do contrato vigente, identificamos os seguintes pontos que necessitam de alinhamento e possÃ­vel renegociaÃ§Ã£o:\n\n${(currentAnalysisData.red_flags || []).map(f => '- ' + f).join('\n')}\n\nSolicitamos uma reuniÃ£o para discutirmos os seguintes ajustes sugeridos para garantir a continuidade saudÃ¡vel da parceria:\n\n${(currentAnalysisData.recomendacoes || []).map(r => '- ' + r).join('\n')}\n\nAtenciosamente,\n[Sua Empresa]\n\n------------------------------------------------\n[Carta inicial gerada pelo ScanContracts. Clique em "Aprimorar com IA" para formatar juridicamente]`;
            openDocModal('Carta de RenegociaÃ§Ã£o Comercial', content);
        });
    }

    // Aprimoramento por InteligÃªncia Artificial
    if (btnAiImprove) {
        btnAiImprove.addEventListener('click', async () => {
            const apiKey = localStorage.getItem('OPENAI_API_KEY');
            if (!apiKey) {
                showToast('API Key da OpenAI necessÃ¡ria.', 'warning');
                return;
            }

            const currentText = docEditorText.value.trim();
            if (!currentText) {
                showToast('NÃ£o hÃ¡ conteÃºdo para aprimorar.', 'warning');
                return;
            }

            btnAiImprove.disabled = true;
            aiLoadingIndicator.classList.remove('hidden');

            const sysPrompt = "VocÃª Ã© um advogado especialista em direito contratual corporativo brasileiro. Sua tarefa Ã© reescrever o texto do contrato/aditivo/carta fornecido pelo usuÃ¡rio, aprimorando seu teor jurÃ­dico, removendo ambiguidades, garantindo clareza, objetividade e formatando-o perfeitamente em formato de minuta legal (com cabeÃ§alhos, seÃ§Ãµes estruturadas e vocabulÃ¡rio formal). Retorne APENAS o texto aprimorado do aditivo ou contrato, sem introduÃ§Ãµes, notas, cumprimentos ou explicaÃ§Ãµes externas. Caso o texto mencione 'Reforma TributÃ¡ria', garanta a robustez tÃ©cnica da redaÃ§Ã£o.";

            try {
                const improvedText = await callOpenAIText(sysPrompt, currentText, apiKey);
                if (improvedText) {
                    docEditorText.value = improvedText;
                    showToast('Documento aprimorado com IA com sucesso!', 'success');
                } else {
                    throw new Error('Nenhum resultado recebido.');
                }
            } catch (err) {
                console.error('[ScanContracts] Erro ao aprimorar com IA:', err);
                showToast(`Erro de IA: ${err.message}`, 'error');
            } finally {
                btnAiImprove.disabled = false;
                aiLoadingIndicator.classList.add('hidden');
            }
        });
    }

    // Download em DOCX (Word HTML compatible format)
    if (btnDownloadDocx) {
        btnDownloadDocx.addEventListener('click', () => {
            const text = docEditorText.value;
            if (!text.trim()) {
                showToast('O documento estÃ¡ vazio.', 'warning');
                return;
            }

            const htmlContent = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><title>Minuta Gerada</title>
            <style>
            body { font-family: 'Arial', sans-serif; line-height: 1.6; padding: 2cm; }
            h1, h2, h3 { font-family: 'Arial', sans-serif; font-weight: bold; color: #111; }
            h1 { font-size: 16pt; text-align: center; margin-bottom: 24pt; }
            h2 { font-size: 13pt; margin-top: 18pt; margin-bottom: 12pt; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
            p { font-size: 11pt; text-align: justify; margin-bottom: 12pt; text-indent: 1.5cm; }
            .meta { font-style: italic; color: #666; font-size: 9pt; text-align: center; margin-top: 40pt; }
            </style>
            </head>
            <body>
            ${text.split('\n').map(line => {
                const trimmed = line.trim();
                if (!trimmed) return '<br>';
                if (trimmed.startsWith('MINUTA') || trimmed.startsWith('CARTA') || trimmed.startsWith('ADITIVO CONTRATUAL')) {
                    return `<h1>${trimmed}</h1>`;
                }
                if (trimmed.startsWith('CLÃUSULA') || trimmed.startsWith('ALERTAS') || trimmed.startsWith('RECOMENDAÃ‡Ã•ES') || trimmed.startsWith('CLÃUSULA DE')) {
                    return `<h2>${trimmed}</h2>`;
                }
                return `<p>${trimmed}</p>`;
            }).join('')}
            </body>
            </html>
            `;

            const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // Usando extensÃ£o .docx solicitada pelo usuÃ¡rio
            a.download = `${modalTitle.textContent.replace(/\s+/g, '_')}_${currentFileName.split('.')[0]}.docx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Minuta baixada no formato Word!', 'success');
        });
    }

    async function callOpenAIText(systemPrompt, userText, apiKey) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userText }
                ],
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    }

    function downloadFile(filename, content, type) {
        const blob = new Blob([content], { type: type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // History & Dashboard Stats (Supabase Cloud)
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    async function saveToHistory(fileName, analysis) {
        const risk  = analysis.riscos?.risco_geral || 'N/A';
        const score = analysis.riscos?.pontuacao ?? 50;
        const date  = new Date().toLocaleDateString('pt-BR');

        if (currentUser) {
            // Salva no Supabase (nuvem)
            const { error } = await sbClient
                .from('scancontracts_historico')
                .insert({
                    user_id:   currentUser.id,
                    file_name: fileName,
                    date,
                    risk,
                    score,
                    analysis
                });
            if (error) {
                console.error('Erro ao salvar no Supabase:', error);
                showToast('Análise salva apenas localmente.', 'warning');
            }
        }

        // Sincroniza com o cache local
        const newItem = { id: Date.now(), fileName, date, risk, score, analysis };
        cachedHistory.unshift(newItem);
        localStorage.setItem('SCANCONTRACTS_HISTORY', JSON.stringify(cachedHistory.slice(0, 50)));

        renderHistory();
        updateDashboardStats();
    }

    function renderHistory() {
        let history = [...cachedHistory];
        const tbody   = document.getElementById('history-list-body');
        if (!tbody) return;

        // Captura os valores dos filtros atuais
        const searchInput = document.getElementById('history-search');
        const riskSelect = document.getElementById('history-filter-risk');
        const sortSelect = document.getElementById('history-sort');

        const searchText = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const riskFilter = riskSelect ? riskSelect.value : 'all';
        const sortMode = sortSelect ? sortSelect.value : 'newest';

        // 1. Aplica Filtro de Busca (Texto)
        if (searchText) {
            history = history.filter(item => item.fileName.toLowerCase().includes(searchText));
        }

        // 2. Aplica Filtro de Risco
        if (riskFilter !== 'all') {
            history = history.filter(item => {
                const itemRisk = (item.risk || '').toLowerCase();
                if (riskFilter === 'alto') return itemRisk.includes('alto');
                if (riskFilter === 'mÃ©dio') return itemRisk.includes('mÃ©d') || itemRisk.includes('med');
                if (riskFilter === 'baixo') return itemRisk.includes('baix');
                return true;
            });
        }

        // 3. Aplica OrdenaÃ§Ã£o
        history.sort((a, b) => {
            if (sortMode === 'newest') return b.id - a.id;
            if (sortMode === 'oldest') return a.id - b.id;
            if (sortMode === 'score_desc') return b.score - a.score;
            if (sortMode === 'score_asc') return a.score - b.score;
            return 0;
        });

        if (history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="color:var(--text-muted);padding:2rem;">Nenhuma anÃ¡lise encontrada.</td></tr>';
            return;
        }

        const riskColor = (r) => {
            const rl = (r || '').toLowerCase();
            if (rl.includes('alto')) return 'var(--error)';
            if (rl.includes('mÃ©d') || rl.includes('med')) return 'var(--warning)';
            if (rl.includes('baix')) return 'var(--success)';
            return 'var(--text-muted)';
        };

        tbody.innerHTML = history.map(item => `
            <tr>
                <td>${item.fileName}</td>
                <td>${item.date}</td>
                <td style="color:${riskColor(item.risk)};font-weight:600;">${item.risk}</td>
                <td style="color:var(--primary);font-weight:700;">${item.score}/100</td>
                <td><button class="btn-icon btn-view-history" data-id="${item.id}" title="Ver resultado">ðŸ‘ï¸</button></td>
            </tr>`).join('');

        // Attach event listeners to view buttons
        document.querySelectorAll('.btn-view-history').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                const item = history.find(h => h.id === id);
                if (item && item.analysis) {
                    showResults(item.fileName, item.analysis);
                    // Update back button behavior to return to history
                    const backBtn = document.getElementById('btn-back-to-analysis');
                    if (backBtn) {
                        backBtn.onclick = () => { navigateTo('history'); };
                    }
                }
            });
        });
    }

    function updateDashboardStats() {
        const history = cachedHistory;
        
        let highRisk = 0, medRisk = 0, lowRisk = 0, taxReformAlerts = 0, totalScore = 0;
        
        history.forEach(item => {
            const riskLower = (item.risk || '').toLowerCase();
            if (riskLower.includes('alto')) highRisk++;
            else if (riskLower.includes('mÃ©d') || riskLower.includes('med')) medRisk++;
            else if (riskLower.includes('baix')) lowRisk++;
            
            totalScore += item.score;
            
            const reformaRisco = (item.analysis?.reforma_tributaria?.risco || '').toLowerCase();
            if (reformaRisco.includes('alto') || 
                item.analysis?.clausulas_detectadas?.reforma_tributaria === false) {
                taxReformAlerts++;
            }
        });

        const total = history.length;
        const avgScore = total > 0 ? Math.round(totalScore / total) : 0;

        // Update dashboard values safely
        const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        
        setEl('dash-total', total);
        setEl('dash-high-risk', highRisk);
        setEl('dash-tax-reform', taxReformAlerts);
        setEl('dash-avg-score', avgScore);

        // Atualiza o badge de notificaÃ§Ãµes com o total real de contratos
        const badge = document.getElementById('notifications-badge');
        if (badge) {
            badge.textContent = total;
            badge.style.display = total > 0 ? '' : 'none';
        }

        // Update Chart.js Risk Distribution
        const ctx = document.getElementById('riskChart');
        if (ctx) {
            // DestrÃ³i instÃ¢ncia anterior se existir
            if (window.dashRiskChart) {
                window.dashRiskChart.destroy();
            }
            
            window.dashRiskChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Alto Risco', 'MÃ©dio Risco', 'Baixo Risco'],
                    datasets: [{
                        data: total > 0 ? [highRisk, medRisk, lowRisk] : [0, 0, 1], // Mostra um anel vazio se nÃ£o houver dados
                        backgroundColor: total > 0 ? [
                            '#ff3b3b', // var(--error)
                            '#ffb300', // var(--warning)
                            '#00e676'  // var(--success)
                        ] : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.05)'],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '75%',
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: '#8a9ab0', // var(--text-muted)
                                font: {
                                    family: "'Inter', sans-serif",
                                    size: 13
                                },
                                padding: 20
                            }
                        },
                        tooltip: {
                            enabled: total > 0, // Desativa tooltip se nÃ£o houver dados
                            backgroundColor: 'rgba(10, 25, 47, 0.9)',
                            titleFont: { family: "'Inter', sans-serif" },
                            bodyFont: { family: "'Inter', sans-serif" },
                            padding: 12,
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderWidth: 1
                        }
                    }
                }
            });
        }

        // Update recent activity list
        const recentList = document.getElementById('recent-activity-list');
        if (recentList) {
            const recentItems = history.slice(0, 3);
            if (recentItems.length === 0) {
                recentList.innerHTML = '<div class="activity-item"><div class="item-details"><span class="item-meta">Nenhuma atividade recente.</span></div></div>';
            } else {
                recentList.innerHTML = recentItems.map(item => {
                    const iconColor = item.risk === 'Alto' ? 'var(--error)' : (item.risk === 'MÃ©dio' ? 'var(--warning)' : 'var(--success)');
                    return `
                    <div class="activity-item">
                        <div class="item-icon" style="color: ${iconColor}; background: rgba(255,255,255,0.05);">ðŸ“„</div>
                        <div class="item-details">
                            <span class="item-title">${item.fileName}</span>
                            <span class="item-meta">Analisado em ${item.date} â€¢ Risco ${item.risk} (${item.score}/100)</span>
                        </div>
                        <div class="item-action">
                            <button class="btn-icon btn-view-recent" data-id="${item.id}">ðŸ‘ï¸</button>
                        </div>
                    </div>`;
                }).join('');

                // Attach events for recent activity view buttons
                document.querySelectorAll('.btn-view-recent').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const id = parseInt(e.currentTarget.getAttribute('data-id'));
                        const item = history.find(h => h.id === id);
                        if (item && item.analysis) {
                            showResults(item.fileName, item.analysis);
                            const backBtn = document.getElementById('btn-back-to-analysis');
                            if (backBtn) backBtn.onclick = () => { navigateTo('dashboard'); };
                        }
                    });
                });
            }
        }
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Filtros do HistÃ³rico
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const historySearch = document.getElementById('history-search');
    const historyFilterRisk = document.getElementById('history-filter-risk');
    const historySort = document.getElementById('history-sort');

    if (historySearch) historySearch.addEventListener('input', renderHistory);
    if (historyFilterRisk) historyFilterRisk.addEventListener('change', renderHistory);
    if (historySort) historySort.addEventListener('change', renderHistory);

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Dashboard: Animate Risk Bars on Load
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function animateRiskBars() {
        const fills = document.querySelectorAll('.risk-bar-fill');
        fills.forEach(fill => {
            const target = fill.style.width;
            fill.style.width = '0';
            setTimeout(() => { fill.style.width = target; }, 300);
        });
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // AutenticaÃ§Ã£o Supabase (Login / Cadastro / Logout)
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const btnAuthSubmit = document.getElementById('btn-auth-submit');
    const authMessage   = document.getElementById('auth-message');

    if (btnAuthSubmit) {
        btnAuthSubmit.addEventListener('click', async () => {
            const email    = document.getElementById('auth-email').value.trim();
            const password = document.getElementById('auth-password').value;
            const name     = document.getElementById('auth-name').value.trim();
            const isSignup = btnAuthSubmit.textContent === 'Criar Conta';

            if (!email || !password) {
                authMessage.textContent = 'Preencha e-mail e senha.';
                authMessage.style.color = 'var(--error)';
                return;
            }

            btnAuthSubmit.disabled = true;
            btnAuthSubmit.textContent = 'Aguarde...';
            authMessage.textContent = '';

            if (isSignup) {
                const { data, error } = await sbClient.auth.signUp({
                    email, password,
                    options: { data: { nome: name || email.split('@')[0] } }
                });
                if (error) {
                    authMessage.textContent = error.message;
                    authMessage.style.color = 'var(--error)';
                } else {
                    authMessage.textContent = 'âœ… Conta criada! Verifique seu e-mail para confirmar.';
                    authMessage.style.color = 'var(--success)';
                }
            } else {
                const { data, error } = await sbClient.auth.signInWithPassword({ email, password });
                if (error) {
                    authMessage.textContent = 'E-mail ou senha incorretos.';
                    authMessage.style.color = 'var(--error)';
                } else if (data.user) {
                    currentUser = data.user;
                    await loadCloudHistory();
                    document.getElementById('auth-screen').classList.remove('active');
                    revealApp(data.user);
                }
            }

            btnAuthSubmit.disabled = false;
            btnAuthSubmit.textContent = isSignup ? 'Criar Conta' : 'Entrar';
        });
    }

    // Suporte Ã  tecla Enter nos campos de auth
    ['auth-email', 'auth-password', 'auth-name'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keydown', e => {
            if (e.key === 'Enter') btnAuthSubmit?.click();
        });
    });

    // Botão de Logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await sbClient.auth.signOut();
            currentUser = null;
            document.getElementById('app-container').classList.remove('active');
            document.getElementById('app-container').classList.add('hidden');
            // Recarrega a página ao invés de tentar exibir a tela de login que foi removida
            window.location.reload();
        });
    }

});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Inline styles for progress items (injected once)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const s = document.createElement('style');
s.textContent = `
    .progress-item { padding: 1rem; margin-bottom: 0.75rem; border-radius: 12px; }
    .progress-item .item-info { display: flex; justify-content: space-between; margin-bottom: 0.5rem; gap: 1rem; }
    .progress-item .file-name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%; }
    .progress-item .status { font-size: 0.8rem; color: var(--text-muted); white-space: nowrap; }
    .mini-loader { height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; }
    .loader-fill { height: 100%; background: linear-gradient(90deg, var(--primary), var(--accent)); transition: width 0.6s ease; border-radius: 3px; }
    .positive { color: var(--success) !important; }
    .negative { color: var(--error) !important; }
    .text-center { text-align: center; }
    #upload-progress h3 { margin-bottom: 1.5rem; color: var(--text-muted); font-size: 1rem; font-weight: 500; }
    .results-main > .card { margin-bottom: 1.5rem; }
    .results-main > .card h2 { margin-bottom: 1rem; font-size: 1.1rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; font-size: 0.85rem; }
    .results-sidebar > .card { margin-bottom: 1.5rem; }
    .results-sidebar > .card h2 { margin-bottom: 1rem; font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }
`;
document.head.appendChild(s);


