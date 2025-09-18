/**
 * Simple client-side router for the Quiz Platform
 * Handles view navigation and browser history management
 */

class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.defaultRoute = 'dashboard';
        
        // Bind methods to preserve context
        this.handlePopState = this.handlePopState.bind(this);
        this.init();
    }
    
    /**
     * Initialize the router
     */
    init() {
        // Listen for browser back/forward buttons
        window.addEventListener('popstate', this.handlePopState);
        
        // Handle initial route
        const initialRoute = this.getRouteFromURL() || this.defaultRoute;
        this.navigateTo(initialRoute, false);
    }
    
    /**
     * Register a route with its handler
     * @param {string} path - Route path
     * @param {Function} handler - Route handler function
     */
    register(path, handler) {
        this.routes.set(path, handler);
    }
    
    /**
     * Navigate to a specific route
     * @param {string} path - Route path
     * @param {boolean} pushState - Whether to push to browser history
     */
    navigateTo(path, pushState = true) {
        const handler = this.routes.get(path);
        
        if (!handler) {
            console.warn(`No handler found for route: ${path}`);
            return;
        }
        
        // Update browser history
        if (pushState) {
            history.pushState({ route: path }, '', `#${path}`);
        }
        
        // Execute route handler
        try {
            handler(path);
            this.currentRoute = path;
        } catch (error) {
            console.error(`Error executing route handler for ${path}:`, error);
        }
    }
    
    /**
     * Handle browser back/forward navigation
     * @param {PopStateEvent} event 
     */
    handlePopState(event) {
        const route = event.state?.route || this.getRouteFromURL() || this.defaultRoute;
        this.navigateTo(route, false);
    }
    
    /**
     * Get route from current URL hash
     * @returns {string|null} Route path
     */
    getRouteFromURL() {
        const hash = window.location.hash.slice(1);
        return hash || null;
    }
    
    /**
     * Get current route
     * @returns {string} Current route path
     */
    getCurrentRoute() {
        return this.currentRoute;
    }
    
    /**
     * Set default route
     * @param {string} route - Default route path
     */
    setDefaultRoute(route) {
        this.defaultRoute = route;
    }
}

// Create and export router instance
export const router = new Router();
export default router;