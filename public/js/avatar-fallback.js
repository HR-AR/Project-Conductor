/**
 * Avatar Fallback System
 * Generates initials-based colored avatars (like Gmail)
 * Replaces external avatar URLs blocked by CSP
 */

class AvatarFallback {
  constructor() {
    this.colors = [
      '#667eea', // Primary purple
      '#764ba2', // Secondary purple
      '#3b82f6', // Blue
      '#22c55e', // Green
      '#f59e0b', // Orange
      '#ef4444', // Red
      '#8b5cf6', // Violet
      '#ec4899', // Pink
      '#14b8a6', // Teal
      '#f97316', // Dark orange
      '#06b6d4', // Cyan
      '#84cc16', // Lime
    ];
  }

  /**
   * Get initials from name
   * @param {string} name - User name
   * @returns {string} Initials (1-2 chars)
   */
  getInitials(name) {
    if (!name) return '?';

    const parts = name.trim().split(/\s+/);

    if (parts.length === 1) {
      // Single word: take first 2 chars
      return parts[0].substring(0, 2).toUpperCase();
    }

    // Multiple words: take first char of first 2 words
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  /**
   * Get consistent color for a name (hash-based)
   * @param {string} name - User name
   * @returns {string} Hex color
   */
  getColor(name) {
    if (!name) return this.colors[0];

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % this.colors.length;
    return this.colors[index];
  }

  /**
   * Get contrasting text color for background
   * @param {string} bgColor - Background color (hex)
   * @returns {string} 'white' or 'black'
   */
  getTextColor(bgColor) {
    // Convert hex to RGB
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.5 ? '#1e293b' : '#ffffff';
  }

  /**
   * Create avatar element
   * @param {string} name - User name
   * @param {object} options - Avatar options
   * @returns {HTMLElement} Avatar element
   */
  create(name, options = {}) {
    const {
      size = 40,
      className = '',
      style = {}
    } = options;

    const initials = this.getInitials(name);
    const bgColor = this.getColor(name);
    const textColor = this.getTextColor(bgColor);

    const avatar = document.createElement('div');
    avatar.className = `avatar-fallback ${className}`;
    avatar.setAttribute('aria-label', `Avatar for ${name}`);
    avatar.setAttribute('title', name);
    avatar.textContent = initials;

    // Apply styles
    Object.assign(avatar.style, {
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      backgroundColor: bgColor,
      color: textColor,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '600',
      fontSize: `${size * 0.4}px`,
      flexShrink: '0',
      userSelect: 'none',
      ...style
    });

    return avatar;
  }

  /**
   * Create SVG data URL for avatar (can be used as img src)
   * @param {string} name - User name
   * @param {number} size - Avatar size
   * @returns {string} Data URL
   */
  createDataUrl(name, size = 40) {
    const initials = this.getInitials(name);
    const bgColor = this.getColor(name);
    const textColor = this.getTextColor(bgColor);

    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="${bgColor}"/>
        <text
          x="50%"
          y="50%"
          dominant-baseline="middle"
          text-anchor="middle"
          font-family="system-ui, -apple-system, sans-serif"
          font-size="${size * 0.4}px"
          font-weight="600"
          fill="${textColor}"
        >${initials}</text>
      </svg>
    `;

    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  /**
   * Replace all external avatar images with fallback
   * @param {string} selector - CSS selector for avatar images
   */
  replaceAll(selector = 'img[src*="pravatar"], img[src*="avatar"]') {
    const images = document.querySelectorAll(selector);

    images.forEach(img => {
      // Get user name from alt text or data attribute
      const name = img.alt || img.dataset.userName || 'User';
      const size = parseInt(img.width || img.height || 40);

      // Create fallback avatar
      const avatar = this.create(name, {
        size,
        className: img.className
      });

      // Copy any data attributes
      Array.from(img.attributes).forEach(attr => {
        if (attr.name.startsWith('data-')) {
          avatar.setAttribute(attr.name, attr.value);
        }
      });

      // Replace image with avatar
      img.parentNode.replaceChild(avatar, img);
    });
  }

  /**
   * Add error handler to replace broken images
   */
  initErrorHandling() {
    // Handle existing images
    this.replaceAll();

    // Handle future images
    document.addEventListener('error', (e) => {
      if (e.target.tagName === 'IMG' && e.target.classList.contains('user-avatar')) {
        const name = e.target.alt || e.target.dataset.userName || 'User';
        const size = parseInt(e.target.width || e.target.height || 40);

        const avatar = this.create(name, {
          size,
          className: e.target.className
        });

        e.target.parentNode.replaceChild(avatar, e.target);
      }
    }, true);
  }

  /**
   * Get avatar as inline style (for background-image)
   * @param {string} name - User name
   * @param {number} size - Avatar size
   * @returns {string} Background-image CSS value
   */
  getBackgroundImage(name, size = 40) {
    return `url("${this.createDataUrl(name, size)}")`;
  }
}

// Create global instance
window.avatarFallback = new AvatarFallback();

// Auto-initialize on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.avatarFallback.initErrorHandling();
  });
} else {
  window.avatarFallback.initErrorHandling();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AvatarFallback;
}
