// Aguarda o carregamento completo do HTML para executar o script
document.addEventListener('DOMContentLoaded', function() {

    const toggleButton = document.getElementById('toggle-sidebar-btn');
    const sidebar = document.getElementById('sidebar');
    const content = document.querySelector('.content');
    const dynamicContentArea = document.getElementById('dynamic-content-area');
    const sidebarLinks = document.querySelectorAll('#sidebar nav ul li a');

    toggleButton.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
        content.classList.toggle('full-width');
    });

    /**
     * Função para carregar conteúdo em um iframe.
     * @param {string} pageName - O nome base do arquivo (ex: 'grafo_interesses').
     */
    function loadPageContent(pageName) {
        const fullHtmlUrl = `${pageName}_full.html`; // <--- Novo nome do arquivo HTML completo

        // Limpa a área e insere o iframe
        dynamicContentArea.innerHTML = ''; 
        const iframeElement = document.createElement('iframe');
        iframeElement.src = fullHtmlUrl;
        iframeElement.style.width = '100%';
        iframeElement.style.height = '100%'; // Ajuste conforme necessário
        iframeElement.style.border = 'none'; // Para remover a borda padrão do iframe
        iframeElement.loading = 'lazy'; // Otimização para carregamento
        iframeElement.sandbox = 'allow-scripts allow-same-origin'; // Permissões para o iframe

        dynamicContentArea.appendChild(iframeElement);
        console.log(`Grafo carregado via iframe de '${fullHtmlUrl}'.`);

        // Nenhuma lógica de espera por 'vis' ou 'container' é necessária aqui,
        // pois o iframe lida com o carregamento e execução do seu próprio documento.
        if (window.innerWidth <= 768) {
            sidebar.classList.add('collapsed');
            content.classList.add('full-width');
        }
    }

    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const pageToLoad = this.dataset.page;
            if (pageToLoad) {
                loadPageContent(pageToLoad);
            }
        });
    });

    loadPageContent('grafo_interesses');
});