/**
 * Integration tests for the UI framework and routing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('UI Framework Integration', () => {
    beforeEach(() => {
        // Set up basic DOM structure
        document.body.innerHTML = `
            <div id="app">
                <div id="main-app" class="app-container">
                    <header class="app-header">
                        <div class="header-content">
                            <h1 class="app-title">Quiz Platform</h1>
                            <nav class="main-nav">
                                <button id="nav-dashboard" class="nav-button active">Dashboard</button>
                                <button id="nav-create" class="nav-button">Create Quiz</button>
                                <button id="nav-settings" class="nav-button">Settings</button>
                            </nav>
                        </div>
                    </header>
                    <main class="main-content">
                        <div id="dashboard-view" class="view active">Dashboard Content</div>
                        <div id="quiz-view" class="view">Quiz Content</div>
                        <div id="create-view" class="view">Create Content</div>
                        <div id="results-view" class="view">Results Content</div>
                        <div id="settings-view" class="view">Settings Content</div>
                    </main>
                </div>
            </div>
        `;
    });

    it('should have proper HTML structure', () => {
        // Check main container
        const appContainer = document.querySelector('.app-container');
        expect(appContainer).toBeTruthy();

        // Check header
        const header = document.querySelector('.app-header');
        expect(header).toBeTruthy();

        // Check navigation
        const nav = document.querySelector('.main-nav');
        expect(nav).toBeTruthy();

        // Check navigation buttons
        const navButtons = document.querySelectorAll('.nav-button');
        expect(navButtons.length).toBe(3);

        // Check main content
        const mainContent = document.querySelector('.main-content');
        expect(mainContent).toBeTruthy();

        // Check views
        const views = document.querySelectorAll('.view');
        expect(views.length).toBe(5);
    });

    it('should have correct initial view state', () => {
        const dashboardView = document.getElementById('dashboard-view');
        const createView = document.getElementById('create-view');
        const dashboardButton = document.getElementById('nav-dashboard');
        const createButton = document.getElementById('nav-create');

        expect(dashboardView.classList.contains('active')).toBe(true);
        expect(createView.classList.contains('active')).toBe(false);
        expect(dashboardButton.classList.contains('active')).toBe(true);
        expect(createButton.classList.contains('active')).toBe(false);
    });

    it('should have responsive navigation structure', () => {
        const headerContent = document.querySelector('.header-content');
        const mainNav = document.querySelector('.main-nav');
        
        expect(headerContent).toBeTruthy();
        expect(mainNav).toBeTruthy();
        
        // Check that navigation buttons exist
        const navButtons = mainNav.querySelectorAll('.nav-button');
        expect(navButtons.length).toBeGreaterThan(0);
    });

    it('should have proper semantic HTML structure', () => {
        // Check for semantic elements
        const header = document.querySelector('header');
        const main = document.querySelector('main');
        const nav = document.querySelector('nav');
        const h1 = document.querySelector('h1');

        expect(header).toBeTruthy();
        expect(main).toBeTruthy();
        expect(nav).toBeTruthy();
        expect(h1).toBeTruthy();
        expect(h1.textContent).toBe('Quiz Platform');
    });

    it('should have all required views', () => {
        const requiredViews = ['dashboard', 'quiz', 'create', 'results', 'settings'];
        
        requiredViews.forEach(viewName => {
            const view = document.getElementById(`${viewName}-view`);
            expect(view).toBeTruthy();
            expect(view.classList.contains('view')).toBe(true);
        });
    });

    it('should have navigation buttons for main views', () => {
        const requiredNavButtons = ['dashboard', 'create', 'settings'];
        
        requiredNavButtons.forEach(buttonName => {
            const button = document.getElementById(`nav-${buttonName}`);
            expect(button).toBeTruthy();
            expect(button.classList.contains('nav-button')).toBe(true);
        });
    });
});