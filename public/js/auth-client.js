/**
 * Authentication Client - Frontend authentication client for Project Conductor
 *
 * Handles JWT token management, authentication requests, and token storage.
 * Supports both sessionStorage (default) and localStorage (remember me).
 */

class AuthClient {
    constructor(options = {}) {
        this.baseURL = options.baseURL || '/api/v1';
        this.tokenKey = 'pc_access_token';
        this.refreshKey = 'pc_refresh_token';
        this.userKey = 'pc_user';
        this.tokenExpiryKey = 'pc_token_expiry';

        // Check if tokens exist in either storage
        this.initializeStorage();
    }

    /**
     * Initialize storage based on where tokens are found
     */
    initializeStorage() {
        const sessionToken = sessionStorage.getItem(this.tokenKey);
        const localToken = localStorage.getItem(this.tokenKey);

        if (localToken) {
            this.storage = localStorage;
            this.rememberMe = true;
        } else if (sessionToken) {
            this.storage = sessionStorage;
            this.rememberMe = false;
        } else {
            this.storage = sessionStorage;
            this.rememberMe = false;
        }
    }

    /**
     * Get the appropriate storage (localStorage or sessionStorage)
     * @returns {Storage} Storage object
     */
    getStorage() {
        // Check which storage has the token
        if (localStorage.getItem(this.tokenKey)) {
            return localStorage;
        }
        return sessionStorage;
    }

    /**
     * Set storage type (session or local)
     * @param {boolean} remember - If true, use localStorage; otherwise sessionStorage
     */
    setRememberMe(remember) {
        this.rememberMe = remember;

        // Migrate tokens if already logged in
        const accessToken = this.getAccessToken();
        const refreshToken = this.getRefreshToken();
        const user = this.getUser();

        if (accessToken) {
            // Clear old storage
            sessionStorage.clear();
            localStorage.clear();

            // Set new storage
            this.storage = remember ? localStorage : sessionStorage;

            // Restore tokens
            this.setAccessToken(accessToken);
            this.setRefreshToken(refreshToken);
            if (user) {
                this.setUser(user);
            }
        } else {
            this.storage = remember ? localStorage : sessionStorage;
        }
    }

    /**
     * Register a new user
     * @param {Object} data - Registration data
     * @returns {Promise<Object>} Registration response
     */
    async register(data) {
        try {
            const response = await fetch(`${this.baseURL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Registration failed');
            }

            console.log('[AuthClient] Registration successful');
            return result;
        } catch (error) {
            console.error('[AuthClient] Registration error:', error);
            throw error;
        }
    }

    /**
     * Login user and store tokens
     * @param {string} email - User email
     * @param {string} password - User password
     * @param {boolean} rememberMe - Persistent login (30 days)
     * @returns {Promise<Object>} Login response with tokens
     */
    async login(email, password, rememberMe = false) {
        try {
            const response = await fetch(`${this.baseURL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Login failed' }));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (!result.success || !result.data) {
                throw new Error('Invalid response format from server');
            }

            // Set storage type before storing tokens
            this.setRememberMe(rememberMe);

            // Store tokens and user info
            this.setAccessToken(result.data.accessToken);
            this.setRefreshToken(result.data.refreshToken);
            this.setUser(result.data.user);
            this.setTokenExpiry(result.data.expiresIn || 3600);

            console.log('[AuthClient] Login successful', { userId: result.data.user.id });
            return result.data;
        } catch (error) {
            console.error('[AuthClient] Login error:', error);
            throw error;
        }
    }

    /**
     * Refresh access token using refresh token
     * @returns {Promise<Object>} New tokens
     */
    async refreshToken() {
        try {
            const refreshToken = this.getRefreshToken();

            if (!refreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await fetch(`${this.baseURL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refreshToken }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Token refresh failed');
            }

            // Update access token
            this.setAccessToken(result.accessToken);
            this.setTokenExpiry(result.expiresIn);

            console.log('[AuthClient] Token refreshed successfully');
            return result;
        } catch (error) {
            console.error('[AuthClient] Token refresh error:', error);
            // Clear tokens on refresh failure
            this.clearTokens();
            throw error;
        }
    }

    /**
     * Logout user and clear tokens
     * @param {boolean} redirect - Whether to redirect to login page
     * @returns {Promise<void>}
     */
    async logout(redirect = true) {
        try {
            // Call logout endpoint (optional, for backend tracking)
            await fetch(`${this.baseURL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.getAccessToken()}`,
                },
            }).catch(() => {
                // Ignore errors - logout locally even if API fails
            });

            console.log('[AuthClient] Logout successful');
        } finally {
            // Always clear tokens locally
            this.clearTokens();

            // Redirect to login page
            if (redirect) {
                window.location.href = '/login.html?logout=true';
            }
        }
    }

    /**
     * Get current access token
     * @returns {string|null} Access token
     */
    getAccessToken() {
        return localStorage.getItem(this.tokenKey) || sessionStorage.getItem(this.tokenKey);
    }

    /**
     * Set access token
     * @param {string} token - Access token
     */
    setAccessToken(token) {
        this.storage.setItem(this.tokenKey, token);
    }

    /**
     * Get refresh token
     * @returns {string|null} Refresh token
     */
    getRefreshToken() {
        return localStorage.getItem(this.refreshKey) || sessionStorage.getItem(this.refreshKey);
    }

    /**
     * Set refresh token
     * @param {string} token - Refresh token
     */
    setRefreshToken(token) {
        this.storage.setItem(this.refreshKey, token);
    }

    /**
     * Get stored user info (current user)
     * @returns {Object|null} User object
     */
    getUser() {
        const userJson = this.storage.getItem(this.userKey);
        return userJson ? JSON.parse(userJson) : null;
    }

    /**
     * Alias for getUser() for API consistency
     * @returns {Object|null} User object
     */
    getCurrentUser() {
        return this.getUser();
    }

    /**
     * Set user info
     * @param {Object} user - User object
     */
    setUser(user) {
        // Remove sensitive data before saving
        const { passwordHash, ...safeUser } = user;
        this.storage.setItem(this.userKey, JSON.stringify(safeUser));
    }

    /**
     * Set token expiry time
     * @param {number} expiresIn - Seconds until expiry
     */
    setTokenExpiry(expiresIn) {
        const expiryTime = Date.now() + (expiresIn * 1000);
        this.storage.setItem(this.tokenExpiryKey, expiryTime.toString());
    }

    /**
     * Get token expiry time
     * @returns {number|null} Expiry timestamp in milliseconds
     */
    getTokenExpiry() {
        const expiry = this.storage.getItem(this.tokenExpiryKey);
        return expiry ? parseInt(expiry, 10) : null;
    }

    /**
     * Clear all tokens and user data
     */
    clearTokens() {
        // Clear from both storages
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.refreshKey);
        localStorage.removeItem(this.userKey);
        localStorage.removeItem(this.tokenExpiryKey);

        sessionStorage.removeItem(this.tokenKey);
        sessionStorage.removeItem(this.refreshKey);
        sessionStorage.removeItem(this.userKey);
        sessionStorage.removeItem(this.tokenExpiryKey);

        console.log('[AuthClient] Auth data cleared');
    }

    /**
     * Alias for clearTokens for API consistency
     */
    clearAuth() {
        this.clearTokens();
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} True if authenticated
     */
    isAuthenticated() {
        const token = this.getAccessToken();
        const expiry = this.getTokenExpiry();

        if (!token || !expiry) {
            return false;
        }

        // Check if token is expired
        return Date.now() < expiry;
    }

    /**
     * Get authorization header
     * @returns {Object} Authorization header object
     */
    getAuthHeader() {
        const token = this.getAccessToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    /**
     * Make authenticated API request
     * @param {string} url - API endpoint
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>} Fetch response
     */
    async fetch(url, options = {}) {
        // Add authorization header
        const headers = {
            'Content-Type': 'application/json',
            ...this.getAuthHeader(),
            ...(options.headers || {}),
        };

        try {
            const response = await window.fetch(url, {
                ...options,
                headers,
            });

            // If 401 Unauthorized, try to refresh token
            if (response.status === 401) {
                console.log('[AuthClient] Token expired, attempting refresh...');

                try {
                    await this.refreshToken();

                    // Retry request with new token
                    const retryHeaders = {
                        'Content-Type': 'application/json',
                        ...this.getAuthHeader(),
                        ...(options.headers || {}),
                    };

                    return await window.fetch(url, {
                        ...options,
                        headers: retryHeaders,
                    });
                } catch (refreshError) {
                    console.error('[AuthClient] Token refresh failed, logging out');
                    await this.logout();
                    throw new Error('Session expired. Please log in again.');
                }
            }

            return response;
        } catch (error) {
            console.error('[AuthClient] Request error:', error);
            throw error;
        }
    }

    /**
     * Alias for fetch() for better API clarity
     * @param {string} url - API endpoint
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>} Fetch response
     */
    async fetchWithAuth(url, options = {}) {
        return this.fetch(url, options);
    }

    /**
     * Check if user has required role
     * @param {string|string[]} requiredRole - Required role(s)
     * @returns {boolean} True if user has required role
     */
    hasRole(requiredRole) {
        const user = this.getCurrentUser();

        if (!user || !user.role) {
            return false;
        }

        if (Array.isArray(requiredRole)) {
            return requiredRole.includes(user.role);
        }

        return user.role === requiredRole;
    }

    /**
     * Check if user is admin
     * @returns {boolean} True if user is admin
     */
    isAdmin() {
        return this.hasRole('admin');
    }

    /**
     * Parse JWT token payload (without verification)
     * @param {string} token - JWT token
     * @returns {Object|null} Decoded payload
     */
    parseJWT(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('[AuthClient] JWT parsing error:', error);
            return null;
        }
    }

    /**
     * Get time until token expiry in milliseconds
     * @returns {number} Milliseconds until expiry (negative if expired)
     */
    getTimeUntilExpiry() {
        const expiry = this.getTokenExpiry();
        if (!expiry) return -1;

        return expiry - Date.now();
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.AuthClient = AuthClient;
}
