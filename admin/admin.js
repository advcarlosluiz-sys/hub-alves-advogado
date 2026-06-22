// Core Administrative Panel Logic
// ──────────────────────────────────────────────

    let state = {
        leads: [],
        logs: [],
        backups: [],
        metrics: {
            totalLeads: 0,
            newLeads: 0,
            securityLogsToday: 0,
            lastBackup: 'Não realizado'
        },
        selectedLead: null
    };

    // Headers with authentication token
    function getHeaders() {
        const token = localStorage.getItem('admin_token');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    // Handle token expiration or unauthorized responses
    function handleUnauthorizedResponse() {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.location.href = '/admin/login.html';
    }

    // ──────────────────────────────────────────────
    // 2. Tab Navigation
    // ──────────────────────────────────────────────
    const menuItems = document.querySelectorAll('.menu-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const tabTitle = document.getElementById('tab-title');

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.getAttribute('data-tab');

            menuItems.forEach(mi => mi.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));

            item.classList.add('active');
            document.getElementById(`tab-${tabId}`).classList.add('active');
            
            // Set Page Title
            tabTitle.textContent = item.textContent.substring(3); // Remove emoji
            
            // Load fresh data for the specific tab
            loadTabData(tabId);
        });
    });

    // ──────────────────────────────────────────────
    // 3. API Loaders
    // ──────────────────────────────────────────────
    async function loadTabData(tabId) {
        try {
            if (tabId === 'visao-geral') {
                await fetchMetrics();
                await fetchMiniLogs();
            } else if (tabId === 'leads') {
                await fetchLeads();
            } else if (tabId === 'temas') {
                await fetchLeads();
                renderTemasAnalysis();
            } else if (tabId === 'logs') {
                await fetchLogs();
            } else if (tabId === 'backups') {
                await fetchBackups();
            } else if (tabId === 'configuracoes') {
                await fetchSettings();
            }
        } catch (err) {
            console.error('Erro ao carregar dados da aba:', err);
        }
    }

    // Fetch dashboard metrics
    async function fetchMetrics() {
        try {
            const res = await fetch('/api/admin/metrics', { headers: getHeaders() });
            if (res.status === 401 || res.status === 403) return handleUnauthorizedResponse();
            if (res.ok) {
                const data = await res.json();
                state.metrics = data;
                
                document.getElementById('metric-total-leads').textContent = data.totalLeads;
                document.getElementById('metric-new-leads').textContent = data.newLeads;
                document.getElementById('metric-security-logs').textContent = data.securityLogsToday;
                document.getElementById('metric-last-backup').textContent = data.lastBackup || 'Não realizado';
                
                renderTemasChart(data.leadsByTema);
            }
        } catch (err) {
            console.error(err);
        }
    }

    // Fetch mini log preview for overview tab
    async function fetchMiniLogs() {
        try {
            const res = await fetch('/api/admin/logs?limit=5', { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                const listContainer = document.getElementById('list-mini-logs');
                listContainer.innerHTML = '';
                
                if (data.length === 0) {
                    listContainer.innerHTML = '<p class="description-text">Nenhum evento registrado.</p>';
                    return;
                }

                data.forEach(log => {
                    const item = document.createElement('div');
                    item.className = 'mini-log-item';
                    
                    let icon = 'ℹ️';
                    if (log.event === 'login_failed' || log.event === 'unauthorized_access_attempt' || log.type === 'error') {
                        icon = '⚠️';
                    } else if (log.event === 'backup_created' || log.event === 'backup_restored') {
                        icon = '💾';
                    }

                    const timeStr = new Date(log.timestamp).toLocaleString('pt-BR');
                    let descText = log.reason || log.metadata?.action || log.description || log.message || 'Sem detalhes';
                    let actorText = '';
                    if (log.actorEmail) {
                        actorText = log.actorEmail;
                    }
                    if (log.metadata && log.metadata.ip) {
                        actorText += (actorText ? ` [IP: ${log.metadata.ip}]` : `IP: ${log.metadata.ip}`);
                    }
                    if (actorText) {
                        descText = `<strong>${actorText}:</strong> ${descText}`;
                    }

                    item.innerHTML = `
                        <div class="mini-log-header">
                            <span>${icon} ${log.event || log.action || 'Erro'}</span>
                            <span>${timeStr}</span>
                        </div>
                        <div class="mini-log-body">
                            ${descText}
                        </div>
                    `;
                    listContainer.appendChild(item);
                });
            }
        } catch (err) {
            console.error(err);
        }
    }

    // Render temas chart bar list in Overview
    function renderTemasChart(leadsByTema = {}) {
        const container = document.getElementById('chart-temas');
        container.innerHTML = '';

        const entries = Object.entries(leadsByTema);
        if (entries.length === 0) {
            container.innerHTML = '<p class="description-text">Nenhuma solicitação recebida ainda.</p>';
            return;
        }

        const maxVal = Math.max(...entries.map(e => e[1]), 1);

        // Sort descending
        entries.sort((a, b) => b[1] - a[1]);

        entries.forEach(([tema, count]) => {
            const pct = Math.round((count / maxVal) * 100);
            const bar = document.createElement('div');
            bar.className = 'chart-bar-container';
            bar.innerHTML = `
                <div class="chart-bar-label">
                    <span>${tema}</span>
                    <strong>${count}</strong>
                </div>
                <div class="chart-bar-bg">
                    <div class="chart-bar-fill" style="width: ${pct}%"></div>
                </div>
            `;
            container.appendChild(bar);
        });
    }

    // Fetch leads
    async function fetchLeads() {
        try {
            const res = await fetch('/api/admin/leads', { headers: getHeaders() });
            if (res.status === 401 || res.status === 403) return handleUnauthorizedResponse();
            if (res.ok) {
                state.leads = await res.json();
                renderLeadsTable();
            }
        } catch (err) {
            console.error(err);
        }
    }

    // Render Leads table with search and filters
    function renderLeadsTable() {
        const tbody = document.getElementById('table-leads-body');
        const searchTerm = document.getElementById('search-leads').value.toLowerCase();
        const filterTema = document.getElementById('filter-tema').value;
        const filterStatus = document.getElementById('filter-status').value;

        tbody.innerHTML = '';

        const filtered = state.leads.filter(lead => {
            const matchesSearch = lead.nome.toLowerCase().includes(searchTerm) || 
                                  (lead.email && lead.email.toLowerCase().includes(searchTerm)) || 
                                  (lead.telefoneWhatsapp && lead.telefoneWhatsapp.includes(searchTerm)) ||
                                  lead.motivoContato.toLowerCase().includes(searchTerm);
            
            const matchesTema = !filterTema || lead.temaJuridico === filterTema;
            const matchesStatus = !filterStatus || lead.status === filterStatus;

            return matchesSearch && matchesTema && matchesStatus;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Nenhum lead encontrado.</td></tr>';
            return;
        }

        filtered.forEach(lead => {
            const tr = document.createElement('tr');
            const dataStr = new Date(lead.dataCriacao).toLocaleDateString('pt-BR');
            const statusLabel = lead.status.replace('_', ' ').toUpperCase();
            
            tr.innerHTML = `
                <td><strong>${escapeHtml(lead.nome)}</strong></td>
                <td>
                    <div style="font-size: 0.85rem;">
                        <div>${lead.telefoneWhatsapp ? escapeHtml(lead.telefoneWhatsapp) : '-'}</div>
                        <div style="color: var(--text-muted); font-size: 0.75rem;">${lead.email ? escapeHtml(lead.email) : '-'}</div>
                    </div>
                </td>
                <td><span style="font-size: 0.85rem;">${escapeHtml(lead.temaJuridico)}</span></td>
                <td><span style="font-size: 0.85rem; font-weight: 500; color: var(--secondary-dark);">${escapeHtml(lead.interessePresumido || 'Não avaliado')}</span></td>
                <td><span class="badge-tag badge-status-${lead.status}">${statusLabel}</span></td>
                <td><span class="badge-tag badge-consent">${lead.consentimentoLgpd ? 'SIM v1' : 'NÃO'}</span></td>
                <td>${dataStr}</td>
                <td class="btn-actions">
                    <button class="btn-table-action btn-view-lead" data-id="${lead.id}">Ver Ficha</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Add event listeners to buttons
        tbody.querySelectorAll('.btn-view-lead').forEach(btn => {
            btn.addEventListener('click', () => {
                const leadId = btn.getAttribute('data-id');
                openLeadModal(leadId);
            });
        });
    }

    // Render themes analysis list
    function renderTemasAnalysis() {
        const tbody = document.getElementById('table-temas-body');
        tbody.innerHTML = '';

        const counts = {};
        const subthemes = {};

        state.leads.forEach(lead => {
            const t = lead.temaJuridico;
            counts[t] = (counts[t] || 0) + 1;
            
            if (lead.interessePresumido) {
                if (!subthemes[t]) subthemes[t] = new Set();
                subthemes[t].add(lead.interessePresumido.split('/').pop().trim());
            }
        });

        const list = [
            'Família e Sucessões',
            'Direito Imobiliário',
            'Direito Civil',
            'Consumidor',
            'Bancário',
            'Empresarial',
            'Contratos',
            'Execução, Cobrança e Recuperação de Créditos',
            'Reforma Tributária / CBS / IBS',
            'Holdings Familiares'
        ];

        list.forEach(tema => {
            const count = counts[tema] || 0;
            const subs = subthemes[tema] ? Array.from(subthemes[tema]).join(', ') : 'Nenhum subsetor extraído';
            const trust = count > 0 ? 'Alta (Automática)' : '-';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${tema}</strong></td>
                <td>${count} solicitações</td>
                <td><span style="font-size: 0.85rem; color: var(--text-muted);">${escapeHtml(subs)}</span></td>
                <td><span class="badge-tag" style="background: rgba(191, 161, 95, 0.1); color: var(--secondary-dark);">${trust}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Fetch logs
    async function fetchLogs() {
        try {
            const filterType = document.getElementById('filter-log-type').value;
            let url = '/api/admin/logs';
            if (filterType !== 'all') {
                url += `?type=${filterType}`;
            }

            const res = await fetch(url, { headers: getHeaders() });
            if (res.status === 401 || res.status === 403) return handleUnauthorizedResponse();
            if (res.ok) {
                state.logs = await res.json();
                renderLogsTable();
            }
        } catch (err) {
            console.error(err);
        }
    }

    // Render Logs Table
    function renderLogsTable() {
        const tbody = document.getElementById('table-logs-body');
        tbody.innerHTML = '';

        if (state.logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Nenhum log encontrado.</td></tr>';
            return;
        }

        state.logs.forEach(log => {
            const tr = document.createElement('tr');
            const dateStr = new Date(log.timestamp).toLocaleString('pt-BR');
            
            let logTypeClass = 'badge-status-arquivado';
            let eventText = log.event || log.action || 'ERRO';
            
            if (log.type === 'auth') {
                const successEvents = ['login_success', 'logout_success'];
                const failEvents = ['login_failed', 'session_expired', 'unauthorized_access_attempt'];
                if (successEvents.includes(log.event)) {
                    logTypeClass = 'badge-status-contatado';
                } else if (failEvents.includes(log.event)) {
                    logTypeClass = 'badge-status-excluido';
                } else {
                    logTypeClass = 'badge-status-arquivado';
                }
            } else if (log.type === 'audit') {
                logTypeClass = 'badge-status-novo';
            } else if (log.type === 'error') {
                logTypeClass = 'badge-status-excluido';
            }

            // Description details
            let descText = log.reason || log.description || log.message || '';
            let ipText = '';
            
            if (log.metadata && typeof log.metadata === 'object') {
                if (log.metadata.ip) {
                    ipText = ` [IP: ${log.metadata.ip}]`;
                }
                const metaDisplay = Object.entries(log.metadata)
                    .filter(([k]) => !['ipHash', 'userAgent', 'ip'].includes(k))
                    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
                    .join(', ');
                if (metaDisplay) descText += (descText ? ' | ' : '') + `Detalhes: {${metaDisplay}}`;
            }
            
            if (log.actorEmail) {
                descText = `Por: ${log.actorEmail}${ipText} | ${descText}`;
            } else if (ipText) {
                descText = `Origem:${ipText} | ${descText}`;
            }

            // Hash integrity check
            const integrityStr = log.integrityHash 
                ? `<span style="font-size:0.7rem; color: #10b981; font-family: monospace;">✔ Integridade OK (${log.integrityHash.substring(0, 8)})</span>`
                : `<span style="font-size:0.7rem; color: var(--text-muted);">Não aplicável</span>`;

            tr.innerHTML = `
                <td>${dateStr}</td>
                <td><span class="badge-tag ${logTypeClass}">${eventText}</span></td>
                <td><span style="font-size: 0.85rem; font-family: monospace; word-break: break-all;">${escapeHtml(descText)}</span></td>
                <td>${integrityStr}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Fetch Backups list
    async function fetchBackups() {
        try {
            const res = await fetch('/api/admin/backups', { headers: getHeaders() });
            if (res.status === 401 || res.status === 403) return handleUnauthorizedResponse();
            if (res.ok) {
                state.backups = await res.json();
                renderBackupsTable();
            }
        } catch (err) {
            console.error(err);
        }
    }

    // Fetch retention settings
    async function fetchSettings() {
        try {
            const res = await fetch('/api/admin/settings', { headers: getHeaders() });
            if (res.status === 401 || res.status === 403) return handleUnauthorizedResponse();
            if (res.ok) {
                const data = await res.json();
                if (data && data.logRetentionDays) {
                    document.getElementById('config-log-retention').value = data.logRetentionDays;
                }
            }
        } catch (err) {
            console.error('Erro ao buscar configurações:', err);
        }
    }

    // Render backups table
    function renderBackupsTable() {
        const tbody = document.getElementById('table-backups-body');
        tbody.innerHTML = '';

        if (state.backups.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Nenhum backup local encontrado.</td></tr>';
            return;
        }

        state.backups.forEach(backup => {
            const tr = document.createElement('tr');
            const dateStr = new Date(backup.timestamp).toLocaleString('pt-BR');
            const sizeKB = (backup.sizeBytes / 1024).toFixed(2) + ' KB';
            
            const checksum = backup.sha256 || 'N/A';
            const integrityBadge = backup.verified 
                ? '<span class="badge-tag badge-status-contatado">Válido</span>' 
                : '<span class="badge-tag badge-status-em_analise">Pendente verificar</span>';

            tr.innerHTML = `
                <td><strong>${escapeHtml(backup.filename)}</strong></td>
                <td>${dateStr}</td>
                <td>${sizeKB}</td>
                <td><span style="font-family: monospace; font-size: 0.75rem;">${checksum.substring(0,16)}...</span></td>
                <td>${integrityBadge}</td>
                <td class="btn-actions">
                    <button class="btn-table-action btn-restore-backup" data-filename="${backup.filename}">Restaurar</button>
                    <button class="btn-table-action btn-export-enc" data-filename="${backup.filename}">Exportar (.enc)</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Add action listeners
        tbody.querySelectorAll('.btn-restore-backup').forEach(btn => {
            btn.addEventListener('click', () => {
                const fn = btn.getAttribute('data-filename');
                restoreBackup(fn);
            });
        });
        tbody.querySelectorAll('.btn-export-enc').forEach(btn => {
            btn.addEventListener('click', () => {
                const fn = btn.getAttribute('data-filename');
                exportEncryptedBackup(fn);
            });
        });
    }

    // ──────────────────────────────────────────────
    // 4. Lead Details Modal & Management
    // ──────────────────────────────────────────────
    const leadModal = document.getElementById('lead-modal');
    const closeLeadModalBtn = document.getElementById('close-lead-modal');

    closeLeadModalBtn.addEventListener('click', () => {
        leadModal.style.display = 'none';
    });

    function openLeadModal(leadId) {
        const lead = state.leads.find(l => l.id === leadId);
        if (!lead) return;

        state.selectedLead = lead;

        document.getElementById('modal-lead-name').textContent = lead.nome;
        document.getElementById('modal-lead-email').textContent = lead.email || 'Não informado';
        document.getElementById('modal-lead-phone').textContent = lead.telefoneWhatsapp || 'Não informado';
        document.getElementById('modal-lead-tema').textContent = lead.temaJuridico;
        document.getElementById('modal-lead-interesse').textContent = lead.interessePresumido || 'Não avaliado';
        document.getElementById('modal-lead-origem').textContent = lead.origem || 'Website (Geral)';
        document.getElementById('modal-lead-pagina-origem').textContent = lead.paginaOrigem || '/';
        document.getElementById('modal-lead-consentimento').textContent = lead.consentimentoLgpd ? '✔ ACEITO (v1)' : '✘ NÃO ACEITO';
        document.getElementById('modal-lead-data').textContent = new Date(lead.dataCriacao).toLocaleString('pt-BR');
        document.getElementById('modal-lead-mensagem').textContent = lead.motivoContato;
        document.getElementById('modal-lead-status').value = lead.status;
        document.getElementById('modal-lead-observacoes').value = lead.observacoesInternas || '';

        leadModal.style.display = 'flex';
    }

    // Save edited lead details (status, lawyer notes)
    document.getElementById('btn-save-lead-details').addEventListener('click', async () => {
        if (!state.selectedLead) return;

        const updatedStatus = document.getElementById('modal-lead-status').value;
        const updatedObs = document.getElementById('modal-lead-observacoes').value;

        try {
            const res = await fetch(`/api/admin/leads/${state.selectedLead.id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({
                    status: updatedStatus,
                    observacoesInternas: updatedObs
                })
            });

            if (res.ok) {
                alert('Detalhes do lead salvos com sucesso!');
                leadModal.style.display = 'none';
                fetchLeads();
            } else {
                const data = await res.json();
                alert(data.message || 'Erro ao salvar alterações.');
            }
        } catch (err) {
            console.error(err);
            alert('Erro de conexão ao salvar alterações.');
        }
    });

    // Delete single lead
    document.getElementById('btn-delete-lead').addEventListener('click', async () => {
        if (!state.selectedLead) return;
        if (!confirm(`Deseja mesmo excluir permanentemente o lead "${state.selectedLead.name || state.selectedLead.nome}"? Esta operação gerará logs de auditoria.`)) return;

        try {
            const res = await fetch(`/api/admin/leads/${state.selectedLead.id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });

            if (res.ok) {
                alert('Lead excluído permanentemente!');
                leadModal.style.display = 'none';
                fetchLeads();
            } else {
                const data = await res.json();
                alert(data.message || 'Erro ao excluir lead.');
            }
        } catch (err) {
            console.error(err);
            alert('Erro de conexão.');
        }
    });

    // ──────────────────────────────────────────────
    // 5. Backups Actions
    // ──────────────────────────────────────────────
    document.getElementById('btn-create-backup').addEventListener('click', async () => {
        const btn = document.getElementById('btn-create-backup');
        btn.disabled = true;
        btn.textContent = 'Criando Backup...';

        try {
            const res = await fetch('/api/admin/backups', {
                method: 'POST',
                headers: getHeaders()
            });

            const data = await res.json();
            if (res.ok) {
                alert(`Backup criado com sucesso!\nArquivo: ${data.filename}`);
                fetchBackups();
            } else {
                alert(data.message || 'Erro ao criar backup.');
            }
        } catch (err) {
            console.error(err);
            alert('Erro de conexão.');
        } finally {
            btn.disabled = false;
            btn.textContent = '💾 Criar Backup Agora';
        }
    });

    document.getElementById('btn-verify-backups').addEventListener('click', async () => {
        const btn = document.getElementById('btn-verify-backups');
        btn.disabled = true;
        btn.textContent = 'Verificando...';

        try {
            const res = await fetch('/api/admin/backups/verify', {
                method: 'POST',
                headers: getHeaders()
            });

            const data = await res.json();
            if (res.ok) {
                alert(`Verificação completa!\nStatus: ${data.message}`);
                fetchBackups();
            } else {
                alert(data.message || 'Erro ao verificar backups.');
            }
        } catch (err) {
            console.error(err);
            alert('Erro de conexão.');
        } finally {
            btn.disabled = false;
            btn.textContent = '🔍 Verificar Integridade de Todos';
        }
    });

    // Restore Backup API trigger
    async function restoreBackup(filename) {
        if (!confirm(`ATENÇÃO:\nVocê está prestes a restaurar a base de dados a partir do arquivo "${filename}".\nIsso substituirá todos os leads e logs atuais!\nDeseja continuar?`)) return;

        try {
            const res = await fetch(`/api/admin/backups/restore`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ filename })
            });

            const data = await res.json();
            if (res.ok) {
                alert('Base de dados restaurada com sucesso!');
                window.location.reload();
            } else {
                alert(data.message || 'Erro ao restaurar backup.');
            }
        } catch (err) {
            console.error(err);
            alert('Erro de conexão.');
        }
    }

    // Export encrypted backup file direct download
    function exportEncryptedBackup(filename) {
        const token = localStorage.getItem('admin_token');
        window.open(`/api/admin/backups/download?filename=${filename}&token=${token}`, '_blank');
    }

    // ──────────────────────────────────────────────
    // 6. Export Lists (CSV / JSON)
    // ──────────────────────────────────────────────
    document.getElementById('btn-export-leads').addEventListener('click', () => {
        exportData(state.leads, 'leads-carlos-luiz-advocacia');
    });

    document.getElementById('btn-export-logs').addEventListener('click', () => {
        exportData(state.logs, 'logs-carlos-luiz-advocacia');
    });

    function exportData(dataList, filePrefix) {
        if (dataList.length === 0) {
            alert('Não há dados para exportar.');
            return;
        }

        const format = confirm('Pressione OK para exportar em CSV ou Cancelar para exportar em JSON.');
        const dateStr = new Date().toISOString().split('T')[0];

        if (format) {
            // CSV Export
            const headers = Object.keys(dataList[0]);
            let csvContent = '\uFEFF' + headers.join(',') + '\n'; // Add UTF-8 BOM

            dataList.forEach(item => {
                const row = headers.map(header => {
                    let val = item[header];
                    if (val === undefined || val === null) {
                        return '""';
                    }
                    if (typeof val === 'object') {
                        val = JSON.stringify(val);
                    }
                    // Escape double quotes and wrap in quotes
                    val = val.toString().replace(/"/g, '""');
                    return `"${val}"`;
                });
                csvContent += row.join(',') + '\n';
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filePrefix}-${dateStr}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            
            // Log export action
            logExportAction(filePrefix, 'CSV');
        } else {
            // JSON Export
            const blob = new Blob([JSON.stringify(dataList, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filePrefix}-${dateStr}.json`;
            a.click();
            URL.revokeObjectURL(url);

            // Log export action
            logExportAction(filePrefix, 'JSON');
        }
    }

    async function logExportAction(filePrefix, format) {
        try {
            await fetch('/api/admin/logs/export', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ file: filePrefix, format })
            });
        } catch (err) {
            console.error(err);
        }
    }

    // ──────────────────────────────────────────────
    // 7. General Settings & GDPR Holder deletion
    // ──────────────────────────────────────────────
    document.getElementById('btn-save-settings').addEventListener('click', async () => {
        const logRetention = document.getElementById('config-log-retention').value;

        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ logRetentionDays: parseInt(logRetention) })
            });

            if (res.ok) {
                alert('Configurações salvas localmente!');
            } else {
                alert('Erro ao salvar configurações.');
            }
        } catch (err) {
            console.error(err);
        }
    });

    document.getElementById('btn-delete-holder').addEventListener('click', async () => {
        const email = document.getElementById('delete-holder-email').value.trim();
        if (!email) {
            alert('Por favor, informe o e-mail do titular.');
            return;
        }

        if (!confirm(`CONFIRMAÇÃO CRÍTICA (LGPD):\nTem certeza que deseja excluir TODOS os dados e leads vinculados ao e-mail "${email}"?\nEsta ação é irreversível e gerará log de auditoria.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/leads/holder?email=${encodeURIComponent(email)}`, {
                method: 'DELETE',
                headers: getHeaders()
            });

            const data = await res.json();
            if (res.ok) {
                alert(data.message || 'Dados do titular excluídos com sucesso!');
                document.getElementById('delete-holder-email').value = '';
                fetchLeads();
            } else {
                alert(data.message || 'Erro ao realizar a exclusão.');
            }
        } catch (err) {
            console.error(err);
            alert('Erro de conexão.');
        }
    });

    // ──────────────────────────────────────────────
    // 8. Logout
    // ──────────────────────────────────────────────
    document.getElementById('btn-logout').addEventListener('click', async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST', headers: getHeaders() });
        } catch (err) {
            console.error(err);
        } finally {
            handleUnauthorizedResponse();
        }
    });

    // ──────────────────────────────────────────────
    // Helper Utilities
    // ──────────────────────────────────────────────
    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Attach filters events
    document.getElementById('search-leads').addEventListener('input', renderLeadsTable);
    document.getElementById('filter-tema').addEventListener('change', renderLeadsTable);
    document.getElementById('filter-status').addEventListener('change', renderLeadsTable);
    document.getElementById('filter-log-type').addEventListener('change', fetchLogs);

    // Environment checking (Local vs Cloud)
    const connStatus = document.getElementById('connection-status');
    const warningBar = document.querySelector('.top-warning-bar');
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (connStatus) {
        if (isLocal) {
            connStatus.textContent = 'Conexão Local Ativa';
        } else {
            connStatus.textContent = 'Conexão Nuvem Ativa';
        }
    }
    if (warningBar) {
        if (isLocal) {
            warningBar.style.display = 'block';
        } else {
            warningBar.style.display = 'none';
        }
    }

    // Initial Loading
    const initialTab = window.location.hash ? window.location.hash.substring(1) : 'visao-geral';
    const initialMenuItem = document.querySelector(`.menu-item[data-tab="${initialTab}"]`);
    if (initialMenuItem) {
        initialMenuItem.click();
    } else {
        loadTabData('visao-geral');
    }

