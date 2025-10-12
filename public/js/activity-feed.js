/**
 * Agent Activity Feed Manager
 * Project Conductor - Phase 1, Priority 1, Component 1.1
 *
 * Manages the real-time display of agent activity for investor demos
 * and user visibility into AI orchestration.
 *
 * Features:
 * - Real-time WebSocket event handling
 * - Auto-scroll with item limiting (20 items max)
 * - Timestamp formatting (relative and absolute)
 * - Severity-based styling
 * - Toggle/minimize functionality
 * - Agent type icons and colors
 * - Performance optimized for 100+ events per minute
 */

class AgentActivityFeed {
  constructor(options = {}) {
    this.maxItems = options.maxItems || 20;
    this.autoScroll = options.autoScroll !== false;
    this.minimized = false;
    this.hidden = false;
    this.items = [];
    this.socket = null;
    this.updateInterval = null;
    this.stats = {
      total: 0,
      started: 0,
      completed: 0,
      errors: 0,
      conflicts: 0
    };

    // Agent type configuration
    this.agentTypes = {
      business: { icon: '💼', name: 'Business Agent' },
      quality: { icon: '⚡', name: 'Quality Agent' },
      security: { icon: '🔒', name: 'Security Agent' },
      engineering: { icon: '⚙️', name: 'Engineering Agent' },
      product: { icon: '📦', name: 'Product Agent' },
      design: { icon: '🎨', name: 'Design Agent' },
      test: { icon: '🧪', name: 'Test Agent' },
      generic: { icon: '🤖', name: 'Agent' }
    };

    // Event type configuration
    this.eventTypes = {
      started: { label: 'Started', severity: 'info', icon: '▶️' },
      progress: { label: 'Progress', severity: 'info', icon: '⏳' },
      completed: { label: 'Completed', severity: 'success', icon: '✓' },
      conflict_detected: { label: 'Conflict', severity: 'conflict', icon: '⚠️' },
      paused: { label: 'Paused', severity: 'warning', icon: '⏸️' },
      error: { label: 'Error', severity: 'error', icon: '✗' }
    };

    this.init();
  }

  /**
   * Initialize the activity feed
   */
  init() {
    console.log('[AgentActivityFeed] Initializing...');

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  /**
   * Setup the activity feed DOM and event listeners
   */
  setup() {
    this.container = document.getElementById('agentActivityFeed');
    if (!this.container) {
      console.warn('[AgentActivityFeed] Container not found. Activity feed disabled.');
      return;
    }

    this.contentElement = document.getElementById('activityFeedContent');
    this.countElement = document.getElementById('activityCount');
    this.statsElement = document.getElementById('activityStats');

    // Setup event listeners
    this.setupEventListeners();

    // Start timestamp update interval
    this.startTimestampUpdates();

    // Connect to WebSocket if available
    this.connectWebSocket();

    console.log('[AgentActivityFeed] Initialized successfully');
  }

  /**
   * Setup DOM event listeners
   */
  setupEventListeners() {
    // Toggle minimize on header click
    const header = this.container.querySelector('.activity-feed-header');
    if (header) {
      header.addEventListener('click', (e) => {
        if (!e.target.closest('.activity-feed-btn')) {
          this.toggleMinimize();
        }
      });
    }

    // Clear button
    const clearBtn = document.getElementById('activityClearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.clearFeed();
      });
    }

    // Minimize button
    const minimizeBtn = document.getElementById('activityMinimizeBtn');
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMinimize();
      });
    }
  }

  /**
   * Connect to WebSocket server
   */
  connectWebSocket() {
    // Check if socket.io is available globally
    if (typeof io !== 'undefined') {
      try {
        this.socket = io({
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5
        });

        this.setupWebSocketListeners();
        console.log('[AgentActivityFeed] WebSocket connected');
      } catch (error) {
        console.error('[AgentActivityFeed] WebSocket connection error:', error);
      }
    } else {
      console.warn('[AgentActivityFeed] Socket.io not available. Using demo mode.');
      this.startDemoMode();
    }
  }

  /**
   * Setup WebSocket event listeners for agent events
   */
  setupWebSocketListeners() {
    if (!this.socket) return;

    // Agent started event
    this.socket.on('agent.started', (data) => {
      this.addActivity({
        agentType: data.agentType || 'generic',
        eventType: 'started',
        message: data.message || `${this.getAgentName(data.agentType)} started working`,
        task: data.task,
        timestamp: data.timestamp || Date.now()
      });
    });

    // Agent progress event
    this.socket.on('agent.progress', (data) => {
      this.addActivity({
        agentType: data.agentType || 'generic',
        eventType: 'progress',
        message: data.message || `${this.getAgentName(data.agentType)} is processing`,
        progress: data.progress,
        timestamp: data.timestamp || Date.now()
      });
    });

    // Agent completed event
    this.socket.on('agent.completed', (data) => {
      this.addActivity({
        agentType: data.agentType || 'generic',
        eventType: 'completed',
        message: data.message || `${this.getAgentName(data.agentType)} completed successfully`,
        result: data.result,
        timestamp: data.timestamp || Date.now()
      });
    });

    // Agent conflict detected event
    this.socket.on('agent.conflict_detected', (data) => {
      this.addActivity({
        agentType: data.agentType || 'security',
        eventType: 'conflict_detected',
        message: data.message || `${this.getAgentName(data.agentType)} detected a conflict`,
        conflictType: data.conflictType,
        severity: data.severity || 'high',
        timestamp: data.timestamp || Date.now()
      });
    });

    // Agent paused event
    this.socket.on('agent.paused', (data) => {
      this.addActivity({
        agentType: data.agentType || 'generic',
        eventType: 'paused',
        message: data.message || `${this.getAgentName(data.agentType)} paused`,
        reason: data.reason,
        timestamp: data.timestamp || Date.now()
      });
    });

    // Agent error event
    this.socket.on('agent.error', (data) => {
      this.addActivity({
        agentType: data.agentType || 'generic',
        eventType: 'error',
        message: data.message || `${this.getAgentName(data.agentType)} encountered an error`,
        error: data.error,
        timestamp: data.timestamp || Date.now()
      });
    });

    // Connection status
    this.socket.on('connect', () => {
      console.log('[AgentActivityFeed] WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('[AgentActivityFeed] WebSocket disconnected');
    });
  }

  /**
   * Add a new activity item to the feed
   */
  addActivity(activity) {
    // Create activity object
    const item = {
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      agentType: activity.agentType || 'generic',
      eventType: activity.eventType || 'progress',
      message: activity.message,
      timestamp: activity.timestamp || Date.now(),
      data: activity
    };

    // Add to items array (prepend for newest first)
    this.items.unshift(item);

    // Limit items to maxItems
    if (this.items.length > this.maxItems) {
      this.items = this.items.slice(0, this.maxItems);
    }

    // Update stats
    this.updateStats(activity.eventType);

    // Render the feed
    this.render();

    // Auto-scroll to top if enabled
    if (this.autoScroll && this.contentElement) {
      this.contentElement.scrollTop = 0;
    }
  }

  /**
   * Update statistics
   */
  updateStats(eventType) {
    this.stats.total++;

    switch (eventType) {
      case 'started':
        this.stats.started++;
        break;
      case 'completed':
        this.stats.completed++;
        break;
      case 'error':
        this.stats.errors++;
        break;
      case 'conflict_detected':
        this.stats.conflicts++;
        break;
    }

    // Update stats display
    if (this.statsElement) {
      this.statsElement.innerHTML = `
        <div class="activity-stat">
          <span class="activity-stat-icon">📊</span>
          <span>${this.stats.total}</span>
        </div>
        <div class="activity-stat">
          <span class="activity-stat-icon">✓</span>
          <span>${this.stats.completed}</span>
        </div>
      `;
    }

    // Update count badge
    if (this.countElement) {
      this.countElement.textContent = this.items.length;
    }
  }

  /**
   * Render the activity feed
   */
  render() {
    if (!this.contentElement) return;

    if (this.items.length === 0) {
      this.contentElement.innerHTML = `
        <div class="activity-feed-empty">
          <div class="activity-feed-empty-icon">🤖</div>
          <div class="activity-feed-empty-title">No Agent Activity</div>
          <div class="activity-feed-empty-message">Agents will appear here when they start working</div>
        </div>
      `;
      return;
    }

    // Render all items
    const html = this.items.map(item => this.renderActivityItem(item)).join('');
    this.contentElement.innerHTML = html;

    // Add animation class to first item
    const firstItem = this.contentElement.firstElementChild;
    if (firstItem) {
      firstItem.classList.add('new');
      setTimeout(() => firstItem.classList.remove('new'), 1000);
    }
  }

  /**
   * Render a single activity item
   */
  renderActivityItem(item) {
    const agentConfig = this.agentTypes[item.agentType] || this.agentTypes.generic;
    const eventConfig = this.eventTypes[item.eventType] || this.eventTypes.progress;
    const severity = eventConfig.severity;

    return `
      <div class="activity-item agent-${item.agentType} severity-${severity}" data-id="${item.id}" data-agent-type="${item.agentType}">
        <div class="activity-icon-wrapper">
          <span>${agentConfig.icon}</span>
        </div>
        <div class="activity-details">
          <div class="activity-agent">
            <span>${agentConfig.name}</span>
            <span class="activity-status-badge status-${item.eventType}">${eventConfig.icon} ${eventConfig.label}</span>
          </div>
          <div class="activity-message">${this.escapeHtml(item.message)}</div>
          <div class="activity-timestamp">
            <span class="activity-timestamp-icon">🕐</span>
            <span class="timestamp-text" data-timestamp="${item.timestamp}">${this.formatTimestamp(item.timestamp)}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Format timestamp as relative time (e.g., "2m ago") or absolute time
   */
  formatTimestamp(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) {
      return 'Just now';
    } else if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      // Show absolute time
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  /**
   * Start interval to update timestamps
   */
  startTimestampUpdates() {
    this.updateInterval = setInterval(() => {
      this.updateTimestamps();
    }, 30000); // Update every 30 seconds
  }

  /**
   * Update all visible timestamps
   */
  updateTimestamps() {
    if (!this.contentElement) return;

    const timestampElements = this.contentElement.querySelectorAll('.timestamp-text');
    timestampElements.forEach(element => {
      const timestamp = parseInt(element.dataset.timestamp);
      if (timestamp) {
        element.textContent = this.formatTimestamp(timestamp);
      }
    });
  }

  /**
   * Toggle minimize state
   */
  toggleMinimize() {
    this.minimized = !this.minimized;
    this.container.classList.toggle('minimized', this.minimized);

    const minimizeBtn = document.getElementById('activityMinimizeBtn');
    if (minimizeBtn) {
      minimizeBtn.textContent = this.minimized ? '➕' : '➖';
    }

    console.log(`[AgentActivityFeed] ${this.minimized ? 'Minimized' : 'Expanded'}`);
  }

  /**
   * Toggle hidden state
   */
  toggleHidden() {
    this.hidden = !this.hidden;
    this.container.classList.toggle('hidden', this.hidden);
  }

  /**
   * Clear all activity items
   */
  clearFeed() {
    if (confirm('Clear all activity items?')) {
      this.items = [];
      this.stats = {
        total: 0,
        started: 0,
        completed: 0,
        errors: 0,
        conflicts: 0
      };
      this.render();
      this.updateStats();
      console.log('[AgentActivityFeed] Feed cleared');
    }
  }

  /**
   * Get agent display name
   */
  getAgentName(agentType) {
    const config = this.agentTypes[agentType] || this.agentTypes.generic;
    return config.name;
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Demo mode - simulate agent activity for testing
   */
  startDemoMode() {
    console.log('[AgentActivityFeed] Starting demo mode...');

    const demoEvents = [
      { agentType: 'business', eventType: 'started', message: 'Business Agent analyzing requirements' },
      { agentType: 'quality', eventType: 'progress', message: 'Quality Agent checking for ambiguities' },
      { agentType: 'business', eventType: 'completed', message: 'Business Agent completed BRD generation' },
      { agentType: 'product', eventType: 'started', message: 'Product Agent creating PRD' },
      { agentType: 'quality', eventType: 'completed', message: 'Quality Agent validation passed' },
      { agentType: 'engineering', eventType: 'started', message: 'Engineering Agent designing architecture' },
      { agentType: 'security', eventType: 'started', message: 'Security Agent scanning for vulnerabilities' },
      { agentType: 'security', eventType: 'conflict_detected', message: 'Security vulnerability detected: Deprecated crypto library' },
      { agentType: 'engineering', eventType: 'paused', message: 'Engineering Agent paused due to conflict' }
    ];

    let index = 0;
    const interval = setInterval(() => {
      if (index >= demoEvents.length) {
        clearInterval(interval);
        console.log('[AgentActivityFeed] Demo mode completed');
        return;
      }

      this.addActivity(demoEvents[index]);
      index++;
    }, 3000); // Add event every 3 seconds
  }

  /**
   * Simulate a test event (for testing purposes)
   */
  simulateEvent(agentType, eventType, message) {
    this.addActivity({
      agentType: agentType || 'generic',
      eventType: eventType || 'progress',
      message: message || 'Test event',
      timestamp: Date.now()
    });
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    if (this.socket) {
      this.socket.disconnect();
    }
    console.log('[AgentActivityFeed] Destroyed');
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.AgentActivityFeed = AgentActivityFeed;
}

// Auto-initialize if container exists
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('agentActivityFeed')) {
      window.agentActivityFeed = new AgentActivityFeed();
      console.log('[AgentActivityFeed] Auto-initialized');
    }
  });
}
