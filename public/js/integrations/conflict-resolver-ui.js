/**
 * Conflict Resolver UI - Interactive conflict resolution interface
 * Project Conductor - Priority 6: Jira Integration
 *
 * Features:
 * - Load conflict list
 * - Display side-by-side diff (3 columns: base, local, remote)
 * - Handle resolution actions (keep local, keep remote, merge, manual edit)
 * - Update UI after resolution
 * - WebSocket integration for real-time updates
 * - Keyboard shortcuts
 * - Undo resolution (5 minute window)
 * - Conflict resolution history
 *
 * @version 1.0.0
 */

class ConflictResolverUI {
  constructor(options = {}) {
    this.baseURL = options.baseURL || '/api/v1/integrations/jira';
    this.onConflictResolved = options.onConflictResolved || (() => {});
    this.onError = options.onError || ((error) => console.error(error));
    this.conflicts = [];
    this.currentConflictId = null;
    this.socket = null;
    this.resolutionHistory = [];
    this.undoTimeout = 5 * 60 * 1000; // 5 minutes

    this.initializeKeyboardShortcuts();
  }

  /**
   * Load all conflicts
   */
  async loadConflicts(filters = {}) {
    try {
      const params = new URLSearchParams(filters);
      const response = await fetch(`${this.baseURL}/conflicts?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.conflicts = data.conflicts || [];
      return this.conflicts;
    } catch (error) {
      console.error('Error loading conflicts:', error);
      this.onError(error);
      throw error;
    }
  }

  /**
   * Get conflict by ID
   */
  getConflictById(conflictId) {
    return this.conflicts.find(c => c.id === conflictId);
  }

  /**
   * Show resolution modal
   */
  async showResolutionModal(conflictId) {
    try {
      this.currentConflictId = conflictId;

      // Load full conflict details
      const conflict = await this.loadConflictDetails(conflictId);

      // Create modal
      const modal = this.createResolutionModal(conflict);

      // Add to DOM
      const modalContainer = document.getElementById('resolution-modal') || this.createModalContainer();
      modalContainer.innerHTML = '';
      modalContainer.appendChild(modal);

      // Show modal
      modal.style.display = 'flex';

      // Focus on modal
      const firstButton = modal.querySelector('button');
      if (firstButton) {
        firstButton.focus();
      }
    } catch (error) {
      console.error('Error showing resolution modal:', error);
      this.onError(error);
    }
  }

  /**
   * Create modal container if it doesn't exist
   */
  createModalContainer() {
    const container = document.createElement('div');
    container.id = 'resolution-modal';
    document.body.appendChild(container);
    return container;
  }

  /**
   * Load conflict details
   */
  async loadConflictDetails(conflictId) {
    try {
      const response = await fetch(`${this.baseURL}/conflicts/${conflictId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.conflict;
    } catch (error) {
      console.error('Error loading conflict details:', error);
      throw error;
    }
  }

  /**
   * Create resolution modal
   */
  createResolutionModal(conflict) {
    const modal = document.createElement('div');
    modal.className = 'conflict-resolution-modal';
    modal.innerHTML = `
      <style>
        .conflict-resolution-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .conflict-resolution-content {
          background: white;
          border-radius: 12px;
          max-width: 1400px;
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .modal-header {
          padding: 25px 30px;
          border-bottom: 2px solid #e9ecef;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-title {
          font-size: 24px;
          font-weight: 700;
          color: #2c3e50;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 28px;
          color: #6c757d;
          cursor: pointer;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.3s ease;
        }

        .modal-close:hover {
          background: #f8f9fa;
          color: #2c3e50;
        }

        .modal-body {
          padding: 30px;
          overflow-y: auto;
          flex: 1;
        }

        .conflict-info {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 25px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .info-label {
          font-size: 12px;
          color: #6c757d;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .info-value {
          font-size: 16px;
          color: #2c3e50;
          font-weight: 500;
        }

        .diff-container {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
          margin-bottom: 25px;
        }

        .diff-column {
          background: white;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          overflow: hidden;
        }

        .diff-column-header {
          padding: 15px 20px;
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #e9ecef;
        }

        .diff-column-header.base {
          background: #f8f9fa;
          color: #6c757d;
        }

        .diff-column-header.local {
          background: #e6f2ff;
          color: #0052cc;
        }

        .diff-column-header.remote {
          background: #e6ffe6;
          color: #28a745;
        }

        .diff-column-content {
          padding: 20px;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          line-height: 1.6;
          max-height: 400px;
          overflow-y: auto;
          background: white;
        }

        .diff-highlight {
          padding: 2px 4px;
          border-radius: 3px;
        }

        .diff-added {
          background: #d4edda;
          color: #155724;
        }

        .diff-removed {
          background: #f8d7da;
          color: #721c24;
        }

        .diff-modified {
          background: #fff3cd;
          color: #856404;
        }

        .diff-metadata {
          padding: 15px 20px;
          border-top: 1px solid #e9ecef;
          font-size: 12px;
          color: #6c757d;
          background: #f8f9fa;
        }

        .manual-edit-section {
          background: #fff3cd;
          border: 2px solid #ffc107;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 25px;
          display: none;
        }

        .manual-edit-section.active {
          display: block;
        }

        .manual-edit-label {
          font-size: 14px;
          font-weight: 600;
          color: #856404;
          margin-bottom: 10px;
        }

        .manual-edit-textarea {
          width: 100%;
          min-height: 200px;
          padding: 15px;
          border: 2px solid #ffc107;
          border-radius: 6px;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          resize: vertical;
        }

        .modal-footer {
          padding: 20px 30px;
          border-top: 2px solid #e9ecef;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .resolution-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .btn-primary {
          background: #0052cc;
          color: white;
        }

        .btn-primary:hover {
          background: #0747a6;
        }

        .btn-success {
          background: #28a745;
          color: white;
        }

        .btn-success:hover {
          background: #218838;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn-danger:hover {
          background: #c82333;
        }

        .btn-warning {
          background: #ffc107;
          color: #856404;
        }

        .btn-warning:hover {
          background: #e0a800;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background: #545b62;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .keyboard-hint {
          font-size: 12px;
          color: #6c757d;
          font-style: italic;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .diff-container {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .conflict-resolution-modal {
            padding: 0;
          }

          .conflict-resolution-content {
            max-height: 100vh;
            border-radius: 0;
          }

          .modal-header {
            padding: 20px;
          }

          .modal-title {
            font-size: 20px;
          }

          .modal-body {
            padding: 20px;
          }

          .resolution-actions {
            flex-direction: column;
          }

          .btn {
            width: 100%;
            justify-content: center;
          }
        }
      </style>

      <div class="conflict-resolution-content">
        <div class="modal-header">
          <h2 class="modal-title">Resolve Conflict: ${this.escapeHtml(conflict.requirementTitle)}</h2>
          <button class="modal-close" onclick="this.closest('.conflict-resolution-modal').remove()">×</button>
        </div>

        <div class="modal-body">
          <!-- Conflict Info -->
          <div class="conflict-info">
            <div class="info-item">
              <span class="info-label">Field</span>
              <span class="info-value">${this.escapeHtml(conflict.field)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Severity</span>
              <span class="info-value">${this.escapeHtml(conflict.severity)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Local ID</span>
              <span class="info-value">${this.escapeHtml(conflict.localId)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Jira Key</span>
              <span class="info-value">${this.escapeHtml(conflict.jiraKey)}</span>
            </div>
          </div>

          <!-- Diff View -->
          <div class="diff-container">
            <!-- Base Column -->
            <div class="diff-column">
              <div class="diff-column-header base">Base (Original)</div>
              <div class="diff-column-content">
                ${this.escapeHtml(conflict.baseValue || '-')}
              </div>
              <div class="diff-metadata">
                ${conflict.baseAuthor || 'Unknown'} • ${this.formatDate(conflict.baseTimestamp)}
              </div>
            </div>

            <!-- Local Column -->
            <div class="diff-column">
              <div class="diff-column-header local">Local (Conductor)</div>
              <div class="diff-column-content">
                ${this.highlightDiff(conflict.baseValue, conflict.localValue, 'local')}
              </div>
              <div class="diff-metadata">
                ${conflict.localAuthor || 'Unknown'} • ${this.formatDate(conflict.localTimestamp)}
              </div>
            </div>

            <!-- Remote Column -->
            <div class="diff-column">
              <div class="diff-column-header remote">Remote (Jira)</div>
              <div class="diff-column-content">
                ${this.highlightDiff(conflict.baseValue, conflict.remoteValue, 'remote')}
              </div>
              <div class="diff-metadata">
                ${conflict.remoteAuthor || 'Unknown'} • ${this.formatDate(conflict.remoteTimestamp)}
              </div>
            </div>
          </div>

          <!-- Manual Edit Section -->
          <div class="manual-edit-section" id="manual-edit-section">
            <div class="manual-edit-label">Manual Resolution</div>
            <textarea class="manual-edit-textarea" id="manual-edit-value">${this.escapeHtml(conflict.localValue || '')}</textarea>
          </div>
        </div>

        <div class="modal-footer">
          <span class="keyboard-hint">Keyboard: ← Keep Local | → Keep Remote | ↵ Confirm</span>
          <div class="resolution-actions">
            <button class="btn btn-primary" onclick="window.conflictResolver.resolveConflict('${conflict.id}', 'keep-local')">
              Keep Local
            </button>
            <button class="btn btn-success" onclick="window.conflictResolver.resolveConflict('${conflict.id}', 'keep-remote')">
              Keep Remote
            </button>
            <button class="btn btn-warning" onclick="window.conflictResolver.toggleManualEdit('${conflict.id}')">
              Edit Manually
            </button>
            <button class="btn btn-secondary" onclick="this.closest('.conflict-resolution-modal').remove()">
              Cancel
            </button>
          </div>
        </div>
      </div>
    `;

    return modal;
  }

  /**
   * Toggle manual edit mode
   */
  toggleManualEdit(conflictId) {
    const section = document.getElementById('manual-edit-section');
    if (section) {
      section.classList.toggle('active');

      if (section.classList.contains('active')) {
        const textarea = document.getElementById('manual-edit-value');
        if (textarea) {
          textarea.focus();
        }

        // Update button text
        const btn = event.target;
        btn.textContent = 'Apply Manual Edit';
        btn.onclick = () => {
          const value = document.getElementById('manual-edit-value').value;
          this.resolveConflict(conflictId, 'manual', value);
        };
      }
    }
  }

  /**
   * Resolve conflict
   */
  async resolveConflict(conflictId, strategy, manualValue = null) {
    try {
      const resolution = {
        strategy: strategy,
        manualValue: manualValue
      };

      const response = await fetch(`${this.baseURL}/conflicts/${conflictId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(resolution)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Add to resolution history for undo
        this.addToResolutionHistory(conflictId, resolution, data.previousValue);

        // Close modal
        const modal = document.querySelector('.conflict-resolution-modal');
        if (modal) {
          modal.remove();
        }

        // Trigger callback
        this.onConflictResolved(conflictId, resolution);

        return data;
      } else {
        throw new Error(data.error || 'Failed to resolve conflict');
      }
    } catch (error) {
      console.error('Error resolving conflict:', error);
      this.onError(error);
      throw error;
    }
  }

  /**
   * Add to resolution history for undo
   */
  addToResolutionHistory(conflictId, resolution, previousValue) {
    const historyItem = {
      conflictId,
      resolution,
      previousValue,
      timestamp: Date.now()
    };

    this.resolutionHistory.push(historyItem);

    // Schedule removal after undo timeout
    setTimeout(() => {
      const index = this.resolutionHistory.indexOf(historyItem);
      if (index > -1) {
        this.resolutionHistory.splice(index, 1);
      }
    }, this.undoTimeout);
  }

  /**
   * Undo last resolution
   */
  async undoResolution(conflictId) {
    const historyItem = this.resolutionHistory.find(h => h.conflictId === conflictId);

    if (!historyItem) {
      throw new Error('Cannot undo: resolution history not found or expired');
    }

    try {
      const response = await fetch(`${this.baseURL}/conflicts/${conflictId}/undo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          previousValue: historyItem.previousValue
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Remove from history
        const index = this.resolutionHistory.indexOf(historyItem);
        if (index > -1) {
          this.resolutionHistory.splice(index, 1);
        }

        return data;
      } else {
        throw new Error(data.error || 'Failed to undo resolution');
      }
    } catch (error) {
      console.error('Error undoing resolution:', error);
      throw error;
    }
  }

  /**
   * Resolve all conflicts with default strategy
   */
  async resolveAllConflicts(strategy = 'keep-local') {
    try {
      const response = await fetch(`${this.baseURL}/conflicts/resolve-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ strategy })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        return data;
      } else {
        throw new Error(data.error || 'Failed to resolve all conflicts');
      }
    } catch (error) {
      console.error('Error resolving all conflicts:', error);
      throw error;
    }
  }

  /**
   * Connect to WebSocket for real-time conflict updates
   */
  connectWebSocket(callback) {
    try {
      // Determine WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}`;

      this.socket = io(wsUrl, {
        path: '/socket.io',
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
      });

      this.socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
      });

      // Listen for conflict events
      this.socket.on('conflict:created', (data) => {
        callback({ type: 'conflict:created', data });
      });

      this.socket.on('conflict:updated', (data) => {
        callback({ type: 'conflict:updated', data });
      });

      this.socket.on('conflict:resolved', (data) => {
        callback({ type: 'conflict:resolved', data });
      });
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.onError(error);
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnectWebSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Initialize keyboard shortcuts
   */
  initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      if (!this.currentConflictId) {
        return;
      }

      // Check if modal is open
      const modal = document.querySelector('.conflict-resolution-modal');
      if (!modal) {
        return;
      }

      // Check if manual edit is active
      const manualEdit = document.getElementById('manual-edit-section');
      if (manualEdit && manualEdit.classList.contains('active')) {
        return; // Don't intercept keyboard in manual edit mode
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          this.resolveConflict(this.currentConflictId, 'keep-local');
          break;
        case 'ArrowRight':
          event.preventDefault();
          this.resolveConflict(this.currentConflictId, 'keep-remote');
          break;
        case 'Escape':
          event.preventDefault();
          modal.remove();
          this.currentConflictId = null;
          break;
      }
    });
  }

  /**
   * Highlight differences between base and new value
   */
  highlightDiff(baseValue, newValue, type) {
    if (!baseValue || !newValue) {
      return this.escapeHtml(newValue || '-');
    }

    // Simple word-based diff
    const baseWords = baseValue.split(/\s+/);
    const newWords = newValue.split(/\s+/);

    let result = [];

    for (let i = 0; i < Math.max(baseWords.length, newWords.length); i++) {
      const baseWord = baseWords[i];
      const newWord = newWords[i];

      if (baseWord === newWord) {
        result.push(this.escapeHtml(newWord || ''));
      } else if (!baseWord) {
        result.push(`<span class="diff-highlight diff-added">${this.escapeHtml(newWord)}</span>`);
      } else if (!newWord) {
        result.push(`<span class="diff-highlight diff-removed">${this.escapeHtml(baseWord)}</span>`);
      } else {
        result.push(`<span class="diff-highlight diff-modified">${this.escapeHtml(newWord)}</span>`);
      }
    }

    return result.join(' ');
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Format date
   */
  formatDate(date) {
    if (!date) return 'Unknown';

    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

    return d.toLocaleDateString();
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.disconnectWebSocket();
    this.resolutionHistory = [];
  }
}

// Make available globally for inline onclick handlers
window.conflictResolver = null;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  if (!window.conflictResolver && typeof ConflictResolverUI !== 'undefined') {
    window.conflictResolver = new ConflictResolverUI();
  }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConflictResolverUI;
}
