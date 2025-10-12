/**
 * Activity Tracker
 *
 * Tracks user activity and automatically logs out inactive users
 * for security purposes. Works in conjunction with SessionManager.
 */

class ActivityTracker {
    constructor(sessionManager, options = {}) {
        if (!sessionManager) {
            throw new Error('ActivityTracker requires a SessionManager instance');
        }

        this.sessionManager = sessionManager;
        this.authClient = sessionManager.authClient;
        this.lastActivity = Date.now();

        // Configuration (all times in milliseconds)
        this.inactivityTimeout = options.inactivityTimeout || 30 * 60 * 1000; // 30 minutes default
        this.warningTime = options.warningTime || 5 * 60 * 1000; // 5 minutes warning before logout
        this.checkInterval = options.checkInterval || 60000; // Check every minute

        this.checkTimer = null;
        this.warningTimer = null;
        this.warningShown = false;

        // Events to track
        this.activityEvents = [
            'mousedown',
            'mousemove',
            'keypress',
            'scroll',
            'touchstart',
            'click',
            'keydown',
        ];

        console.log('[ActivityTracker] Initialized with', {
            inactivityTimeout: this.inactivityTimeout / 1000 / 60 + ' minutes',
            warningTime: this.warningTime / 1000 / 60 + ' minutes',
        });
    }

    /**
     * Start tracking user activity
     */
    start() {
        console.log('[ActivityTracker] Starting activity tracking');

        // Set up activity event listeners
        this.activityEvents.forEach(event => {
            document.addEventListener(event, this.handleActivity.bind(this), { passive: true });
        });

        // Start periodic inactivity check
        this.checkTimer = setInterval(() => {
            this.checkInactivity();
        }, this.checkInterval);

        // Initial check
        this.checkInactivity();
    }

    /**
     * Stop tracking (on logout)
     */
    stop() {
        console.log('[ActivityTracker] Stopping activity tracking');

        // Remove event listeners
        this.activityEvents.forEach(event => {
            document.removeEventListener(event, this.handleActivity.bind(this));
        });

        // Clear timers
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = null;
        }

        if (this.warningTimer) {
            clearTimeout(this.warningTimer);
            this.warningTimer = null;
        }

        this.clearInactivityWarning();
    }

    /**
     * Handle user activity
     */
    handleActivity() {
        this.lastActivity = Date.now();

        // Clear warning if user becomes active
        if (this.warningShown) {
            this.clearInactivityWarning();
        }
    }

    /**
     * Check for user inactivity
     */
    checkInactivity() {
        const now = Date.now();
        const inactiveTime = now - this.lastActivity;
        const timeUntilLogout = this.inactivityTimeout - inactiveTime;

        // Check if user should be logged out
        if (inactiveTime >= this.inactivityTimeout) {
            console.log('[ActivityTracker] User inactive for too long, logging out');
            this.handleInactiveLogout();
            return;
        }

        // Show warning if approaching timeout
        if (timeUntilLogout <= this.warningTime && !this.warningShown) {
            console.log(`[ActivityTracker] User inactive, showing warning (${Math.floor(timeUntilLogout / 1000)}s remaining)`);
            this.showInactivityWarning(timeUntilLogout);
        }
    }

    /**
     * Show inactivity warning modal
     * @param {number} timeRemaining - Milliseconds until logout
     */
    showInactivityWarning(timeRemaining) {
        this.warningShown = true;

        // Check if modal already exists
        if (document.getElementById('inactivityWarningModal')) {
            return;
        }

        const minutes = Math.ceil(timeRemaining / 60000);

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'inactivityWarningModal';
        modal.className = 'session-warning-modal';
        modal.innerHTML = `
            <div class="session-warning-overlay"></div>
            <div class="session-warning-card inactivity-warning">
                <div class="session-warning-header">
                    <div class="session-warning-icon">💤</div>
                    <h3>Are You Still There?</h3>
                </div>
                <div class="session-warning-body">
                    <p>You've been inactive for a while.</p>
                    <p>You will be logged out in <strong id="inactivityCountdown">${minutes} minute${minutes !== 1 ? 's' : ''}</strong> for security.</p>
                    <p>Click "I'm Still Here" to continue your session.</p>
                </div>
                <div class="session-warning-footer">
                    <button id="continueSession" class="btn-primary">
                        I'm Still Here
                    </button>
                    <button id="logoutNow" class="btn-secondary">
                        Logout
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Update countdown
        const countdownElement = document.getElementById('inactivityCountdown');
        const countdownInterval = setInterval(() => {
            const remaining = this.inactivityTimeout - (Date.now() - this.lastActivity);
            const mins = Math.ceil(remaining / 60000);

            if (mins <= 0 || !this.warningShown) {
                clearInterval(countdownInterval);
                return;
            }

            if (countdownElement) {
                countdownElement.textContent = `${mins} minute${mins !== 1 ? 's' : ''}`;
            }
        }, 1000);

        // Add event listeners
        document.getElementById('continueSession').addEventListener('click', () => {
            console.log('[ActivityTracker] User clicked continue session');
            this.handleActivity(); // Reset activity timer
            this.clearInactivityWarning();
            clearInterval(countdownInterval);
        });

        document.getElementById('logoutNow').addEventListener('click', () => {
            console.log('[ActivityTracker] User clicked logout');
            clearInterval(countdownInterval);
            this.authClient.logout();
        });

        // Set timeout to logout when warning time expires
        this.warningTimer = setTimeout(() => {
            clearInterval(countdownInterval);
            this.handleInactiveLogout();
        }, timeRemaining);
    }

    /**
     * Clear the inactivity warning modal
     */
    clearInactivityWarning() {
        const modal = document.getElementById('inactivityWarningModal');
        if (modal) {
            modal.remove();
            console.log('[ActivityTracker] Inactivity warning cleared');
        }

        this.warningShown = false;

        if (this.warningTimer) {
            clearTimeout(this.warningTimer);
            this.warningTimer = null;
        }
    }

    /**
     * Handle logout due to inactivity
     */
    handleInactiveLogout() {
        console.log('[ActivityTracker] Logging out due to inactivity');
        this.stop();

        // Show logout message
        const modal = document.createElement('div');
        modal.id = 'inactivityLogoutModal';
        modal.className = 'session-warning-modal';
        modal.innerHTML = `
            <div class="session-warning-overlay"></div>
            <div class="session-warning-card session-expired">
                <div class="session-warning-header">
                    <div class="session-warning-icon">💤</div>
                    <h3>Logged Out Due to Inactivity</h3>
                </div>
                <div class="session-warning-body">
                    <p>You've been logged out for security reasons.</p>
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

        // Auto-redirect after 3 seconds
        setTimeout(() => {
            this.authClient.logout();
        }, 3000);
    }

    /**
     * Get activity status
     * @returns {Object} Activity status
     */
    getActivityStatus() {
        const now = Date.now();
        const inactiveTime = now - this.lastActivity;
        const timeUntilLogout = this.inactivityTimeout - inactiveTime;

        return {
            lastActivity: new Date(this.lastActivity),
            inactiveTime,
            inactiveMinutes: Math.floor(inactiveTime / 60000),
            timeUntilLogout,
            timeUntilLogoutMinutes: Math.floor(timeUntilLogout / 60000),
            isInactive: inactiveTime >= this.inactivityTimeout,
            willShowWarning: timeUntilLogout <= this.warningTime,
        };
    }

    /**
     * Reset activity timer manually
     */
    resetActivity() {
        console.log('[ActivityTracker] Activity timer reset manually');
        this.handleActivity();
    }

    /**
     * Set inactivity timeout
     * @param {number} minutes - Minutes of inactivity before logout
     */
    setInactivityTimeout(minutes) {
        this.inactivityTimeout = minutes * 60 * 1000;
        console.log(`[ActivityTracker] Inactivity timeout set to ${minutes} minutes`);
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ActivityTracker = ActivityTracker;

    // Auto-initialize if SessionManager exists
    document.addEventListener('DOMContentLoaded', () => {
        if (window.SessionManager && window.sessionManager) {
            const authClient = window.sessionManager.authClient;
            if (authClient && authClient.isAuthenticated()) {
                console.log('[ActivityTracker] Auto-initializing activity tracking');
                window.activityTracker = new ActivityTracker(window.sessionManager);
                window.activityTracker.start();
            }
        }
    });
}
