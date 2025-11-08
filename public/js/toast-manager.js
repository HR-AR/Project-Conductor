/**
 * Toast Notification Manager
 * Elegant, non-blocking toast notifications
 * Replaces browser alert() with better UX
 */

class ToastManager {
  constructor() {
    this.container = null;
    this.toasts = new Map();
    this.toastCounter = 0;
    this.init();
  }

  /**
   * Initialize toast container
   */
  init() {
    // Create container if it doesn't exist
    if (!document.querySelector('.toast-container')) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      this.container.setAttribute('role', 'status');
      this.container.setAttribute('aria-live', 'polite');
      this.container.setAttribute('aria-atomic', 'false');
      document.body.appendChild(this.container);
    } else {
      this.container = document.querySelector('.toast-container');
    }
  }

  /**
   * Show a toast notification
   * @param {string} message - Toast message
   * @param {object} options - Toast options
   * @returns {string} Toast ID
   */
  show(message, options = {}) {
    const {
      type = 'info', // 'success', 'error', 'warning', 'info'
      title = this.getDefaultTitle(type),
      duration = 3000, // Auto-dismiss after 3 seconds
      closable = true,
      icon = this.getIcon(type)
    } = options;

    const toastId = `toast-${++this.toastCounter}`;

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.id = toastId;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    // Build toast HTML
    toast.innerHTML = `
      <div class="toast-icon" aria-hidden="true">${icon}</div>
      <div class="toast-content">
        <div class="toast-title">${this.escapeHtml(title)}</div>
        <div class="toast-message">${this.escapeHtml(message)}</div>
      </div>
      ${closable ? '<button class="toast-close" aria-label="Close notification">&times;</button>' : ''}
      ${duration > 0 ? '<div class="toast-progress" aria-hidden="true"></div>' : ''}
    `;

    // Add to container
    this.container.appendChild(toast);

    // Track toast
    this.toasts.set(toastId, {
      element: toast,
      timeout: null
    });

    // Close button handler
    if (closable) {
      const closeBtn = toast.querySelector('.toast-close');
      closeBtn.addEventListener('click', () => this.dismiss(toastId));
    }

    // Auto-dismiss
    if (duration > 0) {
      const timeout = setTimeout(() => {
        this.dismiss(toastId);
      }, duration);

      this.toasts.get(toastId).timeout = timeout;

      // Pause on hover
      toast.addEventListener('mouseenter', () => {
        clearTimeout(this.toasts.get(toastId).timeout);
      });

      toast.addEventListener('mouseleave', () => {
        const timeout = setTimeout(() => {
          this.dismiss(toastId);
        }, 1000); // Dismiss 1s after mouse leaves
        this.toasts.get(toastId).timeout = timeout;
      });
    }

    return toastId;
  }

  /**
   * Dismiss a toast
   * @param {string} toastId - Toast ID
   */
  dismiss(toastId) {
    const toastData = this.toasts.get(toastId);
    if (!toastData) return;

    const { element, timeout } = toastData;

    // Clear timeout
    if (timeout) {
      clearTimeout(timeout);
    }

    // Add exit animation
    element.classList.add('toast-exiting');

    // Remove after animation
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      this.toasts.delete(toastId);
    }, 300);
  }

  /**
   * Dismiss all toasts
   */
  dismissAll() {
    this.toasts.forEach((_, toastId) => {
      this.dismiss(toastId);
    });
  }

  /**
   * Shorthand methods
   */
  success(message, options = {}) {
    return this.show(message, { ...options, type: 'success' });
  }

  error(message, options = {}) {
    return this.show(message, { ...options, type: 'error' });
  }

  warning(message, options = {}) {
    return this.show(message, { ...options, type: 'warning' });
  }

  info(message, options = {}) {
    return this.show(message, { ...options, type: 'info' });
  }

  /**
   * Get default title for toast type
   * @param {string} type - Toast type
   * @returns {string} Default title
   */
  getDefaultTitle(type) {
    const titles = {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Info'
    };
    return titles[type] || 'Notification';
  }

  /**
   * Get icon for toast type
   * @param {string} type - Toast type
   * @returns {string} Icon HTML
   */
  getIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || 'ℹ';
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Create global instance
window.toast = new ToastManager();

// Override alert() to use toast (optional, can be enabled)
window.toastifyAlerts = function() {
  window.alert = function(message) {
    window.toast.info(message, { title: 'Alert' });
  };
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ToastManager;
}
