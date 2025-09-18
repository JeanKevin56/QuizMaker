/**
 * View Manager for handling view transitions and state
 * Provides a centralized way to manage different application views with lazy loading
 */

import { lazyLoader, loadComponentWithIndicator } from './lazyLoader.js';

class ViewManager {
    constructor() {
        this.views = new Map();
        this.currentView = null;
        this.viewContainer = null;
        this.navButtons = new Map();
        this.componentInstances = new Map();
    }
    
    /**
     * Initialize the view manager
     */
    init() {
        this.viewContainer = document.querySelector('.main-content');
        
        if (!this.viewContainer) {
            throw new Error('View container not found');
        }
        
        // Register default views
        this.registerView('dashboard', document.getElementById('dashboard-view'));
        this.registerView('quiz', document.getElementById('quiz-view'));
        this.registerView('create', document.getElementById('create-view'));
        this.registerView('results', document.getElementById('results-view'));
        this.registerView('settings', document.getElementById('settings-view'));
        
        // Register navigation buttons
        this.registerNavButton('dashboard', document.getElementById('nav-dashboard'));
        this.registerNavButton('create', document.getElementById('nav-create'));
        this.registerNavButton('settings', document.getElementById('nav-settings'));
    }
    
    /**
     * Register a view element
     * @param {string} name - View name
     * @param {HTMLElement} element - View element
     */
    registerView(name, element) {
        if (element) {
            this.views.set(name, element);
        }
    }
    
    /**
     * Register a navigation button
     * @param {string} viewName - Associated view name
     * @param {HTMLElement} button - Button element
     */
    registerNavButton(viewName, button) {
        if (button) {
            this.navButtons.set(viewName, button);
        }
    }
    
    /**
     * Show a specific view
     * @param {string} viewName - Name of the view to show
     * @param {Object} data - Optional data to pass to the view
     */
    showView(viewName, data = {}) {
        // Hide all views
        this.views.forEach((view, name) => {
            if (view) {
                view.classList.remove('active');
            }
        });
        
        // Remove active class from all nav buttons
        this.navButtons.forEach(button => {
            if (button) {
                button.classList.remove('active');
            }
        });
        
        // Show target view
        const targetView = this.views.get(viewName);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewName;
            
            // Update active nav button
            const navButton = this.navButtons.get(viewName);
            if (navButton) {
                navButton.classList.add('active');
            }
            
            // Update page title
            this.updatePageTitle(viewName);
            
            // Trigger view-specific initialization if needed
            this.onViewShow(viewName, data);
        } else {
            console.warn(`View not found: ${viewName}`);
        }
    }
    
    /**
     * Get current view name
     * @returns {string|null} Current view name
     */
    getCurrentView() {
        return this.currentView;
    }
    
    /**
     * Update page title based on current view
     * @param {string} viewName - View name
     */
    updatePageTitle(viewName) {
        const titles = {
            dashboard: 'Dashboard - Quiz Platform',
            create: 'Create Quiz - Quiz Platform',
            settings: 'Settings - Quiz Platform',
            quiz: 'Taking Quiz - Quiz Platform',
            results: 'Quiz Results - Quiz Platform'
        };
        
        document.title = titles[viewName] || 'Quiz Platform';
    }
    
    /**
     * Handle view-specific initialization
     * @param {string} viewName - View name
     * @param {Object} data - View data
     */
    onViewShow(viewName, data) {
        // Emit custom event for view change
        const event = new CustomEvent('viewchange', {
            detail: { viewName, data, previousView: this.currentView }
        });
        window.dispatchEvent(event);
        
        // View-specific logic can be added here
        switch (viewName) {
            case 'dashboard':
                this.initializeDashboard(data);
                break;
            case 'quiz':
                this.initializeQuiz(data);
                break;
            case 'create':
                this.initializeCreate(data);
                break;
            case 'results':
                this.initializeResults(data);
                break;
            case 'settings':
                this.initializeSettings(data);
                break;
        }
    }
    
    /**
     * Initialize dashboard view with lazy loading
     * @param {Object} data - View data
     */
    async initializeDashboard(data) {
        const dashboardView = this.views.get('dashboard');
        if (!dashboardView) return;

        try {
            const { QuizDashboard } = await loadComponentWithIndicator(
                '../components/QuizDashboard.js',
                'QuizDashboard',
                dashboardView
            );
            
            let dashboard = this.componentInstances.get('dashboard');
            if (!dashboard) {
                dashboard = new QuizDashboard();
                this.componentInstances.set('dashboard', dashboard);
            }
            
            dashboard.init(dashboardView);
        } catch (error) {
            console.error('Failed to load quiz dashboard:', error);
            dashboardView.innerHTML = '<div class="error-message">Failed to load dashboard</div>';
        }
    }
    
    /**
     * Initialize quiz taking view
     * @param {Object} data - View data
     */
    initializeQuiz(data) {
        // Quiz taking initialization logic will be implemented in future tasks
        console.log('Quiz view initialized', data);
    }
    
    /**
     * Initialize quiz creation view with lazy loading
     * @param {Object} data - View data
     */
    async initializeCreate(data) {
        const createView = this.views.get('create');
        if (!createView) return;

        try {
            const { QuizCreator } = await loadComponentWithIndicator(
                '../components/QuizCreator.js',
                'QuizCreator',
                createView
            );
            
            let quizCreator = this.componentInstances.get('create');
            if (!quizCreator) {
                quizCreator = new QuizCreator();
                this.componentInstances.set('create', quizCreator);
            }
            
            quizCreator.init(createView, data.quiz);
        } catch (error) {
            console.error('Failed to load quiz creator:', error);
            createView.innerHTML = '<div class="error-message">Failed to load quiz creator</div>';
        }
    }
    
    /**
     * Initialize results view
     * @param {Object} data - View data
     */
    initializeResults(data) {
        // Results initialization logic will be implemented in future tasks
        console.log('Results view initialized', data);
    }
    
    /**
     * Initialize settings view with lazy loading
     * @param {Object} data - View data
     */
    async initializeSettings(data) {
        const settingsView = this.views.get('settings');
        if (!settingsView) return;

        try {
            const { Settings } = await loadComponentWithIndicator(
                '../components/Settings.js',
                'Settings',
                settingsView
            );
            
            let settings = this.componentInstances.get('settings');
            if (!settings) {
                settings = new Settings();
                this.componentInstances.set('settings', settings);
            }
            
            settings.init(settingsView);
        } catch (error) {
            console.error('Failed to load settings:', error);
            settingsView.innerHTML = '<div class="error-message">Failed to load settings</div>';
        }
    }
    
    /**
     * Create a new view dynamically
     * @param {string} name - View name
     * @param {string} content - HTML content
     * @returns {HTMLElement} Created view element
     */
    createView(name, content = '') {
        const viewElement = document.createElement('div');
        viewElement.id = `${name}-view`;
        viewElement.className = 'view';
        viewElement.innerHTML = content;
        
        // Add to view container
        if (this.viewContainer) {
            this.viewContainer.appendChild(viewElement);
        }
        
        // Register the view
        this.registerView(name, viewElement);
        
        return viewElement;
    }
}

// Create and export view manager instance
export const viewManager = new ViewManager();
export default viewManager;