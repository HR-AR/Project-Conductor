/**
 * Project Conductor - WebSocket Client Library
 * Real-time collaboration via Socket.io
 */

class WebSocketClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.eventHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.currentUser = null;
  }

  /**
   * Connect to WebSocket server
   */
  connect(userId, username) {
    if (typeof io === 'undefined') {
      console.error('[WebSocket] Socket.io library not loaded');
      return;
    }

    this.currentUser = { userId, username };

    console.log('[WebSocket] Connecting...', { userId, username });

    this.socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts
    });

    this._setupDefaultListeners();
    this._initializeUser();
  }

  /**
   * Setup default Socket.io listeners
   */
  _setupDefaultListeners() {
    this.socket.on('connect', () => {
      this.connected = true;
      this.reconnectAttempts = 0;
      console.log('[WebSocket] Connected');
      this._updateConnectionStatus('connected');

      // Re-initialize user on reconnect
      if (this.currentUser) {
        this._initializeUser();
      }
    });

    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      console.log('[WebSocket] Disconnected:', reason);
      this._updateConnectionStatus('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this._updateConnectionStatus('error');
      }
    });

    // Presence events
    this.socket.on('presence:initialized', (data) => {
      console.log('[WebSocket] User initialized:', data);
      this._trigger('presence:initialized', data);
    });

    this.socket.on('presence:list', (data) => {
      this._trigger('presence:list', data);
    });

    this.socket.on('presence:user-joined', (data) => {
      console.log('[WebSocket] User joined:', data.user.username);
      this._trigger('presence:user-joined', data);
    });

    this.socket.on('presence:user-left', (data) => {
      console.log('[WebSocket] User left:', data.user.username);
      this._trigger('presence:user-left', data);
    });

    this.socket.on('presence:editing-start', (data) => {
      this._trigger('presence:editing-start', data);
    });

    this.socket.on('presence:editing-stop', (data) => {
      this._trigger('presence:editing-stop', data);
    });

    this.socket.on('presence:status-change', (data) => {
      this._trigger('presence:status-change', data);
    });

    // Comment events
    this.socket.on('comment:created', (data) => {
      console.log('[WebSocket] Comment created');
      this._trigger('comment:created', data);
    });

    this.socket.on('comment:updated', (data) => {
      this._trigger('comment:updated', data);
    });

    this.socket.on('comment:deleted', (data) => {
      this._trigger('comment:deleted', data);
    });

    // Requirement events
    this.socket.on('requirement:comment-added', (data) => {
      this._trigger('requirement:comment-added', data);
    });

    this.socket.on('requirement:field-changed', (data) => {
      console.log('[WebSocket] Field changed:', data.field);
      this._trigger('requirement:field-changed', data);
    });

    this.socket.on('requirement:cursor-updated', (data) => {
      this._trigger('requirement:cursor-updated', data);
    });

    this.socket.on('requirement:selection-updated', (data) => {
      this._trigger('requirement:selection-updated', data);
    });
  }

  /**
   * Initialize user presence
   */
  _initializeUser() {
    if (!this.currentUser) return;

    this.socket.emit('user:initialize', {
      userId: this.currentUser.userId,
      username: this.currentUser.username
    });
  }

  /**
   * Register event handler
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  /**
   * Unregister event handler
   */
  off(event, handler) {
    if (!this.eventHandlers.has(event)) return;

    const handlers = this.eventHandlers.get(event);
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Trigger event handlers
   */
  _trigger(event, data) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`[WebSocket] Error in ${event} handler:`, error);
      }
    });
  }

  /**
   * Join requirement room
   */
  joinRequirement(requirementId, userId, username) {
    if (!this.connected) {
      console.warn('[WebSocket] Not connected, cannot join requirement');
      return;
    }

    console.log('[WebSocket] Joining requirement:', requirementId);
    this.socket.emit('join-requirement', { requirementId, userId, username });
  }

  /**
   * Leave requirement room
   */
  leaveRequirement(requirementId) {
    if (!this.connected) return;

    console.log('[WebSocket] Leaving requirement:', requirementId);
    this.socket.emit('leave-requirement', requirementId);
  }

  /**
   * Start editing notification
   */
  startEditing(requirementId, userId) {
    if (!this.connected) return;

    this.socket.emit('editing:start', { requirementId, userId });
  }

  /**
   * Stop editing notification
   */
  stopEditing(requirementId, userId) {
    if (!this.connected) return;

    this.socket.emit('editing:stop', { requirementId, userId });
  }

  /**
   * Update user status
   */
  updateStatus(userId, status) {
    if (!this.connected) return;

    this.socket.emit('status:update', { userId, status });
  }

  /**
   * Get presence list for requirement
   */
  getPresence(requirementId) {
    if (!this.connected) return;

    this.socket.emit('presence:get', requirementId);
  }

  /**
   * Broadcast field change
   */
  broadcastFieldChange(requirementId, field, value, userId, username) {
    if (!this.connected) return;

    this.socket.emit('requirement:field-change', {
      requirementId,
      field,
      value,
      userId,
      username
    });
  }

  /**
   * Broadcast cursor position
   */
  broadcastCursor(requirementId, field, position, userId, username) {
    if (!this.connected) return;

    this.socket.emit('requirement:cursor', {
      requirementId,
      field,
      position,
      userId,
      username
    });
  }

  /**
   * Broadcast selection
   */
  broadcastSelection(requirementId, field, start, end, userId, username) {
    if (!this.connected) return;

    this.socket.emit('requirement:selection', {
      requirementId,
      field,
      start,
      end,
      userId,
      username
    });
  }

  /**
   * Send comment
   */
  sendComment(requirementId, comment, userId, username) {
    if (!this.connected) return;

    this.socket.emit('requirement:comment', {
      requirementId,
      comment,
      userId,
      username
    });
  }

  /**
   * Update connection status indicator
   */
  _updateConnectionStatus(status) {
    const indicator = document.querySelector('.websocket-status');
    if (indicator) {
      indicator.className = 'websocket-status ' + status;

      const text = indicator.querySelector('.status-text');
      if (text) {
        text.textContent = status === 'connected' ? 'Live' :
                          status === 'disconnected' ? 'Reconnecting...' :
                          'Offline';
      }
    }

    // Update global status
    document.dispatchEvent(new CustomEvent('websocket:status', {
      detail: { status, connected: this.connected }
    }));
  }

  /**
   * Disconnect
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      console.log('[WebSocket] Disconnected manually');
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected;
  }
}

// Utility: Debounce function for reducing WebSocket spam
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Global instance
const ws = new WebSocketClient();

// Auto-connect on page load with demo user
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const userId = 'user-' + Math.random().toString(36).substr(2, 9);
    const username = localStorage.getItem('demo-username') || 'Demo User';

    // Only auto-connect if Socket.io is available
    if (typeof io !== 'undefined') {
      ws.connect(userId, username);
    }
  });
} else {
  // Already loaded
  const userId = 'user-' + Math.random().toString(36).substr(2, 9);
  const username = localStorage.getItem('demo-username') || 'Demo User';

  if (typeof io !== 'undefined') {
    ws.connect(userId, username);
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WebSocketClient, ws, debounce };
}
