/**
 * Sync Manager - Monitor and manage Jira synchronization
 * Project Conductor - Priority 6: Jira Integration
 *
 * Features:
 * - Trigger manual sync
 * - Monitor sync progress
 * - Handle sync errors
 * - Display notifications
 * - WebSocket integration for real-time updates
 * - Data freshness indicators
 * - Sync history tracking
 *
 * @version 1.0.0
 */

class SyncManager {
  constructor(options = {}) {
    this.baseURL = options.baseURL || '/api/v1/integrations/jira';
    this.onSyncProgress = options.onSyncProgress || (() => {});
    this.onSyncComplete = options.onSyncComplete || (() => {});
    this.onError = options.onError || ((error) => console.error(error));
    this.socket = null;
    this.activeSyncId = null;
    this.progressPollInterval = null;
  }

  /**
   * Check for active sync
   */
  async checkActiveSync() {
    try {
      const response = await fetch(`${this.baseURL}/sync/active`, {
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

      if (data.active) {
        this.activeSyncId = data.syncId;
        this.startProgressPolling();
        return data;
      }

      return null;
    } catch (error) {
      console.error('Error checking active sync:', error);
      return null;
    }
  }

  /**
   * Trigger manual sync
   */
  async triggerSync(options = {}) {
    try {
      const response = await fetch(`${this.baseURL}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(options)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        this.activeSyncId = data.syncId;
        this.startProgressPolling();
        return data;
      } else {
        throw new Error(data.error || 'Failed to start sync');
      }
    } catch (error) {
      console.error('Error triggering sync:', error);
      this.onError(error);
      throw error;
    }
  }

  /**
   * Start polling for sync progress
   */
  startProgressPolling() {
    if (this.progressPollInterval) {
      clearInterval(this.progressPollInterval);
    }

    this.progressPollInterval = setInterval(async () => {
      try {
        const progress = await this.getSyncProgress();

        this.onSyncProgress(progress);

        // Stop polling if sync is complete
        if (progress.status === 'completed' || progress.status === 'failed') {
          this.stopProgressPolling();

          if (progress.status === 'completed') {
            this.onSyncComplete(progress);
          } else {
            this.onError(new Error(progress.error || 'Sync failed'));
          }
        }
      } catch (error) {
        console.error('Error polling sync progress:', error);
      }
    }, 2000); // Poll every 2 seconds
  }

  /**
   * Stop polling for sync progress
   */
  stopProgressPolling() {
    if (this.progressPollInterval) {
      clearInterval(this.progressPollInterval);
      this.progressPollInterval = null;
    }
    this.activeSyncId = null;
  }

  /**
   * Get sync progress
   */
  async getSyncProgress() {
    try {
      const response = await fetch(`${this.baseURL}/sync/${this.activeSyncId}/progress`, {
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
      return data;
    } catch (error) {
      console.error('Error getting sync progress:', error);
      throw error;
    }
  }

  /**
   * Cancel active sync
   */
  async cancelSync() {
    if (!this.activeSyncId) {
      return;
    }

    try {
      const response = await fetch(`${this.baseURL}/sync/${this.activeSyncId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        this.stopProgressPolling();
        return data;
      } else {
        throw new Error(data.error || 'Failed to cancel sync');
      }
    } catch (error) {
      console.error('Error canceling sync:', error);
      throw error;
    }
  }

  /**
   * Get sync history
   */
  async getSyncHistory(options = {}) {
    try {
      const params = new URLSearchParams({
        limit: options.limit || 50,
        offset: options.offset || 0
      });

      const response = await fetch(`${this.baseURL}/sync/history?${params}`, {
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
      return this.formatSyncHistory(data.history || []);
    } catch (error) {
      console.error('Error getting sync history:', error);
      throw error;
    }
  }

  /**
   * Format sync history for timeline display
   */
  formatSyncHistory(history) {
    return history.map(item => {
      let status = 'info';
      if (item.status === 'completed' && item.conflicts === 0 && item.errors === 0) {
        status = 'success';
      } else if (item.status === 'failed' || item.errors > 0) {
        status = 'error';
      } else if (item.conflicts > 0) {
        status = 'warning';
      }

      return {
        title: this.getSyncTitle(item),
        description: this.getSyncDescription(item),
        timestamp: item.startedAt,
        status: status,
        stats: {
          synced: item.synced || 0,
          conflicts: item.conflicts || 0,
          errors: item.errors || 0,
          duration: this.formatDuration(item.startedAt, item.completedAt)
        }
      };
    });
  }

  /**
   * Get sync title
   */
  getSyncTitle(item) {
    if (item.type === 'manual') {
      return 'Manual Sync';
    } else if (item.type === 'scheduled') {
      return 'Scheduled Sync';
    } else if (item.type === 'webhook') {
      return 'Webhook Triggered Sync';
    } else {
      return 'Sync';
    }
  }

  /**
   * Get sync description
   */
  getSyncDescription(item) {
    if (item.status === 'completed') {
      const parts = [];

      if (item.synced > 0) {
        parts.push(`${item.synced} requirement${item.synced === 1 ? '' : 's'} synced`);
      }

      if (item.conflicts > 0) {
        parts.push(`${item.conflicts} conflict${item.conflicts === 1 ? '' : 's'} detected`);
      }

      if (item.errors > 0) {
        parts.push(`${item.errors} error${item.errors === 1 ? '' : 's'} occurred`);
      }

      if (parts.length === 0) {
        return 'No changes detected';
      }

      return parts.join(', ');
    } else if (item.status === 'failed') {
      return `Sync failed: ${item.error || 'Unknown error'}`;
    } else {
      return 'Sync in progress...';
    }
  }

  /**
   * Format duration
   */
  formatDuration(startedAt, completedAt) {
    if (!startedAt || !completedAt) {
      return '-';
    }

    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const diffMs = end - start;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);

    if (diffMinutes > 0) {
      return `${diffMinutes}m ${diffSeconds % 60}s`;
    } else {
      return `${diffSeconds}s`;
    }
  }

  /**
   * Get freshness indicators
   */
  async getFreshnessIndicators() {
    try {
      const response = await fetch(`${this.baseURL}/freshness`, {
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
      return this.formatFreshnessIndicators(data.indicators || []);
    } catch (error) {
      console.error('Error getting freshness indicators:', error);
      throw error;
    }
  }

  /**
   * Format freshness indicators
   */
  formatFreshnessIndicators(indicators) {
    return indicators.map(indicator => {
      let status = 'Synced';

      if (indicator.status === 'conflict') {
        status = 'Conflict';
      } else if (indicator.status === 'error') {
        status = 'Error';
      } else if (indicator.status === 'out_of_sync') {
        status = 'Out of Sync';
      }

      return {
        name: indicator.name,
        status: status,
        lastSync: indicator.lastSync,
        requirementId: indicator.requirementId,
        jiraKey: indicator.jiraKey
      };
    });
  }

  /**
   * Connect to WebSocket for real-time updates
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

      // Listen for sync events
      this.socket.on('sync:progress', (data) => {
        this.onSyncProgress(data);
        callback({ type: 'sync:progress', data });
      });

      this.socket.on('sync:complete', (data) => {
        this.onSyncComplete(data);
        callback({ type: 'sync:complete', data });
      });

      this.socket.on('sync:error', (data) => {
        this.onError(new Error(data.error));
        callback({ type: 'sync:error', data });
      });

      this.socket.on('freshness:update', (data) => {
        callback({ type: 'freshness:update', data });
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
   * Get sync statistics
   */
  async getSyncStats() {
    try {
      const response = await fetch(`${this.baseURL}/sync/stats`, {
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
      return data;
    } catch (error) {
      console.error('Error getting sync stats:', error);
      throw error;
    }
  }

  /**
   * Retry failed sync items
   */
  async retryFailed(syncId) {
    try {
      const response = await fetch(`${this.baseURL}/sync/${syncId}/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        this.activeSyncId = data.syncId;
        this.startProgressPolling();
        return data;
      } else {
        throw new Error(data.error || 'Failed to retry sync');
      }
    } catch (error) {
      console.error('Error retrying sync:', error);
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stopProgressPolling();
    this.disconnectWebSocket();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SyncManager;
}
