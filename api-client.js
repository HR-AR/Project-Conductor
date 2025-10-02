/**
 * Project Conductor - API Client Library
 * Centralized API communication for all modules
 */

const API_BASE = window.location.origin + '/api/v1';

class APIClient {
  constructor() {
    this.requestsInFlight = new Map();
    this.cache = new Map();
    this.cacheTTL = 60000; // 1 minute default
  }

  /**
   * GET request with caching and deduplication
   */
  async get(endpoint, params = {}, options = {}) {
    const url = this._buildURL(endpoint, params);
    const cacheKey = url.toString();

    // Check cache first
    if (options.cache !== false) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        console.log(`[API] Cache hit: ${endpoint}`);
        return cached.data;
      }
    }

    // Deduplicate concurrent requests
    if (this.requestsInFlight.has(cacheKey)) {
      console.log(`[API] Deduplicating: ${endpoint}`);
      return this.requestsInFlight.get(cacheKey);
    }

    // Make request
    const promise = this._fetch(url, {
      method: 'GET',
      headers: this._getHeaders()
    });

    this.requestsInFlight.set(cacheKey, promise);

    try {
      const data = await promise;

      // Cache result
      if (options.cache !== false) {
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
      }

      return data;
    } finally {
      this.requestsInFlight.delete(cacheKey);
    }
  }

  /**
   * POST request
   */
  async post(endpoint, data, options = {}) {
    const url = this._buildURL(endpoint);

    return this._fetch(url, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT request (invalidates cache)
   */
  async put(endpoint, data, options = {}) {
    const url = this._buildURL(endpoint);

    const result = await this._fetch(url, {
      method: 'PUT',
      headers: this._getHeaders(),
      body: JSON.stringify(data)
    });

    // Invalidate cache for this resource
    this._invalidateCache(endpoint);

    return result;
  }

  /**
   * DELETE request (invalidates cache)
   */
  async delete(endpoint, options = {}) {
    const url = this._buildURL(endpoint);

    const result = await this._fetch(url, {
      method: 'DELETE',
      headers: this._getHeaders()
    });

    // Invalidate cache for this resource
    this._invalidateCache(endpoint);

    return result;
  }

  /**
   * Build URL with query parameters
   */
  _buildURL(endpoint, params = {}) {
    const url = new URL(`${API_BASE}${endpoint}`);

    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        if (Array.isArray(params[key])) {
          params[key].forEach(val => url.searchParams.append(key, val));
        } else {
          url.searchParams.append(key, params[key]);
        }
      }
    });

    return url;
  }

  /**
   * Get request headers
   */
  _getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Fetch with error handling
   */
  async _fetch(url, options) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: response.statusText
        }));

        throw new APIError(
          error.message || 'Request failed',
          response.status,
          error
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }

      // Network error or parsing error
      throw new APIError(
        error.message || 'Network error',
        0,
        { originalError: error }
      );
    }
  }

  /**
   * Invalidate cache entries matching endpoint
   */
  _invalidateCache(endpoint) {
    const pattern = endpoint.split('?')[0]; // Remove query params

    for (const [key] of this.cache.entries()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        console.log(`[API] Cache invalidated: ${key}`);
      }
    }
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
    console.log('[API] Cache cleared');
  }
}

/**
 * Custom API Error class
 */
class APIError extends Error {
  constructor(message, statusCode, details = {}) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.details = details;
  }

  get isNetworkError() {
    return this.statusCode === 0;
  }

  get isNotFound() {
    return this.statusCode === 404;
  }

  get isForbidden() {
    return this.statusCode === 403;
  }

  get isServerError() {
    return this.statusCode >= 500;
  }
}

/**
 * Loading state manager
 */
class LoadingManager {
  constructor() {
    this.activeRequests = 0;
    this.callbacks = [];
  }

  start() {
    this.activeRequests++;
    this._notify();
  }

  stop() {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    this._notify();
  }

  isLoading() {
    return this.activeRequests > 0;
  }

  onChange(callback) {
    this.callbacks.push(callback);
  }

  _notify() {
    this.callbacks.forEach(cb => cb(this.isLoading()));
  }
}

// Global instances
const api = new APIClient();
const loading = new LoadingManager();

// Auto-show/hide loading indicator
loading.onChange(isLoading => {
  const indicator = document.getElementById('loading-indicator') ||
                    document.querySelector('.loading-indicator');
  if (indicator) {
    indicator.style.display = isLoading ? 'flex' : 'none';
  }
});

// Add fetch interceptor to track loading
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  loading.start();
  try {
    return await originalFetch.apply(this, args);
  } finally {
    loading.stop();
  }
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { APIClient, APIError, api, loading };
}
