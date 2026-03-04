/**
 * INDUSTRIAL DESIGN SYSTEM JS - PROD-SYS
 */

const DesignSystem = {
    init() {
        this.initSidebar();
        this.initButtons();
        this.initThemeToggle();
        this.initLucide();
    },

    /**
     * Theme Toggle logic
     */
    initThemeToggle() {
        const toggle = document.getElementById('theme-toggle');
        if (toggle && window.ThemeManager) {
            toggle.addEventListener('click', () => {
                window.ThemeManager.toggle();
            });
        }
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
     * Modal de error estándar (No rompe sesión, permite cerrar y mantener contexto)
     */
    showErrorModal(title, message, options = {}) {
        const modalId = 'ds-error-modal';
        let modal = document.getElementById(modalId);

        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            modal.style.zIndex = '3000';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-content mw-450">
                <div class="modal-header bg-error-subtle border-bottom-error">
                    <h2 class="text-error d-flex align-center gap-1">
                        <i data-lucide="alert-circle" class="icon-md"></i>
                        <span id="ds-modal-title"></span>
                    </h2>
                    <button class="btn-close" id="ds-modal-close-x">&times;</button>
                </div>
                <div class="modal-body">
                    <p id="ds-modal-message" class="mb-0 lh-1-6"></p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="ds-modal-close-btn">Cerrar</button>
                    ${options.actionText ? `<button class="btn btn-primary" id="ds-modal-action-btn"></button>` : ''}
                </div>
            </div>
        `;

        modal.querySelector('#ds-modal-title').textContent = title || 'Error del Sistema';
        modal.querySelector('#ds-modal-message').textContent = message;
        if (options.actionText) {
            modal.querySelector('#ds-modal-action-btn').textContent = options.actionText;
        }

        modal.style.display = 'flex';
        if (window.lucide) window.lucide.createIcons();

        const close = () => {
            modal.style.display = 'none';
            if (options.onClose) options.onClose();
        };

        modal.querySelector('#ds-modal-close-x').onclick = close;
        modal.querySelector('#ds-modal-close-btn').onclick = close;

        if (options.actionText && options.onAction) {
            modal.querySelector('#ds-modal-action-btn').onclick = () => {
                options.onAction();
                close();
            };
        }
    },

    /**
     * Modal de confirmación estándar
     */
    showConfirmModal(title, message, onConfirm, options = {}) {
        const modalId = 'ds-confirm-modal';
        let modal = document.getElementById(modalId);

        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            modal.style.zIndex = '3000';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-content mw-450">
                <div class="modal-header">
                    <h2 class="d-flex align-center gap-1">
                        <i data-lucide="help-circle" class="icon-md text-primary"></i>
                        <span id="ds-confirm-title"></span>
                    </h2>
                    <button class="btn-close" id="ds-confirm-close-x">&times;</button>
                </div>
                <div class="modal-body">
                    <p id="ds-confirm-message" class="mb-0 lh-1-6"></p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="ds-confirm-cancel-btn">Cancelar</button>
                    <button class="btn btn-primary" id="ds-confirm-ok-btn">Confirmar</button>
                </div>
            </div>
        `;

        modal.querySelector('#ds-confirm-title').textContent = title || 'Confirmación';
        modal.querySelector('#ds-confirm-message').textContent = message;
        if (options.confirmText) modal.querySelector('#ds-confirm-ok-btn').textContent = options.confirmText;
        if (options.cancelText) modal.querySelector('#ds-confirm-cancel-btn').textContent = options.cancelText;

        modal.style.display = 'flex';
        if (window.lucide) window.lucide.createIcons();

        const close = () => { modal.style.display = 'none'; };

        modal.querySelector('#ds-confirm-close-x').onclick = close;
        modal.querySelector('#ds-confirm-cancel-btn').onclick = close;
        modal.querySelector('#ds-confirm-ok-btn').onclick = () => {
            onConfirm();
            close();
        };
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
            <button class="bg-none border-none cursor-pointer ml-1 color-inherit">&times;</button>
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
