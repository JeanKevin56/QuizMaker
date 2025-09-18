/**
 * Lazy loading utility for components and modules
 * Implements dynamic imports with caching and error handling
 */

class LazyLoader {
    constructor() {
        this.cache = new Map();
        this.loadingPromises = new Map();
    }

    /**
     * Lazy load a component with caching
     * @param {string} componentPath - Path to the component module
     * @param {string} componentName - Name of the component for caching
     * @returns {Promise<Object>} The loaded component
     */
    async loadComponent(componentPath, componentName) {
        // Return cached component if available
        if (this.cache.has(componentName)) {
            return this.cache.get(componentName);
        }

        // Return existing loading promise if component is being loaded
        if (this.loadingPromises.has(componentName)) {
            return this.loadingPromises.get(componentName);
        }

        // Create loading promise
        const loadingPromise = this.loadModule(componentPath, componentName);
        this.loadingPromises.set(componentName, loadingPromise);

        try {
            const component = await loadingPromise;
            this.cache.set(componentName, component);
            this.loadingPromises.delete(componentName);
            return component;
        } catch (error) {
            this.loadingPromises.delete(componentName);
            throw error;
        }
    }

    /**
     * Load a module dynamically
     * @param {string} modulePath - Path to the module
     * @param {string} moduleName - Name for error reporting
     * @returns {Promise<Object>} The loaded module
     */
    async loadModule(modulePath, moduleName) {
        try {
            const module = await import(modulePath);
            console.log(`Lazy loaded: ${moduleName}`);
            return module;
        } catch (error) {
            console.error(`Failed to lazy load ${moduleName}:`, error);
            throw new Error(`Failed to load ${moduleName}: ${error.message}`);
        }
    }

    /**
     * Preload components for better performance
     * @param {Array<{path: string, name: string}>} components - Components to preload
     */
    async preloadComponents(components) {
        const preloadPromises = components.map(({ path, name }) => 
            this.loadComponent(path, name).catch(error => {
                console.warn(`Failed to preload ${name}:`, error);
                return null;
            })
        );

        await Promise.allSettled(preloadPromises);
        console.log('Component preloading completed');
    }

    /**
     * Clear cache for a specific component
     * @param {string} componentName - Name of the component to clear
     */
    clearCache(componentName) {
        this.cache.delete(componentName);
        this.loadingPromises.delete(componentName);
    }

    /**
     * Clear all cached components
     */
    clearAllCache() {
        this.cache.clear();
        this.loadingPromises.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        return {
            cachedComponents: this.cache.size,
            loadingComponents: this.loadingPromises.size,
            componentNames: Array.from(this.cache.keys())
        };
    }
}

// Create singleton instance
export const lazyLoader = new LazyLoader();

/**
 * Lazy load component with loading indicator
 * @param {string} componentPath - Path to component
 * @param {string} componentName - Component name
 * @param {HTMLElement} container - Container to show loading in
 * @returns {Promise<Object>} Loaded component
 */
export async function loadComponentWithIndicator(componentPath, componentName, container) {
    // Show loading indicator
    if (container) {
        container.innerHTML = '<div class="loading-spinner">Loading...</div>';
    }

    try {
        const component = await lazyLoader.loadComponent(componentPath, componentName);
        
        // Clear loading indicator
        if (container) {
            container.innerHTML = '';
        }
        
        return component;
    } catch (error) {
        // Show error message
        if (container) {
            container.innerHTML = `<div class="error-message">Failed to load ${componentName}</div>`;
        }
        throw error;
    }
}

/**
 * Intersection Observer based lazy loading for components
 * @param {HTMLElement} element - Element to observe
 * @param {string} componentPath - Path to component
 * @param {string} componentName - Component name
 * @param {Function} callback - Callback when component is loaded
 */
export function observeAndLoad(element, componentPath, componentName, callback) {
    const observer = new IntersectionObserver(
        async (entries) => {
            const [entry] = entries;
            if (entry.isIntersecting) {
                observer.disconnect();
                
                try {
                    const component = await loadComponentWithIndicator(
                        componentPath, 
                        componentName, 
                        element
                    );
                    callback(component);
                } catch (error) {
                    console.error(`Failed to lazy load ${componentName}:`, error);
                }
            }
        },
        { threshold: 0.1 }
    );

    observer.observe(element);
}