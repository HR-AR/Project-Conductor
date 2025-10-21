/**
 * Modern Mobile-Friendly Notification System
 * Replaces native alert(), confirm(), and prompt() with elegant, non-intrusive UI
 */

class NotificationSystem {
    constructor() {
        this.container = null;
        this.activeModals = [];
        this.init();
    }

    init() {
        // Create toast container
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
            max-width: 90vw;
        `;
        document.body.appendChild(this.container);

        // Inject styles
        this.injectStyles();
    }

    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Toast Notifications */
            .toast {
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                padding: 16px 20px;
                min-width: 300px;
                max-width: 500px;
                display: flex;
                align-items: center;
                gap: 12px;
                pointer-events: auto;
                animation: slideInRight 0.3s ease-out;
                position: relative;
                overflow: hidden;
            }

            .toast::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 4px;
            }

            .toast.success::before { background: #10b981; }
            .toast.error::before { background: #ef4444; }
            .toast.warning::before { background: #f59e0b; }
            .toast.info::before { background: #3b82f6; }

            .toast-icon {
                font-size: 24px;
                flex-shrink: 0;
            }

            .toast-content {
                flex: 1;
                font-size: 14px;
                color: #374151;
                line-height: 1.5;
            }

            .toast-close {
                background: none;
                border: none;
                font-size: 20px;
                color: #9ca3af;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s;
            }

            .toast-close:hover {
                background: #f3f4f6;
                color: #374151;
            }

            /* Modal Dialog */
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                animation: fadeIn 0.2s ease-out;
            }

            .modal-dialog {
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                max-width: 500px;
                width: 100%;
                animation: scaleIn 0.3s ease-out;
                overflow: hidden;
            }

            .modal-header {
                padding: 24px 24px 16px;
                border-bottom: 1px solid #e5e7eb;
            }

            .modal-title {
                font-size: 20px;
                font-weight: 600;
                color: #111827;
                margin: 0;
            }

            .modal-body {
                padding: 20px 24px;
                color: #4b5563;
                font-size: 15px;
                line-height: 1.6;
                max-height: 60vh;
                overflow-y: auto;
            }

            .modal-footer {
                padding: 16px 24px;
                background: #f9fafb;
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }

            .modal-button {
                padding: 10px 20px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                border: none;
                outline: none;
                min-width: 80px;
            }

            .modal-button.primary {
                background: #3b82f6;
                color: white;
            }

            .modal-button.primary:hover {
                background: #2563eb;
            }

            .modal-button.danger {
                background: #ef4444;
                color: white;
            }

            .modal-button.danger:hover {
                background: #dc2626;
            }

            .modal-button.secondary {
                background: white;
                color: #374151;
                border: 1px solid #d1d5db;
            }

            .modal-button.secondary:hover {
                background: #f9fafb;
            }

            /* Animations */
            @keyframes slideInRight {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes scaleIn {
                from {
                    transform: scale(0.9);
                    opacity: 0;
                }
                to {
                    transform: scale(1);
                    opacity: 1;
                }
            }

            /* Mobile Optimization */
            @media (max-width: 640px) {
                #toast-container {
                    top: 10px;
                    right: 10px;
                    left: 10px;
                    max-width: 100%;
                }

                .toast {
                    min-width: 100%;
                    max-width: 100%;
                }

                .modal-dialog {
                    margin: 0;
                    max-height: 90vh;
                    border-radius: 12px;
                }

                .modal-body {
                    max-height: 50vh;
                }

                .modal-footer {
                    flex-direction: column-reverse;
                }

                .modal-button {
                    width: 100%;
                }
            }

            /* Touch-friendly tap targets */
            @media (hover: none) and (pointer: coarse) {
                .toast-close,
                .modal-button {
                    min-height: 44px;
                    min-width: 44px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {string} type - 'success', 'error', 'warning', or 'info'
     * @param {number} duration - Auto-dismiss after milliseconds (0 = no auto-dismiss)
     */
    toast(message, type = 'info', duration = 4000) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${icons[type]}</div>
            <div class="toast-content">${message}</div>
            <button class="toast-close" aria-label="Close">×</button>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.dismissToast(toast));

        this.container.appendChild(toast);

        if (duration > 0) {
            setTimeout(() => this.dismissToast(toast), duration);
        }

        return toast;
    }

    dismissToast(toast) {
        toast.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    /**
     * Show a confirmation dialog (replaces confirm())
     * @param {string} message - Message to display
     * @param {object} options - Configuration options
     * @returns {Promise<boolean>} - Resolves to true if confirmed, false if canceled
     */
    confirm(message, options = {}) {
        return new Promise((resolve) => {
            const {
                title = 'Confirm Action',
                confirmText = 'Confirm',
                cancelText = 'Cancel',
                danger = false
            } = options;

            const overlay = this.createModal({
                title,
                message,
                buttons: [
                    {
                        text: cancelText,
                        className: 'secondary',
                        onClick: () => {
                            this.closeModal(overlay);
                            resolve(false);
                        }
                    },
                    {
                        text: confirmText,
                        className: danger ? 'danger' : 'primary',
                        onClick: () => {
                            this.closeModal(overlay);
                            resolve(true);
                        }
                    }
                ]
            });
        });
    }

    /**
     * Show an alert dialog (replaces alert())
     * @param {string} message - Message to display
     * @param {object} options - Configuration options
     * @returns {Promise<void>}
     */
    alert(message, options = {}) {
        return new Promise((resolve) => {
            const {
                title = 'Notice',
                buttonText = 'OK'
            } = options;

            const overlay = this.createModal({
                title,
                message,
                buttons: [
                    {
                        text: buttonText,
                        className: 'primary',
                        onClick: () => {
                            this.closeModal(overlay);
                            resolve();
                        }
                    }
                ]
            });
        });
    }

    /**
     * Create a modal dialog
     * @private
     */
    createModal({ title, message, buttons }) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog';

        dialog.innerHTML = `
            <div class="modal-header">
                <h2 class="modal-title">${title}</h2>
            </div>
            <div class="modal-body">${message}</div>
            <div class="modal-footer"></div>
        `;

        const footer = dialog.querySelector('.modal-footer');
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = `modal-button ${btn.className}`;
            button.textContent = btn.text;
            button.addEventListener('click', btn.onClick);
            footer.appendChild(button);
        });

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Close on overlay click (but not dialog click)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                const cancelBtn = buttons.find(b => b.className === 'secondary');
                if (cancelBtn) cancelBtn.onClick();
            }
        });

        // Focus first button
        setTimeout(() => {
            const firstButton = footer.querySelector('.modal-button');
            if (firstButton) firstButton.focus();
        }, 100);

        this.activeModals.push(overlay);
        return overlay;
    }

    /**
     * Close a modal
     * @private
     */
    closeModal(overlay) {
        overlay.style.animation = 'fadeIn 0.2s ease-out reverse';
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            const index = this.activeModals.indexOf(overlay);
            if (index > -1) {
                this.activeModals.splice(index, 1);
            }
        }, 200);
    }

    // Convenience methods
    success(message, duration) {
        return this.toast(message, 'success', duration);
    }

    error(message, duration) {
        return this.toast(message, 'error', duration);
    }

    warning(message, duration) {
        return this.toast(message, 'warning', duration);
    }

    info(message, duration) {
        return this.toast(message, 'info', duration);
    }
}

// Create global instance
window.notify = new NotificationSystem();

// Override native functions (optional - can be enabled for legacy code)
window.enableNotificationOverrides = function() {
    window.alert = (msg) => window.notify.alert(msg);
    window.confirm = (msg) => window.notify.confirm(msg);
    console.log('[NotificationSystem] Native alert/confirm overridden');
};
