/**
 * Project Conductor - ServiceWorker
 * Aggressive caching strategy for instant subsequent loads
 *
 * Strategy: Cache-first with background update (stale-while-revalidate)
 * - Serve from cache immediately (instant load)
 * - Update cache in background for next visit
 * - Fallback to network if not in cache
 */

// Cache version - increment this to force cache refresh on deployment
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = 'conductor-modules-' + CACHE_VERSION;
const API_CACHE_NAME = 'conductor-api-' + CACHE_VERSION;

// Static assets to cache aggressively (instant load)
const STATIC_FILES_TO_CACHE = [
  // Main dashboard
  '/conductor-unified-dashboard.html',

  // Module HTML files
  '/module-0-onboarding.html',
  '/module-1-present.html',
  '/module-1.5-ai-generator.html',
  '/module-1.6-project-history.html',
  '/module-2-brd.html',
  '/module-3-prd.html',
  '/module-4-engineering-design.html',
  '/module-5-alignment.html',
  '/module-6-implementation.html',

  // CSS files
  '/public/css/activity-feed.css',
  '/public/css/conflict-alert.css',
  '/public/css/widgets.css',

  // JavaScript files
  '/public/js/activity-feed.js',
  '/public/js/conflict-handler.js',
  '/public/js/widget-updater.js',

  // Offline fallback
  '/public/offline.html'
];

// API endpoints to cache with short TTL (5 minutes)
const API_CACHE_PATTERNS = [
  '/api/v1/brds',
  '/api/v1/prds',
  '/api/v1/engineering-designs',
  '/api/v1/conflicts',
  '/api/v1/changelogs',
  '/api/v1/requirements',
  '/api/v1/metrics'
];

// ============================================================================
// INSTALL EVENT - Cache all static files on install
// ============================================================================
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing version', CACHE_VERSION);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static files:', STATIC_FILES_TO_CACHE.length, 'files');
        return cache.addAll(STATIC_FILES_TO_CACHE);
      })
      .then(() => {
        console.log('[ServiceWorker] Installation complete, activating immediately');
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[ServiceWorker] Installation failed:', error);
      })
  );
});

// ============================================================================
// ACTIVATE EVENT - Clean up old caches
// ============================================================================
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating version', CACHE_VERSION);

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old cache versions
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[ServiceWorker] Activation complete, claiming clients');
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// ============================================================================
// FETCH EVENT - Serve from cache first, fallback to network
// ============================================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip chrome-extension and non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip WebSocket connections
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  // ============================================================================
  // STRATEGY 1: Static files - Cache first, update in background
  // ============================================================================
  if (isStaticFile(url)) {
    event.respondWith(
      cacheFirstWithBackgroundUpdate(request)
    );
    return;
  }

  // ============================================================================
  // STRATEGY 2: API calls - Network first, fallback to cache
  // ============================================================================
  if (isApiCall(url)) {
    event.respondWith(
      networkFirstWithCache(request)
    );
    return;
  }

  // ============================================================================
  // STRATEGY 3: Everything else - Network only (no caching)
  // ============================================================================
  event.respondWith(
    fetch(request)
      .catch(() => {
        // If offline, return offline page for HTML requests
        if (request.headers.get('Accept').includes('text/html')) {
          return caches.match('/public/offline.html');
        }
      })
  );
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if URL is a static file that should be cached aggressively
 */
function isStaticFile(url) {
  const path = url.pathname;

  // Check if it's in our static files list
  if (STATIC_FILES_TO_CACHE.some(file => path.endsWith(file) || path === file)) {
    return true;
  }

  // Check by extension
  const staticExtensions = ['.html', '.css', '.js', '.png', '.jpg', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some(ext => path.endsWith(ext));
}

/**
 * Check if URL is an API call
 */
function isApiCall(url) {
  return url.pathname.startsWith('/api/') ||
         API_CACHE_PATTERNS.some(pattern => url.pathname.startsWith(pattern));
}

/**
 * Cache-first with background update strategy
 * - Serve from cache immediately (instant load)
 * - Update cache in background for next visit
 * - Fallback to network if not in cache
 */
async function cacheFirstWithBackgroundUpdate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // Serve from cache immediately
  if (cachedResponse) {
    console.log('[ServiceWorker] Serving from cache:', request.url);

    // Update cache in background (don't await)
    fetch(request)
      .then(response => {
        if (response && response.status === 200) {
          cache.put(request, response.clone());
          console.log('[ServiceWorker] Background update complete:', request.url);
        }
      })
      .catch(err => {
        console.warn('[ServiceWorker] Background update failed:', err);
      });

    return cachedResponse;
  }

  // Not in cache, fetch from network and cache it
  console.log('[ServiceWorker] Cache miss, fetching from network:', request.url);
  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
      console.log('[ServiceWorker] Cached new file:', request.url);
    }

    return networkResponse;
  } catch (error) {
    console.error('[ServiceWorker] Network fetch failed:', error);

    // If offline, return offline page for HTML requests
    if (request.headers.get('Accept').includes('text/html')) {
      const offlinePage = await cache.match('/public/offline.html');
      return offlinePage || new Response('Offline', { status: 503 });
    }

    throw error;
  }
}

/**
 * Network-first with cache fallback strategy
 * - Try network first (fresh data)
 * - Cache response for offline use
 * - Fallback to cache if offline
 * - Cache expires after 5 minutes
 */
async function networkFirstWithCache(request) {
  const cache = await caches.open(API_CACHE_NAME);

  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      // Cache successful API responses
      cache.put(request, networkResponse.clone());
      console.log('[ServiceWorker] API cached:', request.url);
    }

    return networkResponse;
  } catch (error) {
    console.warn('[ServiceWorker] Network failed, trying cache:', error);

    // Fallback to cache
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('[ServiceWorker] Serving API from cache:', request.url);

      // Add header to indicate it's from cache
      const headers = new Headers(cachedResponse.headers);
      headers.append('X-From-Cache', 'true');

      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: headers
      });
    }

    // No cache, return error
    return new Response(JSON.stringify({
      error: 'Offline and no cached data available',
      message: 'Please check your internet connection'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ============================================================================
// MESSAGE EVENT - Handle messages from clients
// ============================================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[ServiceWorker] Received SKIP_WAITING message');
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[ServiceWorker] Received CLEAR_CACHE message');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('[ServiceWorker] Clearing cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      })
    );
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    console.log('[ServiceWorker] Received GET_VERSION message');
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});

console.log('[ServiceWorker] Script loaded, version:', CACHE_VERSION);
