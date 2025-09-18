/**
 * Tests for the Router utility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { router } from '../utils/router.js';

// Mock DOM methods
Object.defineProperty(window, 'location', {
    value: {
        hash: '',
    },
    writable: true,
});

Object.defineProperty(window, 'history', {
    value: {
        pushState: vi.fn(),
        replaceState: vi.fn(),
    },
    writable: true,
});

describe('Router', () => {
    beforeEach(() => {
        // Clear any existing routes
        router.routes.clear();
        router.currentRoute = null;
        
        // Reset mocks
        vi.clearAllMocks();
    });

    it('should register routes correctly', () => {
        const handler = vi.fn();
        router.register('test', handler);
        
        expect(router.routes.has('test')).toBe(true);
        expect(router.routes.get('test')).toBe(handler);
    });

    it('should navigate to registered routes', () => {
        const handler = vi.fn();
        router.register('test', handler);
        
        router.navigateTo('test');
        
        expect(handler).toHaveBeenCalledWith('test');
        expect(router.getCurrentRoute()).toBe('test');
        expect(window.history.pushState).toHaveBeenCalledWith(
            { route: 'test' }, 
            '', 
            '#test'
        );
    });

    it('should handle navigation to unregistered routes', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        router.navigateTo('nonexistent');
        
        expect(consoleSpy).toHaveBeenCalledWith('No handler found for route: nonexistent');
        expect(router.getCurrentRoute()).toBeNull();
        
        consoleSpy.mockRestore();
    });

    it('should get route from URL hash', () => {
        window.location.hash = '#dashboard';
        expect(router.getRouteFromURL()).toBe('dashboard');
        
        window.location.hash = '';
        expect(router.getRouteFromURL()).toBeNull();
    });

    it('should set and use default route', () => {
        router.setDefaultRoute('home');
        expect(router.defaultRoute).toBe('home');
    });

    it('should navigate without pushing to history when specified', () => {
        const handler = vi.fn();
        router.register('test', handler);
        
        router.navigateTo('test', false);
        
        expect(handler).toHaveBeenCalledWith('test');
        expect(window.history.pushState).not.toHaveBeenCalled();
    });
});