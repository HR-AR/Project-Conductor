/**
 * Auth Guard - Protect routes that require authentication
 *
 * Usage: Include this script in any page that requires authentication
 * <script src="/public/js/auth-client.js"></script>
 * <script src="/public/js/auth-guard.js"></script>
 */

(function() {
    'use strict';

    // Pages that don't require authentication
    const PUBLIC_PAGES = [
        '/login.html',
        '/register.html',
        '/forgot-password.html',
        '/reset-password.html',
    ];

    // Current page path
    const currentPath = window.location.pathname;

    // Check if current page is public
    const isPublicPage = PUBLIC_PAGES.some(page => currentPath.endsWith(page));

    // Skip auth check for public pages
    if (isPublicPage) {
        console.log('[AuthGuard] Public page, skipping auth check');
        return;
    }

    // Initialize AuthClient
    const authClient = new AuthClient();

    /**
     * Check authentication status
     */
    function checkAuth() {
        if (!authClient.isAuthenticated()) {
            console.warn('[AuthGuard] User not authenticated, redirecting to login');

            // Save intended destination for redirect after login
            const intendedUrl = window.location.href;
            sessionStorage.setItem('intended_url', intendedUrl);

            // Redirect to login
            window.location.href = '/login.html?session_expired=true';
            return false;
        }

        console.log('[AuthGuard] User authenticated');
        return true;
    }

    /**
     * Setup auto token refresh
     */
    function setupAutoRefresh() {
        // Check token expiry every minute
        setInterval(() => {
            const timeUntilExpiry = authClient.getTimeUntilExpiry();

            // If token expires in less than 5 minutes, refresh it
            if (timeUntilExpiry > 0 && timeUntilExpiry < 5 * 60 * 1000) {
                console.log('[AuthGuard] Token expiring soon, refreshing...');

                authClient.refreshToken().catch((error) => {
                    console.error('[AuthGuard] Token refresh failed:', error);
                    // User will be redirected to login on next auth check
                });
            }
        }, 60000); // Check every minute
    }

    /**
     * Add user info to page
     */
    function addUserInfo() {
        const user = authClient.getCurrentUser();

        if (user) {
            // Dispatch custom event with user data
            window.dispatchEvent(new CustomEvent('authuser:loaded', {
                detail: { user }
            }));

            console.log('[AuthGuard] User info loaded:', {
                id: user.id,
                email: user.email,
                role: user.role
            });
        }
    }

    /**
     * Add global logout function
     */
    function setupGlobalLogout() {
        window.logout = function() {
            if (confirm('Are you sure you want to log out?')) {
                authClient.logout();
            }
        };
    }

    /**
     * Handle visibility change (tab becomes visible/hidden)
     * Check auth when user returns to tab
     */
    function handleVisibilityChange() {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // Tab became visible, check auth status
                checkAuth();
            }
        });
    }

    /**
     * Initialize auth guard
     */
    function init() {
        // Check authentication immediately
        if (!checkAuth()) {
            return;
        }

        // Setup features
        addUserInfo();
        setupAutoRefresh();
        setupGlobalLogout();
        handleVisibilityChange();

        console.log('[AuthGuard] Initialized successfully');
    }

    // Run auth guard on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export for debugging
    window.authGuard = {
        checkAuth,
        authClient
    };
})();
