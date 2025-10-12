/**
 * Widget Updater - Real-time widget updates via WebSocket
 * Handles live updates for all widget types embedded in narratives
 */

(function() {
  'use strict';

  class WidgetUpdater {
    constructor() {
      this.socket = null;
      this.widgets = new Map();
      this.reconnectAttempts = 0;
      this.maxReconnectAttempts = 5;
      this.reconnectDelay = 1000;
      this.updateQueue = [];
      this.isProcessing = false;
    }

    /**
     * Initialize the widget updater with Socket.io connection
     */
    init(socketUrl) {
      // Connect to WebSocket server
      this.socket = io(socketUrl || window.location.origin, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: this.reconnectDelay,
        reconnectionAttempts: this.maxReconnectAttempts
      });

      this.setupEventListeners();
      this.registerExistingWidgets();

      console.log('[WidgetUpdater] Initialized');
    }

    /**
     * Setup WebSocket event listeners
     */
    setupEventListeners() {
      // Connection events
      this.socket.on('connect', () => {
        console.log('[WidgetUpdater] Connected to WebSocket server');
        this.reconnectAttempts = 0;
        this.onConnect();
      });

      this.socket.on('disconnect', () => {
        console.log('[WidgetUpdater] Disconnected from WebSocket server');
        this.onDisconnect();
      });

      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`[WidgetUpdater] Reconnection attempt ${attemptNumber}`);
        this.reconnectAttempts = attemptNumber;
      });

      // Widget update events
      this.socket.on('widget:update', (data) => {
        console.log('[WidgetUpdater] Received widget update', data);
        this.handleWidgetUpdate(data);
      });

      this.socket.on('widget:refresh', (data) => {
        console.log('[WidgetUpdater] Received widget refresh', data);
        this.handleWidgetRefresh(data);
      });

      // Broadcast events that affect widgets
      this.socket.on('approval:status_changed', (data) => {
        console.log('[WidgetUpdater] Approval status changed', data);
        this.refreshApprovalWidgets(data.narrativeId);
      });

      this.socket.on('project:blocker_created', (data) => {
        console.log('[WidgetUpdater] New blocker created', data);
        this.refreshBlockerWidgets(data.projectId);
      });

      this.socket.on('project:status_changed', (data) => {
        console.log('[WidgetUpdater] Project status changed', data);
        this.refreshProjectStatusWidgets(data.projectId);
      });
    }

    /**
     * Register all existing widgets on the page
     */
    registerExistingWidgets() {
      const widgetElements = document.querySelectorAll('[data-widget-id]');

      widgetElements.forEach(element => {
        const widgetId = element.getAttribute('data-widget-id');
        const widgetType = element.getAttribute('data-widget-type');
        const widgetParams = JSON.parse(element.getAttribute('data-widget-params') || '{}');

        this.widgets.set(widgetId, {
          element,
          type: widgetType,
          params: widgetParams,
          lastUpdated: new Date()
        });

        console.log(`[WidgetUpdater] Registered widget: ${widgetId} (${widgetType})`);
      });

      console.log(`[WidgetUpdater] Registered ${this.widgets.size} widgets`);
    }

    /**
     * Handle widget update event
     */
    handleWidgetUpdate(data) {
      const { widgetId, html, type } = data;

      if (!widgetId && type) {
        // Broadcast update to all widgets of this type
        this.updateWidgetsByType(type, html);
        return;
      }

      const widget = this.widgets.get(widgetId);

      if (!widget) {
        console.warn(`[WidgetUpdater] Widget not found: ${widgetId}`);
        return;
      }

      this.queueUpdate(() => {
        this.updateWidgetContent(widget.element, html);
        widget.lastUpdated = new Date();
      });
    }

    /**
     * Handle widget refresh event (re-fetch data)
     */
    handleWidgetRefresh(data) {
      const { widgetId, type, params } = data;

      if (widgetId) {
        // Refresh specific widget
        this.refreshWidget(widgetId);
      } else if (type) {
        // Refresh all widgets of this type
        this.refreshWidgetsByType(type, params);
      }
    }

    /**
     * Refresh specific widget by fetching new data
     */
    async refreshWidget(widgetId) {
      const widget = this.widgets.get(widgetId);

      if (!widget) {
        console.warn(`[WidgetUpdater] Widget not found for refresh: ${widgetId}`);
        return;
      }

      try {
        // Request widget re-render from server
        const response = await fetch('/api/v1/widgets/render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: widget.type,
            params: widget.params
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to refresh widget: ${response.statusText}`);
        }

        const { html } = await response.json();
        this.updateWidgetContent(widget.element, html);
        widget.lastUpdated = new Date();

        console.log(`[WidgetUpdater] Refreshed widget: ${widgetId}`);
      } catch (error) {
        console.error(`[WidgetUpdater] Error refreshing widget ${widgetId}:`, error);
        this.showWidgetError(widget.element, 'Failed to refresh widget');
      }
    }

    /**
     * Refresh all widgets of a specific type
     */
    refreshWidgetsByType(type, params) {
      this.widgets.forEach((widget, widgetId) => {
        if (widget.type === type) {
          // If params provided, only refresh matching widgets
          if (params && !this.paramsMatch(widget.params, params)) {
            return;
          }

          this.refreshWidget(widgetId);
        }
      });
    }

    /**
     * Refresh all approval widgets for a narrative
     */
    refreshApprovalWidgets(narrativeId) {
      this.refreshWidgetsByType('approval-status', { 'narrative-id': narrativeId });
    }

    /**
     * Refresh all blocker widgets for a project
     */
    refreshBlockerWidgets(projectId) {
      this.refreshWidgetsByType('blocker-alert', { 'project-id': projectId });
    }

    /**
     * Refresh all project status widgets
     */
    refreshProjectStatusWidgets(projectId) {
      this.refreshWidgetsByType('project-status', { 'project-id': projectId });
    }

    /**
     * Update widget content with animation
     */
    updateWidgetContent(element, html) {
      // Add updating class for animation
      element.classList.add('widget-updating');

      // Parse HTML and extract inner content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const newContent = tempDiv.firstElementChild;

      if (!newContent) {
        console.error('[WidgetUpdater] Invalid HTML content');
        element.classList.remove('widget-updating');
        return;
      }

      // Fade out
      element.style.opacity = '0.5';

      setTimeout(() => {
        // Replace content while preserving data attributes
        const widgetId = element.getAttribute('data-widget-id');
        const widgetType = element.getAttribute('data-widget-type');
        const widgetParams = element.getAttribute('data-widget-params');

        element.innerHTML = newContent.innerHTML;
        element.className = newContent.className;

        // Restore data attributes
        element.setAttribute('data-widget-id', widgetId);
        element.setAttribute('data-widget-type', widgetType);
        element.setAttribute('data-widget-params', widgetParams);

        // Fade in
        element.style.opacity = '1';
        element.classList.remove('widget-updating');
        element.classList.add('widget-updated');

        // Remove updated class after animation
        setTimeout(() => {
          element.classList.remove('widget-updated');
        }, 500);
      }, 200);
    }

    /**
     * Update all widgets of a type
     */
    updateWidgetsByType(type, html) {
      this.widgets.forEach((widget, widgetId) => {
        if (widget.type === type) {
          this.updateWidgetContent(widget.element, html);
          widget.lastUpdated = new Date();
        }
      });
    }

    /**
     * Show error state for widget
     */
    showWidgetError(element, message) {
      const errorHtml = `
        <div class="widget-error-state">
          <span class="widget-error-icon">⚠️</span>
          <span class="widget-error-message">${message}</span>
          <button class="widget-retry-btn" onclick="widgetUpdater.retryWidget('${element.getAttribute('data-widget-id')}')">
            Retry
          </button>
        </div>
      `;

      element.innerHTML = errorHtml;
      element.classList.add('widget-error');
    }

    /**
     * Retry loading a widget
     */
    retryWidget(widgetId) {
      const widget = this.widgets.get(widgetId);

      if (!widget) {
        return;
      }

      widget.element.classList.remove('widget-error');
      this.refreshWidget(widgetId);
    }

    /**
     * Queue an update to prevent race conditions
     */
    queueUpdate(updateFn) {
      this.updateQueue.push(updateFn);

      if (!this.isProcessing) {
        this.processUpdateQueue();
      }
    }

    /**
     * Process queued updates
     */
    async processUpdateQueue() {
      if (this.updateQueue.length === 0) {
        this.isProcessing = false;
        return;
      }

      this.isProcessing = true;
      const updateFn = this.updateQueue.shift();

      try {
        await updateFn();
      } catch (error) {
        console.error('[WidgetUpdater] Error processing update:', error);
      }

      // Process next update after a small delay
      setTimeout(() => this.processUpdateQueue(), 50);
    }

    /**
     * Check if params match
     */
    paramsMatch(widgetParams, filterParams) {
      return Object.keys(filterParams).every(key => {
        return widgetParams[key] === filterParams[key] ||
               widgetParams[key.replace('-', '')] === filterParams[key];
      });
    }

    /**
     * Handle connection
     */
    onConnect() {
      // Join rooms for all widgets
      this.widgets.forEach((widget) => {
        const { type, params } = widget;

        // Join type-specific room
        this.socket.emit('widget:subscribe', { type, params });
      });

      // Show connection status
      this.updateConnectionStatus(true);
    }

    /**
     * Handle disconnection
     */
    onDisconnect() {
      this.updateConnectionStatus(false);
    }

    /**
     * Update connection status indicator
     */
    updateConnectionStatus(connected) {
      const indicator = document.getElementById('widget-connection-status');

      if (indicator) {
        indicator.className = connected ? 'connected' : 'disconnected';
        indicator.textContent = connected ? '● Connected' : '○ Disconnected';
      }
    }
  }

  // Initialize global instance
  window.widgetUpdater = new WidgetUpdater();

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.widgetUpdater.init();
    });
  } else {
    window.widgetUpdater.init();
  }

  // Global helper functions
  window.escalateBlocker = function(blockerId) {
    console.log(`[WidgetUpdater] Escalating blocker ${blockerId}`);

    fetch(`/api/v1/blockers/${blockerId}/escalate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
      .then(response => response.json())
      .then(data => {
        console.log('[WidgetUpdater] Blocker escalated', data);
        // Widget will auto-refresh via WebSocket event
      })
      .catch(error => {
        console.error('[WidgetUpdater] Error escalating blocker:', error);
        alert('Failed to escalate blocker. Please try again.');
      });
  };

  window.resolveBlocker = function(blockerId) {
    console.log(`[WidgetUpdater] Resolving blocker ${blockerId}`);

    fetch(`/api/v1/blockers/${blockerId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
      .then(response => response.json())
      .then(data => {
        console.log('[WidgetUpdater] Blocker resolved', data);
        // Widget will auto-refresh via WebSocket event
      })
      .catch(error => {
        console.error('[WidgetUpdater] Error resolving blocker:', error);
        alert('Failed to resolve blocker. Please try again.');
      });
  };

  window.viewBlockerDetails = function(blockerId) {
    console.log(`[WidgetUpdater] Viewing blocker details ${blockerId}`);
    // TODO: Implement blocker details modal
    alert(`Viewing details for blocker ${blockerId}\n\nTODO: Implement details modal`);
  };

})();
