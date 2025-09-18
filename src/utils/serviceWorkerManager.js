/**
 * Service Worker Manager
 * Handles service worker registration, updates, and communication
 */

class ServiceWorkerManager {
    constructor() {
        this.registration = null;
        this.isOnline = navigator.onLine;
        this.updateAvailable = false;
        this.listeners = {
            online: [],
            offline: [],
            updateAvailable: [],
            updateInstalled: []
        };
        
        this.init();
    }

    /**
     * Initialize service worker manager
     */
    async init() {
        // Check if service workers are supported
        if (!('serviceWorker' in navigator)) {
            console.warn('Service workers are not supported in this browser');
            return;
        }

        // Set up online/offline listeners
        this.setupOnlineOfflineListeners();

        try {
            await this.registerServiceWorker();
            this.setupUpdateListeners();
        } catch (error) {
            console.error('Failed to initialize service worker:', error);
        }
    }

    /**
     * Register the service worker
     */
    async registerServiceWorker() {
        try {
            this.registration = await navigator.serviceWorker.register('/src/sw.js', {
                scope: '/'
            });

            console.log('Service Worker registered successfully:', this.registration);

            // Check for updates immediately
            await this.checkForUpdates();

            // Set up periodic update checks
            this.setupPeriodicUpdateCheck();

        } catch (error) {
            console.error('Service Worker registration failed:', error);
            throw error;
        }
    }

    /**
     * Set up listeners for service worker updates
     */
    setupUpdateListeners() {
        if (!this.registration) return;

        // Listen for new service worker installing
        this.registration.addEventListener('updatefound', () => {
            const newWorker = this.registration.installing;
            
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed') {
                    if (navigator.serviceWorker.controller) {
                        // New update available
                        this.updateAvailable = true;
                        this.notifyListeners('updateAvailable', { registration: this.registration });
                    } else {
                        // First install
                        this.notifyListeners('updateInstalled', { registration: this.registration });
                    }
                }
            });
        });

        // Listen for controller changes
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
        });
    }

    /**
     * Set up online/offline event listeners
     */
    setupOnlineOfflineListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.notifyListeners('online');
            this.syncWhenOnline();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.notifyListeners('offline');
        });
    }

    /**
     * Check for service worker updates
     */
    async checkForUpdates() {
        if (!this.registration) return;

        try {
            await this.registration.update();
        } catch (error) {
            console.error('Failed to check for updates:', error);
        }
    }

    /**
     * Set up periodic update checks
     */
    setupPeriodicUpdateCheck() {
        // Check for updates every 30 minutes
        setInterval(() => {
            this.checkForUpdates();
        }, 30 * 60 * 1000);
    }

    /**
     * Apply pending service worker update
     */
    async applyUpdate() {
        if (!this.registration || !this.registration.waiting) {
            return false;
        }

        // Tell the waiting service worker to skip waiting
        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        return true;
    }

    /**
     * Get cache status from service worker
     */
    async getCacheStatus() {
        if (!navigator.serviceWorker.controller) {
            return null;
        }

        return new Promise((resolve) => {
            const messageChannel = new MessageChannel();
            
            messageChannel.port1.onmessage = (event) => {
                resolve(event.data);
            };

            navigator.serviceWorker.controller.postMessage(
                { type: 'GET_CACHE_STATUS' },
                [messageChannel.port2]
            );
        });
    }

    /**
     * Clear all caches
     */
    async clearCaches() {
        if (!navigator.serviceWorker.controller) {
            return false;
        }

        return new Promise((resolve) => {
            const messageChannel = new MessageChannel();
            
            messageChannel.port1.onmessage = (event) => {
                resolve(event.data.success);
            };

            navigator.serviceWorker.controller.postMessage(
                { type: 'CLEAR_CACHE' },
                [messageChannel.port2]
            );
        });
    }

    /**
     * Trigger background sync when online
     */
    async syncWhenOnline() {
        if (!this.registration || !this.registration.sync) {
            return;
        }

        try {
            await this.registration.sync.register('quiz-data-sync');
            await this.registration.sync.register('api-retry');
        } catch (error) {
            console.error('Background sync registration failed:', error);
        }
    }

    /**
     * Add event listener
     */
    addEventListener(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    /**
     * Remove event listener
     */
    removeEventListener(event, callback) {
        if (this.listeners[event]) {
            const index = this.listeners[event].indexOf(callback);
            if (index > -1) {
                this.listeners[event].splice(index, 1);
            }
        }
    }

    /**
     * Notify all listeners of an event
     */
    notifyListeners(event, data = null) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${event} listener:`, error);
                }
            });
        }
    }

    /**
     * Get online status
     */
    getOnlineStatus() {
        return this.isOnline;
    }

    /**
     * Check if update is available
     */
    isUpdateAvailable() {
        return this.updateAvailable;
    }

    /**
     * Get service worker registration
     */
    getRegistration() {
        return this.registration;
    }

    /**
     * Unregister service worker (for development/testing)
     */
    async unregister() {
        if (this.registration) {
            const result = await this.registration.unregister();
            console.log('Service Worker unregistered:', result);
            return result;
        }
        return false;
    }
}

// Create singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

/**
 * Utility functions for common service worker operations
 */

/**
 * Check if the app is running offline
 */
export function isOffline() {
    return !serviceWorkerManager.getOnlineStatus();
}

/**
 * Show update notification to user
 */
export function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
        <div class="update-message">
            <p>A new version of Quiz Platform is available!</p>
            <button id="update-app-btn" class="btn btn-primary">Update Now</button>
            <button id="dismiss-update-btn" class="btn btn-secondary">Later</button>
        </div>
    `;

    document.body.appendChild(notification);

    // Handle update button click
    document.getElementById('update-app-btn').addEventListener('click', async () => {
        const updated = await serviceWorkerManager.applyUpdate();
        if (updated) {
            notification.remove();
        }
    });

    // Handle dismiss button click
    document.getElementById('dismiss-update-btn').addEventListener('click', () => {
        notification.remove();
    });
}

/**
 * Initialize service worker with default event handlers
 */
export function initializeServiceWorker() {
    // Show update notification when available
    serviceWorkerManager.addEventListener('updateAvailable', () => {
        showUpdateNotification();
    });

    // Log online/offline status changes
    serviceWorkerManager.addEventListener('online', () => {
        console.log('App is now online');
    });

    serviceWorkerManager.addEventListener('offline', () => {
        console.log('App is now offline');
    });
}