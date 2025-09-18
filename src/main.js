/**
 * Main entry point for the Quiz Platform application
 * Initializes the application and sets up basic routing
 */

import './styles/main.css';
import './styles/error-handling.css';
import './styles/performance.css';
import { router } from './utils/router.js';
import { viewManager } from './utils/viewManager.js';
import { errorHandler } from './services/ErrorHandler.js';
import { offlineIndicator } from './components/OfflineIndicator.js';
import { quotaMonitor } from './components/QuotaMonitor.js';
import { initializeServiceWorker } from './utils/serviceWorkerManager.js';

// Application state
let isLoading = true;

/**
 * Initialize the application
 */
async function initializeApp() {
    try {
        console.log('Initializing Quiz Platform...');
        
        // Hide loading spinner and show main app
        hideLoading();
        
        // Initialize view manager
        viewManager.init();
        
        // Set up routing
        setupRouting();
        
        // Set up event listeners
        setupEventListeners();
        
        // Check for stored data and preferences
        await loadUserPreferences();
        
        // Initialize service worker for offline functionality
        initializeServiceWorker();
        
        console.log('Quiz Platform initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showError('Failed to initialize the application. Please refresh the page.');
    }
}

/**
 * Set up event listeners for navigation and UI interactions
 */
function setupEventListeners() {
    // Navigation buttons
    const navButtons = document.querySelectorAll('.nav-button');
    navButtons.forEach(button => {
        button.addEventListener('click', handleNavigation);
    });
    
    // Error retry button
    const retryButton = document.getElementById('error-retry');
    if (retryButton) {
        retryButton.addEventListener('click', () => {
            window.location.reload();
        });
    }
    
    // Error handling is now managed by the ErrorHandler service
    // Set up error listener for application-specific errors
    errorHandler.addErrorListener((error) => {
        console.error('Application error:', error);
        
        // Handle critical errors by showing the error boundary
        if (error.severity === 'CRITICAL') {
            showError(error.userMessage);
        }
    });
    
    // Custom navigation event handler
    window.addEventListener('navigate', (event) => {
        const { view } = event.detail;
        router.navigateTo(view);
    });
}

/**
 * Set up routing system
 */
function setupRouting() {
    // Register routes with the router
    router.register('dashboard', (route) => {
        viewManager.showView('dashboard');
    });
    
    router.register('create', (route) => {
        viewManager.showView('create');
    });
    
    router.register('settings', (route) => {
        viewManager.showView('settings');
    });
    
    router.register('quiz', (route) => {
        viewManager.showView('quiz');
    });
    
    router.register('results', (route) => {
        viewManager.showView('results');
    });
    
    // Set default route
    router.setDefaultRoute('dashboard');
}

/**
 * Handle navigation between different views
 */
function handleNavigation(event) {
    const targetView = event.target.id.replace('nav-', '');
    router.navigateTo(targetView);
}

/**
 * Navigate to a specific view (public API)
 */
function navigateToView(viewName, data = {}) {
    router.navigateTo(viewName);
}

/**
 * Load user preferences from local storage
 */
async function loadUserPreferences() {
    try {
        const preferences = localStorage.getItem('quiz-platform-preferences');
        if (preferences) {
            const parsedPreferences = JSON.parse(preferences);
            console.log('Loaded user preferences:', parsedPreferences);
            
            // Apply theme if set
            if (parsedPreferences.preferences && parsedPreferences.preferences.theme) {
                document.body.classList.add(`theme-${parsedPreferences.preferences.theme}`);
            }
        } else {
            // Apply default light theme
            document.body.classList.add('theme-light');
        }
    } catch (error) {
        console.warn('Failed to load user preferences:', error);
        // Apply default light theme on error
        document.body.classList.add('theme-light');
    }
}

/**
 * Hide loading spinner and show main application
 */
function hideLoading() {
    const loadingElement = document.getElementById('loading');
    const mainAppElement = document.getElementById('main-app');
    
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
    
    if (mainAppElement) {
        mainAppElement.style.display = 'block';
    }
    
    isLoading = false;
}

/**
 * Show error message to user
 */
function showError(message) {
    const errorBoundary = document.getElementById('error-boundary');
    const errorMessage = document.getElementById('error-message');
    const mainApp = document.getElementById('main-app');
    const loading = document.getElementById('loading');
    
    if (errorBoundary && errorMessage) {
        errorMessage.textContent = message;
        errorBoundary.style.display = 'block';
        
        if (mainApp) mainApp.style.display = 'none';
        if (loading) loading.style.display = 'none';
    }
}

/**
 * Utility function to check if the application is ready
 */
export function isAppReady() {
    return !isLoading;
}

/**
 * Get current view
 */
export function getCurrentView() {
    return viewManager.getCurrentView();
}

/**
 * Navigate to a view (public API)
 */
export function navigateTo(viewName, data = {}) {
    router.navigateTo(viewName);
}

// Initialize the application when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}