/**
 * Conflict Handler Manager
 * Project Conductor - Phase 1, Priority 1, Component 1.4
 *
 * Manages conflict detection alerts and automatic navigation to Module 5 (Alignment)
 * for the investor demo "Killer Demo" story.
 *
 * Features:
 * - Real-time conflict detection via WebSocket
 * - Prominent, non-dismissible conflict modal
 * - Workflow progress tracker paused state
 * - Auto-navigation to Module 5 (Alignment)
 * - Conflict resolution workflow
 * - Integration with Activity Feed
 * - Resume workflow after resolution
 *
 * Demo Flow:
 * 1. User viewing Module 2/3/4
 * 2. Security Agent detects vulnerability
 * 3. Conflict modal appears (user gasps)
 * 4. Progress tracker turns red with pause icon
 * 5. User clicks "Resolve Now"
 * 6. Dashboard navigates to Module 5
 * 7. User resolves conflict
 * 8. Workflow resumes automatically
 */

class ConflictHandler {
  constructor(options = {}) {
    this.socket = options.socket || null;
    this.navigationCallback = options.navigationCallback || null;
    this.activityFeed = options.activityFeed || null;

    this.currentConflict = null;
    this.conflictQueue = [];
    this.isModalVisible = false;
    this.workflowPaused = false;

    // Severity configuration
    this.severityConfig = {
      critical: {
        color: '#dc3545',
        gradient: 'linear-gradient(135deg, #dc3545, #c82333)',
        icon: '🚨',
        label: 'CRITICAL'
      },
      high: {
        color: '#fd7e14',
        gradient: 'linear-gradient(135deg, #fd7e14, #e8590c)',
        icon: '⚠️',
        label: 'HIGH'
      },
      medium: {
        color: '#ffc107',
        gradient: 'linear-gradient(135deg, #ffc107, #e0a800)',
        icon: '⚡',
        label: 'MEDIUM'
      },
      low: {
        color: '#17a2b8',
        gradient: 'linear-gradient(135deg, #17a2b8, #138496)',
        icon: 'ℹ️',
        label: 'LOW'
      }
    };

    this.init();
  }

  /**
   * Initialize conflict handler
   */
  init() {
    console.log('[ConflictHandler] Initializing...');

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  /**
   * Setup conflict handler
   */
  setup() {
    // Check if modal container exists
    this.modalContainer = document.getElementById('conflictModal');
    if (!this.modalContainer) {
      console.warn('[ConflictHandler] Modal container not found. Creating dynamically...');
      this.createModalContainer();
    }

    // Setup WebSocket listeners
    this.setupWebSocketListeners();

    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();

    console.log('[ConflictHandler] Initialized successfully');
  }

  /**
   * Create modal container if it doesn't exist
   */
  createModalContainer() {
    const modal = document.createElement('div');
    modal.id = 'conflictModal';
    modal.className = 'conflict-modal-overlay';
    modal.innerHTML = `
      <div class="conflict-modal-content">
        <div class="conflict-modal-header">
          <div class="conflict-icon-large" id="conflictIconLarge">🚨</div>
          <h2 id="conflictModalTitle">Workflow Paused - Security Issue Detected</h2>
        </div>
        <div class="conflict-severity-badge" id="conflictSeverityBadge">HIGH SEVERITY</div>
        <div class="conflict-modal-body">
          <div class="conflict-agent-info" id="conflictAgentInfo">
            <span class="conflict-agent-icon">🔒</span>
            <span class="conflict-agent-name">Security Agent</span>
          </div>
          <div class="conflict-title" id="conflictTitle">Security Vulnerability Detected</div>
          <div class="conflict-description" id="conflictDescription">
            <!-- Populated dynamically -->
          </div>
          <div class="conflict-recommendation" id="conflictRecommendation">
            <!-- Populated dynamically -->
          </div>
          <div class="conflict-affected-module" id="conflictAffectedModule">
            <span class="module-icon">⚙️</span>
            <span>Affected Module: Engineering Design</span>
          </div>
        </div>
        <div class="conflict-modal-actions">
          <button class="btn-conflict-primary" id="btnResolveNow" onclick="window.conflictHandler?.navigateToResolution()">
            <span class="btn-icon">→</span> Resolve Now
          </button>
          <button class="btn-conflict-secondary" id="btnViewDetails" onclick="window.conflictHandler?.viewFullDetails()">
            <span class="btn-icon">🔍</span> View Full Context
          </button>
        </div>
        <div class="conflict-modal-footer">
          <div class="conflict-timestamp" id="conflictTimestamp">Just now</div>
          <div class="conflict-workflow-status">
            <span class="status-icon">⏸️</span>
            <span>Workflow Paused - Awaiting Resolution</span>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this.modalContainer = modal;
  }

  /**
   * Setup WebSocket listeners for conflict events
   */
  setupWebSocketListeners() {
    // Check if socket.io is available
    if (this.socket && typeof this.socket.on === 'function') {
      this.socket.on('agent.conflict_detected', (data) => {
        console.log('[ConflictHandler] Conflict detected:', data);
        this.handleConflictDetected(data);
      });

      this.socket.on('workflow.paused', (data) => {
        console.log('[ConflictHandler] Workflow paused:', data);
        this.handleWorkflowPaused(data);
      });

      this.socket.on('workflow.resume', (data) => {
        console.log('[ConflictHandler] Workflow resumed:', data);
        this.handleWorkflowResumed(data);
      });

      console.log('[ConflictHandler] WebSocket listeners registered');
    } else {
      console.warn('[ConflictHandler] Socket.io not available or not connected');
    }

    // Also listen to global socket if available
    if (typeof io !== 'undefined' && !this.socket) {
      try {
        this.socket = io();
        this.setupWebSocketListeners();
      } catch (error) {
        console.error('[ConflictHandler] Failed to connect to socket:', error);
      }
    }
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (!this.isModalVisible) return;

      // Enter key - navigate to resolution
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.navigateToResolution();
      }

      // Escape key is disabled (non-dismissible)
      if (e.key === 'Escape') {
        e.preventDefault();
        console.log('[ConflictHandler] Conflict modal is non-dismissible');
      }

      // D key - view details
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        this.viewFullDetails();
      }
    });
  }

  /**
   * Handle conflict detected event
   */
  handleConflictDetected(data) {
    const conflict = {
      id: data.conflictId || `conflict-${Date.now()}`,
      agentType: data.agentType || 'security',
      severity: data.severity || 'high',
      vulnerability: data.vulnerability || data.title || 'Security Issue',
      description: data.description || data.message || 'A security vulnerability was detected',
      recommendation: data.recommendation || data.solution || 'Please review and resolve',
      affectedModule: data.affectedModule || data.module || 'engineering-design',
      timestamp: data.timestamp || Date.now(),
      context: data.context || {},
      rawData: data
    };

    console.log('[ConflictHandler] Processing conflict:', conflict);

    // Add to queue
    this.conflictQueue.push(conflict);

    // Show modal immediately if not already visible
    if (!this.isModalVisible) {
      this.showConflictModal(conflict);
    }

    // Update progress tracker to paused state
    this.updateProgressTrackerToPaused(conflict);

    // Add to activity feed if available
    if (this.activityFeed && typeof this.activityFeed.addActivity === 'function') {
      this.activityFeed.addActivity({
        agentType: conflict.agentType,
        eventType: 'conflict_detected',
        message: `${conflict.agentType.toUpperCase()}: ${conflict.vulnerability}`,
        severity: conflict.severity,
        timestamp: conflict.timestamp
      });
    }

    // Emit custom event for other components
    this.emitConflictEvent('conflict:detected', conflict);
  }

  /**
   * Handle workflow paused event
   */
  handleWorkflowPaused(data) {
    this.workflowPaused = true;
    console.log('[ConflictHandler] Workflow is now paused');

    // Update UI to show paused state
    this.updateProgressTrackerToPaused(data);
  }

  /**
   * Handle workflow resumed event
   */
  handleWorkflowResumed(data) {
    this.workflowPaused = false;
    console.log('[ConflictHandler] Workflow resumed');

    // Hide modal if visible
    if (this.isModalVisible) {
      this.hideConflictModal();
    }

    // Update progress tracker to normal state
    this.updateProgressTrackerToNormal();

    // Show success toast
    this.showToast('Workflow Resumed', 'success');

    // Add to activity feed
    if (this.activityFeed && typeof this.activityFeed.addActivity === 'function') {
      this.activityFeed.addActivity({
        agentType: 'system',
        eventType: 'completed',
        message: 'Workflow resumed - vulnerability addressed',
        timestamp: Date.now()
      });
    }

    // Emit custom event
    this.emitConflictEvent('workflow:resumed', data);
  }

  /**
   * Show conflict modal
   */
  showConflictModal(conflict) {
    if (!this.modalContainer) {
      console.error('[ConflictHandler] Modal container not found');
      return;
    }

    this.currentConflict = conflict;
    this.isModalVisible = true;

    // Get severity config
    const severityConfig = this.severityConfig[conflict.severity] || this.severityConfig.high;

    // Update modal content
    const iconLarge = document.getElementById('conflictIconLarge');
    const title = document.getElementById('conflictModalTitle');
    const severityBadge = document.getElementById('conflictSeverityBadge');
    const agentInfo = document.getElementById('conflictAgentInfo');
    const conflictTitle = document.getElementById('conflictTitle');
    const description = document.getElementById('conflictDescription');
    const recommendation = document.getElementById('conflictRecommendation');
    const affectedModule = document.getElementById('conflictAffectedModule');
    const timestamp = document.getElementById('conflictTimestamp');

    if (iconLarge) iconLarge.textContent = severityConfig.icon;
    if (title) title.textContent = 'Workflow Paused - Security Issue Detected';
    if (severityBadge) {
      severityBadge.textContent = `${severityConfig.label} SEVERITY`;
      severityBadge.style.background = severityConfig.gradient;
    }

    if (agentInfo) {
      const agentIcon = this.getAgentIcon(conflict.agentType);
      const agentName = this.getAgentName(conflict.agentType);
      agentInfo.innerHTML = `
        <span class="conflict-agent-icon">${agentIcon}</span>
        <span class="conflict-agent-name">${agentName}</span>
      `;
    }

    if (conflictTitle) conflictTitle.textContent = conflict.vulnerability;

    if (description) {
      description.innerHTML = `
        <p>${this.escapeHtml(conflict.description)}</p>
      `;
    }

    if (recommendation && conflict.recommendation) {
      recommendation.innerHTML = `
        <strong>Recommended Solution:</strong>
        <p>${this.escapeHtml(conflict.recommendation)}</p>
      `;
      recommendation.style.display = 'block';
    } else if (recommendation) {
      recommendation.style.display = 'none';
    }

    if (affectedModule) {
      const moduleName = this.getModuleName(conflict.affectedModule);
      affectedModule.innerHTML = `
        <span class="module-icon">⚙️</span>
        <span>Affected Module: ${moduleName}</span>
      `;
    }

    if (timestamp) {
      timestamp.textContent = this.formatTimestamp(conflict.timestamp);
    }

    // Show modal with animation
    this.modalContainer.style.display = 'flex';
    setTimeout(() => {
      this.modalContainer.classList.add('visible');
    }, 10);

    // Play alert sound (optional)
    this.playAlertSound();

    console.log('[ConflictHandler] Modal displayed');
  }

  /**
   * Hide conflict modal
   */
  hideConflictModal() {
    if (!this.modalContainer) return;

    this.modalContainer.classList.remove('visible');
    setTimeout(() => {
      this.modalContainer.style.display = 'none';
      this.isModalVisible = false;
      this.currentConflict = null;
    }, 300);

    console.log('[ConflictHandler] Modal hidden');
  }

  /**
   * Navigate to resolution (Module 5 - Alignment)
   */
  navigateToResolution() {
    console.log('[ConflictHandler] Navigating to Module 5 (Alignment)...');

    // Hide modal
    this.hideConflictModal();

    // Navigate to Module 5
    if (this.navigationCallback && typeof this.navigationCallback === 'function') {
      // Use custom navigation callback
      this.navigationCallback(5, this.currentConflict);
    } else if (typeof navigateToModule === 'function') {
      // Use global navigation function
      navigateToModule(5);
    } else {
      console.error('[ConflictHandler] No navigation function available');
      this.showToast('Navigation function not available', 'error');
      return;
    }

    // Store conflict in session storage for Module 5
    if (this.currentConflict) {
      sessionStorage.setItem('pending_conflict', JSON.stringify(this.currentConflict));
    }

    // Show toast
    this.showToast('Navigating to Conflict Resolution...', 'info');

    // Emit navigation event
    this.emitConflictEvent('conflict:navigation', {
      module: 5,
      conflict: this.currentConflict
    });
  }

  /**
   * View full conflict details (expand modal)
   */
  viewFullDetails() {
    console.log('[ConflictHandler] Viewing full details...');

    if (!this.currentConflict) return;

    // Show expanded details in modal
    const description = document.getElementById('conflictDescription');
    if (description) {
      description.innerHTML = `
        <p>${this.escapeHtml(this.currentConflict.description)}</p>
        <div class="conflict-full-details">
          <h4>Full Context:</h4>
          <ul>
            <li><strong>Conflict ID:</strong> ${this.currentConflict.id}</li>
            <li><strong>Agent:</strong> ${this.getAgentName(this.currentConflict.agentType)}</li>
            <li><strong>Severity:</strong> ${this.currentConflict.severity.toUpperCase()}</li>
            <li><strong>Module:</strong> ${this.getModuleName(this.currentConflict.affectedModule)}</li>
            <li><strong>Detected:</strong> ${new Date(this.currentConflict.timestamp).toLocaleString()}</li>
          </ul>
          ${this.currentConflict.context && Object.keys(this.currentConflict.context).length > 0 ? `
            <h4>Additional Context:</h4>
            <pre>${JSON.stringify(this.currentConflict.context, null, 2)}</pre>
          ` : ''}
        </div>
      `;
    }

    this.showToast('Showing full details', 'info');
  }

  /**
   * Update progress tracker to paused state
   */
  updateProgressTrackerToPaused(conflict) {
    // Update progress bar color to red/yellow
    const progressBar = document.querySelector('.progress-bar-fill');
    if (progressBar) {
      progressBar.style.background = 'linear-gradient(90deg, #ffc107 0%, #dc3545 100%)';
      progressBar.classList.add('paused');
    }

    // Update progress text
    const progressTitle = document.querySelector('.progress-title');
    if (progressTitle) {
      progressTitle.innerHTML = '<span class="status-icon">⏸️</span> Workflow Paused - Conflict Detected';
      progressTitle.style.color = '#dc3545';
    }

    // Add paused indicator to affected module in progress breakdown
    const progressBreakdown = document.querySelector('.progress-breakdown');
    if (progressBreakdown) {
      // Find or create engineering design progress item
      let engItem = progressBreakdown.querySelector('[data-module="engineering-design"]');
      if (!engItem) {
        engItem = document.createElement('div');
        engItem.className = 'progress-item';
        engItem.setAttribute('data-module', 'engineering-design');
        progressBreakdown.appendChild(engItem);
      }

      engItem.innerHTML = `
        <span class="progress-icon">⚠️</span>
        <span>Engineering Design - <strong style="color: #dc3545;">CONFLICT</strong></span>
      `;
      engItem.classList.add('conflict-detected');
    }

    console.log('[ConflictHandler] Progress tracker updated to paused state');
  }

  /**
   * Update progress tracker to normal state
   */
  updateProgressTrackerToNormal() {
    // Restore progress bar color
    const progressBar = document.querySelector('.progress-bar-fill');
    if (progressBar) {
      progressBar.style.background = 'linear-gradient(90deg, #2a5298 0%, #2ecc71 100%)';
      progressBar.classList.remove('paused');
    }

    // Restore progress text
    const progressTitle = document.querySelector('.progress-title');
    if (progressTitle) {
      progressTitle.innerHTML = 'Overall Progress';
      progressTitle.style.color = '';
    }

    // Remove conflict indicator
    const conflictItem = document.querySelector('.progress-item.conflict-detected');
    if (conflictItem) {
      conflictItem.classList.remove('conflict-detected');
      conflictItem.innerHTML = `
        <span class="progress-icon">✓</span>
        <span>Engineering Design - <strong style="color: #2ecc71;">RESOLVED</strong></span>
      `;
    }

    console.log('[ConflictHandler] Progress tracker updated to normal state');
  }

  /**
   * Simulate conflict detection (for testing)
   */
  simulateConflict(severity = 'high') {
    const mockConflicts = {
      critical: {
        agentType: 'security',
        severity: 'critical',
        vulnerability: 'SQL Injection Vulnerability',
        description: 'Critical SQL injection vulnerability detected in user authentication flow. User input is not properly sanitized before database queries, allowing potential unauthorized access.',
        recommendation: 'Implement parameterized queries and input validation using prepared statements. Add WAF rules for SQL injection patterns.',
        affectedModule: 'engineering-design',
        timestamp: Date.now()
      },
      high: {
        agentType: 'security',
        severity: 'high',
        vulnerability: 'Hardcoded API Credentials',
        description: 'Storing API keys in .env files can lead to credential exposure if the repository is accidentally made public or if access controls are insufficient.',
        recommendation: 'Use AWS Secrets Manager, Azure Key Vault, or similar secure credential storage service. Implement proper secret rotation policies.',
        affectedModule: 'engineering-design',
        timestamp: Date.now()
      },
      medium: {
        agentType: 'security',
        severity: 'medium',
        vulnerability: 'Deprecated Encryption Library',
        description: 'Using crypto-js version 3.x which has known vulnerabilities. This could compromise data encryption security.',
        recommendation: 'Upgrade to crypto-js v4.0+ or migrate to native Node.js crypto module for better security and performance.',
        affectedModule: 'engineering-design',
        timestamp: Date.now()
      },
      low: {
        agentType: 'security',
        severity: 'low',
        vulnerability: 'Missing Input Validation',
        description: 'Some API endpoints lack comprehensive input validation, which could lead to unexpected behavior or minor security issues.',
        recommendation: 'Implement express-validator middleware on all public endpoints with proper validation schemas.',
        affectedModule: 'engineering-design',
        timestamp: Date.now()
      }
    };

    const conflict = mockConflicts[severity] || mockConflicts.high;

    console.log('[ConflictHandler] Simulating conflict:', conflict);
    this.handleConflictDetected(conflict);
  }

  /**
   * Get agent icon by type
   */
  getAgentIcon(agentType) {
    const icons = {
      business: '💼',
      quality: '⚡',
      security: '🔒',
      engineering: '⚙️',
      product: '📦',
      design: '🎨',
      test: '🧪',
      system: '🤖'
    };
    return icons[agentType] || '🤖';
  }

  /**
   * Get agent name by type
   */
  getAgentName(agentType) {
    const names = {
      business: 'Business Agent',
      quality: 'Quality Agent',
      security: 'Security Agent',
      engineering: 'Engineering Agent',
      product: 'Product Agent',
      design: 'Design Agent',
      test: 'Test Agent',
      system: 'System'
    };
    return names[agentType] || 'Agent';
  }

  /**
   * Get module name by ID
   */
  getModuleName(moduleId) {
    const names = {
      'onboarding': 'Onboarding',
      'dashboard': 'Dashboard',
      'brd': 'Business Requirements',
      'prd': 'Product Requirements',
      'engineering-design': 'Engineering Design',
      'alignment': 'Alignment & Conflicts',
      'implementation': 'Implementation & Tracking'
    };
    return names[moduleId] || 'Unknown Module';
  }

  /**
   * Format timestamp
   */
  formatTimestamp(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);

    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `conflict-toast conflict-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('visible'), 10);
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Play alert sound (optional)
   */
  playAlertSound() {
    // Optional: play alert sound
    // const audio = new Audio('/sounds/alert.mp3');
    // audio.play().catch(e => console.log('Audio play failed:', e));
  }

  /**
   * Emit custom event
   */
  emitConflictEvent(eventName, data) {
    const event = new CustomEvent(eventName, {
      detail: data,
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(event);
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    if (this.modalContainer) {
      this.modalContainer.remove();
    }
    console.log('[ConflictHandler] Destroyed');
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.ConflictHandler = ConflictHandler;
}

// Auto-initialize if DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // Wait for socket.io to be available
    const initConflictHandler = () => {
      if (typeof io !== 'undefined' || window.socket) {
        const socket = window.socket || (typeof io !== 'undefined' ? io() : null);
        window.conflictHandler = new ConflictHandler({
          socket: socket,
          navigationCallback: typeof navigateToModule !== 'undefined' ? navigateToModule : null,
          activityFeed: window.agentActivityFeed || null
        });
        console.log('[ConflictHandler] Auto-initialized');
      } else {
        // Retry after 500ms if socket.io not yet loaded
        setTimeout(initConflictHandler, 500);
      }
    };

    initConflictHandler();
  });
}
