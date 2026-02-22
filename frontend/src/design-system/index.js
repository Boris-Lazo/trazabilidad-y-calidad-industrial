/**
 * INDUSTRIAL DESIGN SYSTEM JS - PROD-SYS
 */

const DesignSystem = {
    init() {
        this.initSidebar();
        this.initButtons();
        this.initLucide();
    },

    /**
     * Sidebar Accordion Logic
     */
    initSidebar() {
        const groups = document.querySelectorAll('.nav-group');
        const toggles = document.querySelectorAll('.nav-group-toggle');

        toggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const group = toggle.closest('.nav-group');
                const isOpen = group.classList.contains('open');

                // Close all other groups
                groups.forEach(g => {
                    if (g !== group) {
                        g.classList.remove('open');
                    }
                });

                // Toggle current group
                group.classList.toggle('open', !isOpen);
            });
        });

        // Initialize with all closed (already default by class)
    },

    /**
     * Button Loading States
     */
    initButtons() {
        // Find buttons with data-loading-text
        document.querySelectorAll('.btn[data-loading]').forEach(btn => {
            btn.addEventListener('click', () => {
                // This is a helper, actual loading should be controlled by the caller
            });
        });
    },

    setBtnLoading(btn, isLoading) {
        if (isLoading) {
            btn.classList.add('btn-loading');
            btn.disabled = true;
        } else {
            btn.classList.remove('btn-loading');
            btn.disabled = false;
        }
    },

    /**
     * Toast System
     */
    showToast(message, type = 'info', duration = 3000) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span>${message}</span>
            <button style="background:none; border:none; color:inherit; cursor:pointer; margin-left:10px;">&times;</button>
        `;

        container.appendChild(toast);

        const closeBtn = toast.querySelector('button');
        const removeToast = () => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        };

        closeBtn.addEventListener('click', removeToast);
        setTimeout(removeToast, duration);
    },

    /**
     * Lucide Icons
     */
    initLucide() {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }
};

// Auto-init when DOM is ready
document.addEventListener('DOMContentLoaded', () => DesignSystem.init());

window.DesignSystem = DesignSystem;
