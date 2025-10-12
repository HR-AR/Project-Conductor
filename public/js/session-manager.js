/**
 * Session Manager
 *
 * Handles automatic token refresh, session expiry warnings,
 * and seamless session management for authenticated users.
 */

class SessionManager {
    constructor(authClient) {
        if (!authClient) {
            throw new Error('SessionManager requires an AuthClient instance');
        }

        this.authClient = authClient;
        this.refreshInterval = null;
        this.warningTimeout = null;
        this.checkInterval = 60000; // Check every 1 minute
        this.warningTime = 2 * 60 * 1000; // Show warning 2 minutes before expiry
        this.refreshThreshold = 5 * 60 * 1000; // Auto-refresh 5 minutes before expiry
        this.warningShown = false;
        this.isRefreshing = false;

        console.log('[SessionManager] Initialized');
    }

    /**
     * Start monitoring token expiry and auto-refresh
     */
    startMonitoring() {
        console.log('[SessionManager] Starting session monitoring');

        // Check token expiry every minute
        this.refreshInterval = setInterval(() => {
            this.checkAndRefresh();
        }, this.checkInterval);

        // Initial check
        this.checkAndRefresh();
    }

    /**
     * Stop monitoring (on logout)
     */
    stopMonitoring() {
        console.log('[SessionManager] Stopping session monitoring');

        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }

        if (this.warningTimeout) {
            clearTimeout(this.warningTimeout);
            this.warningTimeout = null;
        }

        this.clearWarning();
    }

    /**
     * Check token expiry and refresh if needed
     */
    async checkAndRefresh() {
        const token = this.authClient.getAccessToken();

        if (!token) {
            console.log('[SessionManager] No token found, stopping monitoring');
            this.stopMonitoring();
            return;
        }

        const timeUntilExpiry = this.authClient.getTimeUntilExpiry();

        if (timeUntilExpiry < 0) {
            // Token already expired, try refresh
            console.log('[SessionManager] Token expired, attempting refresh');
            return this.refreshToken();
        } else if (timeUntilExpiry < this.refreshThreshold) {
            // Less than 5 minutes, proactively refresh
            console.log(`[SessionManager] Token expiring in ${Math.floor(timeUntilExpiry / 1000)}s, refreshing`);
            return this.refreshToken();
        } else if (timeUntilExpiry < this.warningTime && !this.warningShown) {
            // Show warning 2 minutes before expiry
            console.log(`[SessionManager] Token expiring in ${Math.floor(timeUntilExpiry / 1000)}s, showing warning`);
            this.showExpiryWarning(timeUntilExpiry);
        }
    }

    /**
     * Refresh the access token
     * @returns {Promise<boolean>} True if refresh successful
     */
    async refreshToken() {
        // Prevent concurrent refresh attempts
        if (this.isRefreshing) {
            console.log('[SessionManager] Refresh already in progress');
            return false;
        }

        this.isRefreshing = true;

        try {
            await this.authClient.refreshToken();
            console.log('[SessionManager] Token refreshed successfully');
            this.clearWarning();
            this.isRefreshing = false;
            return true;
        } catch (error) {
            console.error('[SessionManager] Token refresh failed:', error);
            this.isRefreshing = false;
            this.handleExpiredSession();
            return false;
        }
    }

    /**
     * Show session expiry warning modal
     * @param {number} timeRemaining - Milliseconds until expiry
     */
    showExpiryWarning(timeRemaining) {
        this.warningShown = true;
        const minutes = Math.ceil(timeRemaining / 60000);

        // Check if modal already exists
        if (document.getElementById('sessionWarningModal')) {
            return;
        }

        // Create modal warning
        const modal = document.createElement('div');
        modal.id = 'sessionWarningModal';
        modal.className = 'session-warning-modal';
        modal.innerHTML = `
            <div class="session-warning-overlay"></div>
            <div class="session-warning-card">
                <div class="session-warning-header">
                    <div class="session-warning-icon">⏱️</div>
                    <h3>Session Expiring Soon</h3>
                </div>
                <div class="session-warning-body">
                    <p>Your session will expire in <strong>${minutes} minute${minutes !== 1 ? 's' : ''}</strong>.</p>
                    <p>Click "Stay Logged In" to continue working or "Logout" to end your session now.</p>
                </div>
                <div class="session-warning-footer">
                    <button id="stayLoggedIn" class="btn-primary">
                        Stay Logged In
                    </button>
                    <button id="logoutNow" class="btn-secondary">
                        Logout
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        const stayButton = document.getElementById('stayLoggedIn');
        const logoutButton = document.getElementById('logoutNow');

        stayButton.addEventListener('click', async () => {
            console.log('[SessionManager] User chose to stay logged in');
            stayButton.disabled = true;
            stayButton.textContent = 'Refreshing...';

            const success = await this.refreshToken();

            if (success) {
                this.clearWarning();
            } else {
                stayButton.textContent = 'Refresh Failed';
                setTimeout(() => {
                    this.authClient.logout();
                }, 2000);
            }
        });

        logoutButton.addEventListener('click', () => {
            console.log('[SessionManager] User chose to logout');
            this.clearWarning();
            this.authClient.logout();
        });

        // Auto-dismiss after 2 minutes if no action
        this.warningTimeout = setTimeout(() => {
            console.log('[SessionManager] Warning timeout, attempting auto-refresh');
            this.refreshToken();
        }, this.warningTime);
    }

    /**
     * Clear the warning modal
     */
    clearWarning() {
        const modal = document.getElementById('sessionWarningModal');
        if (modal) {
            modal.remove();
            console.log('[SessionManager] Warning modal cleared');
        }

        this.warningShown = false;

        if (this.warningTimeout) {
            clearTimeout(this.warningTimeout);
            this.warningTimeout = null;
        }
    }

    /**
     * Handle expired session
     */
    handleExpiredSession() {
        console.log('[SessionManager] Session expired');
        this.stopMonitoring();

        // Show expiry message
        const modal = document.createElement('div');
        modal.id = 'sessionExpiredModal';
        modal.className = 'session-warning-modal';
        modal.innerHTML = `
            <div class="session-warning-overlay"></div>
            <div class="session-warning-card session-expired">
                <div class="session-warning-header">
                    <div class="session-warning-icon">🔒</div>
                    <h3>Session Expired</h3>
                </div>
                <div class="session-warning-body">
                    <p>Your session has expired for security reasons.</p>
                    <p>Please log in again to continue.</p>
                </div>
                <div class="session-warning-footer">
                    <button id="loginAgain" class="btn-primary">
                        Log In Again
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('loginAgain').addEventListener('click', () => {
            this.authClient.logout();
        });

        // Auto-redirect after 5 seconds
        setTimeout(() => {
            this.authClient.logout();
        }, 5000);
    }

    /**
     * Get session status information
     * @returns {Object} Session status
     */
    getSessionStatus() {
        const token = this.authClient.getAccessToken();
        const timeUntilExpiry = this.authClient.getTimeUntilExpiry();
        const user = this.authClient.getUser();

        return {
            authenticated: this.authClient.isAuthenticated(),
            user,
            timeUntilExpiry,
            expiresIn: Math.floor(timeUntilExpiry / 1000), // seconds
            isExpiring: timeUntilExpiry < this.warningTime,
            needsRefresh: timeUntilExpiry < this.refreshThreshold,
        };
    }

    /**
     * Force refresh token manually
     * @returns {Promise<boolean>} Success status
     */
    async forceRefresh() {
        console.log('[SessionManager] Manual token refresh requested');
        return this.refreshToken();
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.SessionManager = SessionManager;

    // Auto-initialize if AuthClient exists and user is authenticated
    document.addEventListener('DOMContentLoaded', () => {
        if (window.AuthClient && window.authClient) {
            if (window.authClient.isAuthenticated()) {
                console.log('[SessionManager] Auto-initializing session management');
                window.sessionManager = new SessionManager(window.authClient);
                window.sessionManager.startMonitoring();
            }
        }
    });
}
