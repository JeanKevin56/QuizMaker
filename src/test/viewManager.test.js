/**
 * Tests for the ViewManager utility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { viewManager } from '../utils/viewManager.js';

// Mock DOM
const mockElement = (id) => ({
    id,
    classList: {
        add: vi.fn(),
        remove: vi.fn(),
    },
});

describe('ViewManager', () => {
    beforeEach(() => {
        // Reset view manager state
        viewManager.views.clear();
        viewManager.navButtons.clear();
        viewManager.currentView = null;
        
        // Mock document methods
        global.document = {
            querySelector: vi.fn(),
            getElementById: vi.fn(),
            title: '',
        };
        
        global.window = {
            dispatchEvent: vi.fn(),
        };
        
        // Mock CustomEvent
        global.CustomEvent = vi.fn();
    });

    it('should register views correctly', () => {
        const mockView = mockElement('test-view');
        viewManager.registerView('test', mockView);
        
        expect(viewManager.views.has('test')).toBe(true);
        expect(viewManager.views.get('test')).toBe(mockView);
    });

    it('should register navigation buttons correctly', () => {
        const mockButton = mockElement('nav-test');
        viewManager.registerNavButton('test', mockButton);
        
        expect(viewManager.navButtons.has('test')).toBe(true);
        expect(viewManager.navButtons.get('test')).toBe(mockButton);
    });

    it('should show views correctly', () => {
        const mockView1 = mockElement('view1');
        const mockView2 = mockElement('view2');
        const mockButton1 = mockElement('nav-view1');
        const mockButton2 = mockElement('nav-view2');
        
        viewManager.registerView('view1', mockView1);
        viewManager.registerView('view2', mockView2);
        viewManager.registerNavButton('view1', mockButton1);
        viewManager.registerNavButton('view2', mockButton2);
        
        viewManager.showView('view2');
        
        expect(mockView1.classList.remove).toHaveBeenCalledWith('active');
        expect(mockView2.classList.add).toHaveBeenCalledWith('active');
        expect(mockButton1.classList.remove).toHaveBeenCalledWith('active');
        expect(mockButton2.classList.add).toHaveBeenCalledWith('active');
        expect(viewManager.getCurrentView()).toBe('view2');
    });

    it('should update page title when showing views', () => {
        const mockView = mockElement('dashboard-view');
        viewManager.registerView('dashboard', mockView);
        
        viewManager.showView('dashboard');
        
        expect(document.title).toBe('Dashboard - Quiz Platform');
    });

    it('should handle showing non-existent views', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        viewManager.showView('nonexistent');
        
        expect(consoleSpy).toHaveBeenCalledWith('View not found: nonexistent');
        
        consoleSpy.mockRestore();
    });

    it('should create new views dynamically', () => {
        const mockContainer = {
            appendChild: vi.fn(),
        };
        viewManager.viewContainer = mockContainer;
        
        const newView = viewManager.createView('dynamic', '<p>Test content</p>');
        
        expect(newView.id).toBe('dynamic-view');
        expect(newView.className).toBe('view');
        expect(newView.innerHTML).toBe('<p>Test content</p>');
        expect(mockContainer.appendChild).toHaveBeenCalledWith(newView);
        expect(viewManager.views.has('dynamic')).toBe(true);
    });
});