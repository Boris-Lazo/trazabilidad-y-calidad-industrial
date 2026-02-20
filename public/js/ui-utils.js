
/**
 * UI Utils for PROD-SYS
 * Handles sidebar collapse and Lucide icons initialization
 */

const SIDEBAR_STATE_KEY = 'sidebar_collapsed';

const UI = {
    init() {
        this.initSidebar();
        this.initIcons();
    },

    initSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        const toggleBtn = document.getElementById('btn-toggle-sidebar');

        if (!sidebar || !mainContent || !toggleBtn) return;

        // Restore state
        const isCollapsed = localStorage.getItem(SIDEBAR_STATE_KEY) === 'true';
        if (isCollapsed) {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('collapsed');
        }

        toggleBtn.addEventListener('click', () => {
            const nowCollapsed = sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('collapsed');
            localStorage.setItem(SIDEBAR_STATE_KEY, nowCollapsed);

            // Re-initialize icons if necessary (some might need resizing/realignment)
            if (window.lucide) {
                window.lucide.createIcons();
            }
        });
    },

    initIcons() {
        if (window.lucide) {
            window.lucide.createIcons();
        } else {
            console.warn('Lucide library not found. Icons will not be rendered.');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});

// Export UI globalmente
window.UI = UI;
