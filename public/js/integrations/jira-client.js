/**
 * Jira Client - OAuth flow and connection management
 * Project Conductor - Priority 6: Jira Integration
 *
 * Features:
 * - OAuth 2.0 flow initiation
 * - Connection status monitoring
 * - Project management
 * - Connection testing
 * - Configuration updates
 *
 * @version 1.0.0
 */

class JiraClient {
  constructor(options = {}) {
    this.baseURL = options.baseURL || '/api/v1/integrations/jira';
    this.onConnectionChange = options.onConnectionChange || (() => {});
    this.onError = options.onError || ((error) => console.error(error));
    this.connectionStatus = {
      connected: false,
      baseUrl: null,
      userEmail: null,
      projectCount: 0,
      lastSync: null,
      projects: []
    };
    this.pollInterval = null;
  }

  /**
   * Check connection status
   */
  async checkConnection() {
    try {
      const response = await fetch(`${this.baseURL}/status`, {
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

      this.connectionStatus = {
        connected: data.connected || false,
        baseUrl: data.baseUrl || null,
        userEmail: data.userEmail || null,
        projectCount: data.projectCount || 0,
        lastSync: data.lastSync || null,
        projects: data.projects || []
      };

      this.onConnectionChange(this.connectionStatus);

      return this.connectionStatus;
    } catch (error) {
      console.error('Error checking connection:', error);
      this.onError(error);
      return {
        connected: false,
        baseUrl: null,
        userEmail: null,
        projectCount: 0,
        lastSync: null,
        projects: []
      };
    }
  }

  /**
   * Initiate OAuth flow
   */
  async initiateOAuthFlow() {
    try {
      // Open OAuth authorization window
      const width = 600;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      const authWindow = window.open(
        `${this.baseURL}/oauth/authorize`,
        'JiraOAuth',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );

      if (!authWindow) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Poll for OAuth completion
      this.startOAuthPolling(authWindow);
    } catch (error) {
      console.error('Error initiating OAuth flow:', error);
      this.onError(error);
    }
  }

  /**
   * Start polling for OAuth completion
   */
  startOAuthPolling(authWindow) {
    let attempts = 0;
    const maxAttempts = 120; // 2 minutes (120 * 1000ms)

    const checkWindow = setInterval(async () => {
      attempts++;

      // Check if window is closed
      if (authWindow.closed) {
        clearInterval(checkWindow);

        // Check if connection was successful
        const status = await this.checkConnection();

        if (!status.connected) {
          this.onError(new Error('OAuth flow was cancelled or failed'));
        }

        return;
      }

      // Timeout after max attempts
      if (attempts >= maxAttempts) {
        clearInterval(checkWindow);
        authWindow.close();
        this.onError(new Error('OAuth flow timed out'));
      }
    }, 1000);
  }

  /**
   * Handle OAuth callback
   * This is called by the OAuth callback page
   */
  handleOAuthCallback(params) {
    const urlParams = new URLSearchParams(params);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      this.onError(new Error(`OAuth error: ${error}`));
      return false;
    }

    if (code && state) {
      // Exchange code for access token
      this.exchangeOAuthCode(code, state);
      return true;
    }

    return false;
  }

  /**
   * Exchange OAuth code for access token
   */
  async exchangeOAuthCode(code, state) {
    try {
      const response = await fetch(`${this.baseURL}/oauth/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ code, state })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Update connection status
        await this.checkConnection();
        return true;
      } else {
        throw new Error(data.error || 'Failed to exchange OAuth code');
      }
    } catch (error) {
      console.error('Error exchanging OAuth code:', error);
      this.onError(error);
      return false;
    }
  }

  /**
   * Disconnect from Jira
   */
  async disconnect() {
    try {
      const response = await fetch(`${this.baseURL}/disconnect`, {
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
        this.connectionStatus = {
          connected: false,
          baseUrl: null,
          userEmail: null,
          projectCount: 0,
          lastSync: null,
          projects: []
        };

        this.onConnectionChange(this.connectionStatus);
        return true;
      } else {
        throw new Error(data.error || 'Failed to disconnect');
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      this.onError(error);
      return false;
    }
  }

  /**
   * Test connection
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.baseURL}/test`, {
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
        return data;
      } else {
        throw new Error(data.error || 'Connection test failed');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      throw error;
    }
  }

  /**
   * Update sync configuration
   */
  async updateSyncConfig(config) {
    try {
      const response = await fetch(`${this.baseURL}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        return data;
      } else {
        throw new Error(data.error || 'Failed to update configuration');
      }
    } catch (error) {
      console.error('Error updating sync config:', error);
      throw error;
    }
  }

  /**
   * Toggle project sync
   */
  async toggleProject(projectKey, active) {
    try {
      const response = await fetch(`${this.baseURL}/projects/${projectKey}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ active })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Update local project list
        const project = this.connectionStatus.projects.find(p => p.projectKey === projectKey);
        if (project) {
          project.active = active;
        }

        this.onConnectionChange(this.connectionStatus);
        return data;
      } else {
        throw new Error(data.error || 'Failed to toggle project');
      }
    } catch (error) {
      console.error('Error toggling project:', error);
      throw error;
    }
  }

  /**
   * Trigger manual sync
   */
  async triggerManualSync() {
    try {
      const response = await fetch(`${this.baseURL}/sync`, {
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
        return data;
      } else {
        throw new Error(data.error || 'Failed to start sync');
      }
    } catch (error) {
      console.error('Error triggering sync:', error);
      throw error;
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus() {
    try {
      const response = await fetch(`${this.baseURL}/sync/status`, {
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
      console.error('Error getting sync status:', error);
      throw error;
    }
  }

  /**
   * Export requirement to Jira
   */
  async exportRequirement(requirementId, options = {}) {
    try {
      const response = await fetch(`${this.baseURL}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          requirementId,
          ...options
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        return data;
      } else {
        throw new Error(data.error || 'Failed to export requirement');
      }
    } catch (error) {
      console.error('Error exporting requirement:', error);
      throw error;
    }
  }

  /**
   * Import Jira issue
   */
  async importIssue(jiraKey, options = {}) {
    try {
      const response = await fetch(`${this.baseURL}/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          jiraKey,
          ...options
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        return data;
      } else {
        throw new Error(data.error || 'Failed to import issue');
      }
    } catch (error) {
      console.error('Error importing issue:', error);
      throw error;
    }
  }

  /**
   * Get connection status (cached)
   */
  getConnectionStatus() {
    return this.connectionStatus;
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connectionStatus.connected;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = JiraClient;
}
