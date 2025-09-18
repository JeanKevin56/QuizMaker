/**
 * Performance optimization tests
 * Tests for lazy loading, image optimization, and service worker functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { lazyLoader, loadComponentWithIndicator } from '../utils/lazyLoader.js';
import { imageOptimizer } from '../utils/imageOptimizer.js';
import { performanceMonitor } from '../utils/performanceMonitor.js';

describe('Lazy Loading', () => {
    beforeEach(() => {
        lazyLoader.clearAllCache();
    });

    afterEach(() => {
        lazyLoader.clearAllCache();
    });

    it('should cache loaded components', async () => {
        // Mock dynamic import
        const mockComponent = { default: class MockComponent {} };
        vi.doMock('../components/MockComponent.js', () => mockComponent);

        // Load component twice
        const component1 = await lazyLoader.loadComponent('../components/MockComponent.js', 'MockComponent');
        const component2 = await lazyLoader.loadComponent('../components/MockComponent.js', 'MockComponent');

        // Should return same cached instance
        expect(component1).toBe(component2);
        
        const stats = lazyLoader.getCacheStats();
        expect(stats.cachedComponents).toBe(1);
        expect(stats.componentNames).toContain('MockComponent');
    });

    it('should handle loading failures gracefully', async () => {
        // Try to load non-existent component
        await expect(
            lazyLoader.loadComponent('../components/NonExistent.js', 'NonExistent')
        ).rejects.toThrow();

        const stats = lazyLoader.getCacheStats();
        expect(stats.cachedComponents).toBe(0);
    });

    it('should show loading indicator during component load', async () => {
        const container = document.createElement('div');
        document.body.appendChild(container);

        // Mock a slow-loading component
        const slowComponent = new Promise(resolve => {
            setTimeout(() => resolve({ default: class SlowComponent {} }), 100);
        });
        
        vi.doMock('../components/SlowComponent.js', () => slowComponent);

        const loadPromise = loadComponentWithIndicator(
            '../components/SlowComponent.js',
            'SlowComponent',
            container
        );

        // Should show loading spinner immediately
        expect(container.innerHTML).toContain('loading-spinner');

        await loadPromise;

        // Should clear loading spinner after load
        expect(container.innerHTML).not.toContain('loading-spinner');

        document.body.removeChild(container);
    });

    it('should preload components', async () => {
        const components = [
            { path: '../components/Component1.js', name: 'Component1' },
            { path: '../components/Component2.js', name: 'Component2' }
        ];

        // Mock components
        vi.doMock('../components/Component1.js', () => ({ default: class Component1 {} }));
        vi.doMock('../components/Component2.js', () => ({ default: class Component2 {} }));

        await lazyLoader.preloadComponents(components);

        const stats = lazyLoader.getCacheStats();
        expect(stats.cachedComponents).toBe(2);
    });
});

describe('Image Optimization', () => {
    let mockCanvas;
    let mockContext;

    beforeEach(() => {
        // Mock canvas and context
        mockContext = {
            drawImage: vi.fn(),
        };
        
        mockCanvas = {
            width: 0,
            height: 0,
            getContext: vi.fn(() => mockContext),
            toBlob: vi.fn((callback) => {
                const mockBlob = new Blob(['mock image data'], { type: 'image/jpeg' });
                callback(mockBlob);
            })
        };

        global.document.createElement = vi.fn((tagName) => {
            if (tagName === 'canvas') return mockCanvas;
            return document.createElement(tagName);
        });

        // Mock FileReader
        global.FileReader = class MockFileReader {
            readAsDataURL(blob) {
                this.result = 'data:image/jpeg;base64,mockdata';
                setTimeout(() => this.onload(), 0);
            }
        };

        // Mock Image
        global.Image = class MockImage {
            constructor() {
                this.width = 800;
                this.height = 600;
                setTimeout(() => this.onload(), 0);
            }
            
            set src(value) {
                this._src = value;
            }
            
            get src() {
                return this._src;
            }
        };

        // Mock URL.createObjectURL
        global.URL.createObjectURL = vi.fn(() => 'mock-object-url');
    });

    it('should validate image files', () => {
        const validFile = new File([''], 'test.jpg', { type: 'image/jpeg', size: 1024 });
        const invalidFile = new File([''], 'test.txt', { type: 'text/plain', size: 1024 });
        const largeFile = new File(['x'.repeat(15 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });

        const validResult = imageOptimizer.validateImage(validFile);
        expect(validResult.isValid).toBe(true);

        const invalidResult = imageOptimizer.validateImage(invalidFile);
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errors.some(error => error.includes('not supported'))).toBe(true);

        const largeResult = imageOptimizer.validateImage(largeFile);
        expect(largeResult.isValid).toBe(false);
        expect(largeResult.errors.some(error => error.includes('exceeds maximum'))).toBe(true);
    });

    it('should calculate optimal dimensions', () => {
        const result = imageOptimizer.calculateDimensions(1600, 1200, 800, 600);
        expect(result.width).toBe(800);
        expect(result.height).toBe(600);

        const result2 = imageOptimizer.calculateDimensions(400, 300, 800, 600);
        expect(result2.width).toBe(400);
        expect(result2.height).toBe(300);
    });

    it('should optimize images', async () => {
        const mockFile = new File(['mock image data'], 'test.jpg', { 
            type: 'image/jpeg', 
            size: 2048 
        });

        const result = await imageOptimizer.optimizeImage(mockFile, {
            maxWidth: 400,
            maxHeight: 300,
            quality: 0.8
        });

        expect(result).toHaveProperty('blob');
        expect(result).toHaveProperty('dataUrl');
        expect(result).toHaveProperty('size');
        expect(result).toHaveProperty('width');
        expect(result).toHaveProperty('height');
        expect(result.width).toBeLessThanOrEqual(400);
        expect(result.height).toBeLessThanOrEqual(300);
    });

    it('should format file sizes correctly', () => {
        expect(imageOptimizer.formatFileSize(0)).toBe('0 Bytes');
        expect(imageOptimizer.formatFileSize(1024)).toBe('1 KB');
        expect(imageOptimizer.formatFileSize(1024 * 1024)).toBe('1 MB');
        expect(imageOptimizer.formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should detect WebP support', () => {
        // Mock canvas toDataURL for WebP support test
        mockCanvas.toDataURL = vi.fn((format) => {
            if (format === 'image/webp') {
                return 'data:image/webp;base64,mockdata';
            }
            return 'data:image/png;base64,mockdata';
        });

        const supportsWebP = imageOptimizer.supportsWebP();
        expect(typeof supportsWebP).toBe('boolean');
    });

    it('should batch optimize multiple images', async () => {
        const files = [
            new File([''], 'image1.jpg', { type: 'image/jpeg', size: 1024 }),
            new File([''], 'image2.png', { type: 'image/png', size: 2048 }),
            new File([''], 'invalid.txt', { type: 'text/plain', size: 512 })
        ];

        const progressCallback = vi.fn();
        const results = await imageOptimizer.batchOptimize(files, {}, progressCallback);

        expect(results).toHaveLength(3);
        expect(results[0].success).toBe(true);
        expect(results[1].success).toBe(true);
        expect(results[2].success).toBe(false);
        expect(progressCallback).toHaveBeenCalled();
    });
});

describe('Performance Monitor', () => {
    beforeEach(() => {
        // Mock performance API
        global.performance = {
            now: vi.fn(() => Date.now()),
            mark: vi.fn(),
            measure: vi.fn(),
            getEntriesByName: vi.fn(() => [{ duration: 100 }]),
            getEntriesByType: vi.fn(() => []),
            memory: {
                usedJSHeapSize: 1024 * 1024,
                totalJSHeapSize: 2 * 1024 * 1024,
                jsHeapSizeLimit: 4 * 1024 * 1024
            }
        };

        // Mock PerformanceObserver
        global.PerformanceObserver = class MockPerformanceObserver {
            constructor(callback) {
                this.callback = callback;
            }
            
            observe() {}
            disconnect() {}
        };

        // Mock navigator
        global.navigator = {
            ...global.navigator,
            connection: {
                effectiveType: '4g',
                downlink: 10,
                rtt: 50,
                saveData: false
            }
        };
    });

    it('should record metrics', () => {
        performanceMonitor.recordMetric('TestMetric', 100);
        const metrics = performanceMonitor.getMetrics();
        expect(metrics.TestMetric).toBe(100);
    });

    it('should record cumulative metrics', () => {
        performanceMonitor.recordMetric('CumulativeMetric', 50, true);
        performanceMonitor.recordMetric('CumulativeMetric', 30, true);
        const metrics = performanceMonitor.getMetrics();
        expect(metrics.CumulativeMetric).toBe(80);
    });

    it('should time function execution', async () => {
        const testFunction = async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return 'result';
        };

        const { result, duration } = await performanceMonitor.timeFunction('TestFunction', testFunction);
        
        expect(result).toBe('result');
        expect(duration).toBeGreaterThan(0);
        
        const metrics = performanceMonitor.getMetrics();
        expect(metrics.TestFunction).toBeDefined();
    });

    it('should get memory usage', () => {
        const memory = performanceMonitor.getMemoryUsage();
        expect(memory).toHaveProperty('used');
        expect(memory).toHaveProperty('total');
        expect(memory).toHaveProperty('limit');
    });

    it('should get network information', () => {
        const network = performanceMonitor.getNetworkInfo();
        expect(network).toHaveProperty('effectiveType');
        expect(network).toHaveProperty('downlink');
        expect(network).toHaveProperty('rtt');
    });

    it('should generate performance report', () => {
        performanceMonitor.recordMetric('FCP', 1500);
        performanceMonitor.recordMetric('LCP', 2000);
        
        const report = performanceMonitor.generateReport();
        
        expect(report).toHaveProperty('timestamp');
        expect(report).toHaveProperty('summary');
        expect(report).toHaveProperty('memory');
        expect(report).toHaveProperty('network');
        expect(report).toHaveProperty('recommendations');
        expect(report.summary.coreWebVitals.fcp).toBe(1500);
        expect(report.summary.coreWebVitals.lcp).toBe(2000);
    });

    it('should generate recommendations', () => {
        performanceMonitor.recordMetric('FCP', 3000); // Above threshold
        performanceMonitor.recordMetric('LCP', 3500); // Above threshold
        
        const report = performanceMonitor.generateReport();
        expect(report.recommendations.length).toBeGreaterThan(0);
        expect(report.recommendations.some(rec => rec.includes('First Contentful Paint'))).toBe(true);
        expect(report.recommendations.some(rec => rec.includes('Largest Contentful Paint'))).toBe(true);
    });
});

describe('Service Worker Integration', () => {
    beforeEach(() => {
        // Mock service worker API
        global.navigator.serviceWorker = {
            register: vi.fn(() => Promise.resolve({
                addEventListener: vi.fn(),
                update: vi.fn(() => Promise.resolve())
            })),
            controller: {
                postMessage: vi.fn()
            },
            addEventListener: vi.fn()
        };

        // Mock caches API
        global.caches = {
            open: vi.fn(() => Promise.resolve({
                addAll: vi.fn(() => Promise.resolve()),
                put: vi.fn(() => Promise.resolve()),
                match: vi.fn(() => Promise.resolve()),
                keys: vi.fn(() => Promise.resolve([]))
            })),
            keys: vi.fn(() => Promise.resolve([])),
            delete: vi.fn(() => Promise.resolve(true)),
            match: vi.fn(() => Promise.resolve())
        };
    });

    it('should register service worker', async () => {
        const { serviceWorkerManager } = await import('../utils/serviceWorkerManager.js');
        
        expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/src/sw.js', {
            scope: '/'
        });
    });

    it('should handle online/offline events', async () => {
        const { serviceWorkerManager } = await import('../utils/serviceWorkerManager.js');
        
        const onlineCallback = vi.fn();
        const offlineCallback = vi.fn();
        
        serviceWorkerManager.addEventListener('online', onlineCallback);
        serviceWorkerManager.addEventListener('offline', offlineCallback);
        
        // Simulate online event
        window.dispatchEvent(new Event('online'));
        expect(onlineCallback).toHaveBeenCalled();
        
        // Simulate offline event
        window.dispatchEvent(new Event('offline'));
        expect(offlineCallback).toHaveBeenCalled();
    });
});