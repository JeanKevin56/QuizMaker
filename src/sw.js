/**
 * Service Worker for Quiz Platform
 * Provides offline functionality and caching strategies
 */

const CACHE_NAME = 'QuizMaker-v1';
const STATIC_CACHE_NAME = 'QuizMaker-static-v1';
const DYNAMIC_CACHE_NAME = 'QuizMaker-dynamic-v1';

// Files to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/src/main.js',
    '/src/styles/main.css',
    '/src/styles/error-handling.css',
    '/src/utils/router.js',
    '/src/utils/viewManager.js',
    '/src/utils/lazyLoader.js',
    '/src/services/ErrorHandler.js',
    '/src/components/OfflineIndicator.js',
    '/src/models/types.js',
    '/src/models/validation.js'
];

// API endpoints that should be cached
const API_CACHE_PATTERNS = [
    /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models/
];

// Maximum cache size for dynamic content
const MAX_DYNAMIC_CACHE_SIZE = 50;

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('Service Worker: Static assets cached');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Service Worker: Failed to cache static assets:', error);
            })
    );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE_NAME && 
                            cacheName !== DYNAMIC_CACHE_NAME &&
                            cacheName.startsWith('QuizMaker-')) {
                            console.log('Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activated');
                return self.clients.claim();
            })
    );
});

/**
 * Fetch event - handle network requests with caching strategies
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Handle different types of requests
    if (isStaticAsset(request)) {
        event.respondWith(handleStaticAsset(request));
    } else if (isAPIRequest(request)) {
        event.respondWith(handleAPIRequest(request));
    } else if (isNavigationRequest(request)) {
        event.respondWith(handleNavigationRequest(request));
    } else {
        event.respondWith(handleDynamicRequest(request));
    }
});

/**
 * Check if request is for a static asset
 */
function isStaticAsset(request) {
    const url = new URL(request.url);
    return STATIC_ASSETS.some(asset => url.pathname.endsWith(asset)) ||
           url.pathname.includes('/src/') ||
           url.pathname.includes('/assets/') ||
           url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/);
}

/**
 * Check if request is for an API
 */
function isAPIRequest(request) {
    return API_CACHE_PATTERNS.some(pattern => pattern.test(request.url));
}

/**
 * Check if request is a navigation request
 */
function isNavigationRequest(request) {
    return request.mode === 'navigate' || 
           (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

/**
 * Handle static asset requests - Cache First strategy
 */
async function handleStaticAsset(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Service Worker: Static asset fetch failed:', error);
        
        // Return cached version if available
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline fallback for critical assets
        if (request.url.includes('.js') || request.url.includes('.css')) {
            return new Response('/* Offline fallback */', {
                headers: { 'Content-Type': 'text/plain' }
            });
        }
        
        throw error;
    }
}

/**
 * Handle API requests - Network First with cache fallback
 */
async function handleAPIRequest(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
            await limitCacheSize(DYNAMIC_CACHE_NAME, MAX_DYNAMIC_CACHE_SIZE);
        }
        
        return networkResponse;
    } catch (error) {
        console.log('Service Worker: API request failed, checking cache:', error);
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            // Add offline indicator to response
            const response = cachedResponse.clone();
            response.headers.set('X-Served-By', 'service-worker-cache');
            return response;
        }
        
        // Return offline response for API requests
        return new Response(JSON.stringify({
            error: 'Offline',
            message: 'This request requires an internet connection',
            cached: false
        }), {
            status: 503,
            headers: {
                'Content-Type': 'application/json',
                'X-Served-By': 'service-worker-offline'
            }
        });
    }
}

/**
 * Handle navigation requests - return cached index.html for SPA
 */
async function handleNavigationRequest(request) {
    try {
        const networkResponse = await fetch(request);
        return networkResponse;
    } catch (error) {
        console.log('Service Worker: Navigation request failed, serving cached index.html');
        
        const cachedResponse = await caches.match('/index.html');
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Fallback offline page
        return new Response(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Quiz Platform - Offline</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    .offline-message { color: #666; }
                </style>
            </head>
            <body>
                <h1>Quiz Platform</h1>
                <div class="offline-message">
                    <p>You are currently offline.</p>
                    <p>Please check your internet connection and try again.</p>
                    <button onclick="window.location.reload()">Retry</button>
                </div>
            </body>
            </html>
        `, {
            headers: { 'Content-Type': 'text/html' }
        });
    }
}

/**
 * Handle dynamic requests - Network First strategy
 */
async function handleDynamicRequest(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
            await limitCacheSize(DYNAMIC_CACHE_NAME, MAX_DYNAMIC_CACHE_SIZE);
        }
        
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        throw error;
    }
}

/**
 * Limit cache size by removing oldest entries
 */
async function limitCacheSize(cacheName, maxSize) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    if (keys.length > maxSize) {
        const keysToDelete = keys.slice(0, keys.length - maxSize);
        await Promise.all(keysToDelete.map(key => cache.delete(key)));
    }
}

/**
 * Handle background sync for offline actions
 */
self.addEventListener('sync', (event) => {
    console.log('Service Worker: Background sync triggered:', event.tag);
    
    if (event.tag === 'quiz-data-sync') {
        event.waitUntil(syncQuizData());
    } else if (event.tag === 'api-retry') {
        event.waitUntil(retryFailedAPIRequests());
    }
});

/**
 * Sync quiz data when back online
 */
async function syncQuizData() {
    try {
        // Get pending quiz data from IndexedDB
        const pendingData = await getPendingQuizData();
        
        for (const data of pendingData) {
            try {
                // Attempt to sync data
                await syncSingleQuizData(data);
                await removePendingQuizData(data.id);
            } catch (error) {
                console.error('Failed to sync quiz data:', error);
            }
        }
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

/**
 * Retry failed API requests
 */
async function retryFailedAPIRequests() {
    try {
        // Implementation would depend on how failed requests are stored
        console.log('Retrying failed API requests...');
    } catch (error) {
        console.error('Failed to retry API requests:', error);
    }
}

/**
 * Handle push notifications (future feature)
 */
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        
        const options = {
            body: data.body,
            icon: '/assets/icon-192x192.png',
            badge: '/assets/badge-72x72.png',
            tag: data.tag || 'quiz-notification',
            requireInteraction: false,
            actions: data.actions || []
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow('/')
    );
});

/**
 * Placeholder functions for quiz data sync
 * These would be implemented based on the actual data storage structure
 */
async function getPendingQuizData() {
    // Implementation would read from IndexedDB
    return [];
}

async function syncSingleQuizData(data) {
    // Implementation would sync individual quiz data
    console.log('Syncing quiz data:', data);
}

async function removePendingQuizData(id) {
    // Implementation would remove synced data from pending queue
    console.log('Removing pending quiz data:', id);
}

/**
 * Message handling for communication with main thread
 */
self.addEventListener('message', (event) => {
    const { type, payload } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_CACHE_STATUS':
            getCacheStatus().then(status => {
                event.ports[0].postMessage(status);
            });
            break;
            
        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;
            
        default:
            console.log('Service Worker: Unknown message type:', type);
    }
});

/**
 * Get cache status information
 */
async function getCacheStatus() {
    const cacheNames = await caches.keys();
    const status = {};
    
    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        status[cacheName] = {
            size: keys.length,
            urls: keys.map(key => key.url)
        };
    }
    
    return status;
}

/**
 * Clear all caches
 */
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
}