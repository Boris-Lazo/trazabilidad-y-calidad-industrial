document.addEventListener('DOMContentLoaded', () => {
    // Elementos de la interfaz
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const hamburgerButton = document.getElementById('hamburger-btn');
    const collapseButton = document.getElementById('collapse-btn');
    const overlay = document.getElementById('overlay');

    // --- GESTIÓN DEL MENÚ MÓVIL (HAMBURGUESA) ---
    if (hamburgerButton && sidebar && overlay) {
        hamburgerButton.addEventListener('click', () => {
            sidebar.classList.toggle('is-open');
            overlay.classList.toggle('is-visible');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('is-open');
            overlay.classList.remove('is-visible');
        });
    }

    // --- GESTIÓN DEL COLAPSO EN ESCRITORIO ---
    if (collapseButton && sidebar && mainContent) {
        // Cargar estado inicial
        const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
        if (isCollapsed) {
            sidebar.classList.add('is-collapsed');
            mainContent.classList.add('sidebar-collapsed');
        }

        collapseButton.addEventListener('click', () => {
            const nowCollapsed = sidebar.classList.toggle('is-collapsed');
            mainContent.classList.toggle('sidebar-collapsed');
            localStorage.setItem('sidebar_collapsed', nowCollapsed);
        });
    }

    // --- INICIALIZACIÓN DE ICONOS ---
    if (window.lucide) {
        window.lucide.createIcons();
    }
});
