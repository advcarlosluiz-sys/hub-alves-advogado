/**
 * ScanContracts — Configuração da OpenAI API Key
 *
 * Esta chave é lida do .env em tempo de desenvolvimento local.
 * Para produção, substitua ou gerencie via backend seguro.
 *
 * ⚠️  Não exponha este arquivo em repositórios públicos.
 */
(function () {
    const API_KEY = '';

    // Só inicializa se o usuário ainda não salvou uma chave própria
    if (!localStorage.getItem('OPENAI_API_KEY') && API_KEY) {
        localStorage.setItem('OPENAI_API_KEY', API_KEY);
        console.info('[ScanContracts] OpenAI API Key carregada do config.js ✔');
    }
})();
