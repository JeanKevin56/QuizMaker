/**
 * Performance monitoring utility
 * Tracks and reports application performance metrics
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.observers = [];
        this.isEnabled = process.env.NODE_ENV !== 'production';
        this.thresholds = {
            fcp: 2000, // First Contentful Paint
            lcp: 2500, // Largest Contentful Paint
            fid: 100,  // First Input Delay
            cls: 0.1   // Cumulative Layout Shift
        };
        
        if (this.isEnabled) {
            this.init();
        }
    }

    /**
     * Initialize performance monitoring
     */
    init() {
        this.observeWebVitals();
        this.observeResourceTiming();
        this.observeLongTasks();
        this.setupPerformanceObserver();
    }

    /**
     * Observe Core Web Vitals
     */
    observeWebVitals() {
        // First Contentful Paint
        this.observeMetric('first-contentful-paint', (entry) => {
            this.recordMetric('FCP', entry.startTime);
        });

        // Largest Contentful Paint
        this.observeMetric('largest-contentful-paint', (entry) => {
            this.recordMetric('LCP', entry.startTime);
        });

        // First Input Delay
        this.observeMetric('first-input', (entry) => {
            this.recordMetric('FID', entry.processingStart - entry.startTime);
        });

        // Cumulative Layout Shift
        this.observeMetric('layout-shift', (entry) => {
            if (!entry.hadRecentInput) {
                this.recordMetric('CLS', entry.value, true); // Cumulative
            }
        });
    }

    /**
     * Observe resource timing
     */
    observeResourceTiming() {
        this.observeMetric('resource', (entry) => {
            const duration = entry.responseEnd - entry.startTime;
            const resourceType = this.getResourceType(entry.name);
            
            this.recordMetric(`Resource-${resourceType}`, duration);
            
            // Track slow resources
            if (duration > 1000) {
                console.warn(`Slow resource detected: ${entry.name} (${duration.toFixed(2)}ms)`);
            }
        });
    }

    /**
     * Observe long tasks
     */
    observeLongTasks() {
        this.observeMetric('longtask', (entry) => {
            const duration = entry.duration;
            this.recordMetric('LongTask', duration);
            
            if (duration > 50) {
                console.warn(`Long task detected: ${duration.toFixed(2)}ms`);
            }
        });
    }

    /**
     * Set up performance observer for a specific metric
     */
    observeMetric(type, callback) {
        try {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach(callback);
            });
            
            observer.observe({ type, buffered: true });
            this.observers.push(observer);
        } catch (error) {
            console.warn(`Failed to observe ${type}:`, error);
        }
    }

    /**
     * Set up general performance observer
     */
    setupPerformanceObserver() {
        // Navigation timing
        if (performance.getEntriesByType) {
            const navEntries = performance.getEntriesByType('navigation');
            if (navEntries.length > 0) {
                const nav = navEntries[0];
                this.recordMetric('DOMContentLoaded', nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart);
                this.recordMetric('LoadComplete', nav.loadEventEnd - nav.loadEventStart);
                this.recordMetric('TTFB', nav.responseStart - nav.requestStart);
            }
        }
    }

    /**
     * Record a performance metric
     */
    recordMetric(name, value, cumulative = false) {
        if (cumulative) {
            const existing = this.metrics.get(name) || 0;
            this.metrics.set(name, existing + value);
        } else {
            this.metrics.set(name, value);
        }

        // Check against thresholds
        this.checkThreshold(name, this.metrics.get(name));
    }

    /**
     * Check if metric exceeds threshold
     */
    checkThreshold(name, value) {
        const thresholdKey = name.toLowerCase();
        const threshold = this.thresholds[thresholdKey];
        
        if (threshold && value > threshold) {
            console.warn(`Performance threshold exceeded: ${name} = ${value.toFixed(2)} (threshold: ${threshold})`);
        }
    }

    /**
     * Get resource type from URL
     */
    getResourceType(url) {
        if (url.includes('.js')) return 'JavaScript';
        if (url.includes('.css')) return 'CSS';
        if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) return 'Image';
        if (url.includes('.woff') || url.includes('.ttf')) return 'Font';
        return 'Other';
    }

    /**
     * Get all recorded metrics
     */
    getMetrics() {
        return Object.fromEntries(this.metrics);
    }

    /**
     * Get performance summary
     */
    getSummary() {
        const metrics = this.getMetrics();
        
        return {
            coreWebVitals: {
                fcp: metrics.FCP,
                lcp: metrics.LCP,
                fid: metrics.FID,
                cls: metrics.CLS
            },
            timing: {
                ttfb: metrics.TTFB,
                domContentLoaded: metrics.DOMContentLoaded,
                loadComplete: metrics.LoadComplete
            },
            resources: Object.keys(metrics)
                .filter(key => key.startsWith('Resource-'))
                .reduce((acc, key) => {
                    acc[key.replace('Resource-', '')] = metrics[key];
                    return acc;
                }, {}),
            longTasks: metrics.LongTask || 0
        };
    }

    /**
     * Mark a custom timing
     */
    mark(name) {
        if (performance.mark) {
            performance.mark(name);
        }
    }

    /**
     * Measure time between two marks
     */
    measure(name, startMark, endMark) {
        if (performance.measure) {
            try {
                performance.measure(name, startMark, endMark);
                const measure = performance.getEntriesByName(name, 'measure')[0];
                this.recordMetric(name, measure.duration);
                return measure.duration;
            } catch (error) {
                console.warn(`Failed to measure ${name}:`, error);
            }
        }
        return null;
    }

    /**
     * Time a function execution
     */
    async timeFunction(name, fn) {
        const startTime = performance.now();
        
        try {
            const result = await fn();
            const duration = performance.now() - startTime;
            this.recordMetric(name, duration);
            return { result, duration };
        } catch (error) {
            const duration = performance.now() - startTime;
            this.recordMetric(`${name}-Error`, duration);
            throw error;
        }
    }

    /**
     * Monitor memory usage (if available)
     */
    getMemoryUsage() {
        if (performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }
        return null;
    }

    /**
     * Get network information (if available)
     */
    getNetworkInfo() {
        if (navigator.connection) {
            return {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt,
                saveData: navigator.connection.saveData
            };
        }
        return null;
    }

    /**
     * Generate performance report
     */
    generateReport() {
        const summary = this.getSummary();
        const memory = this.getMemoryUsage();
        const network = this.getNetworkInfo();
        
        return {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            summary,
            memory,
            network,
            recommendations: this.generateRecommendations(summary)
        };
    }

    /**
     * Generate performance recommendations
     */
    generateRecommendations(summary) {
        const recommendations = [];
        
        if (summary.coreWebVitals.fcp > this.thresholds.fcp) {
            recommendations.push('Consider optimizing critical rendering path to improve First Contentful Paint');
        }
        
        if (summary.coreWebVitals.lcp > this.thresholds.lcp) {
            recommendations.push('Optimize largest content element loading to improve Largest Contentful Paint');
        }
        
        if (summary.coreWebVitals.fid > this.thresholds.fid) {
            recommendations.push('Reduce JavaScript execution time to improve First Input Delay');
        }
        
        if (summary.coreWebVitals.cls > this.thresholds.cls) {
            recommendations.push('Stabilize layout to reduce Cumulative Layout Shift');
        }
        
        if (summary.longTasks > 0) {
            recommendations.push('Break up long tasks to improve responsiveness');
        }
        
        return recommendations;
    }

    /**
     * Display performance metrics in console
     */
    logMetrics() {
        if (!this.isEnabled) return;
        
        const report = this.generateReport();
        console.group('Performance Report');
        console.table(report.summary.coreWebVitals);
        console.table(report.summary.timing);
        console.table(report.summary.resources);
        
        if (report.recommendations.length > 0) {
            console.group('Recommendations');
            report.recommendations.forEach(rec => console.log(`• ${rec}`));
            console.groupEnd();
        }
        
        console.groupEnd();
    }

    /**
     * Clean up observers
     */
    disconnect() {
        this.observers.forEach(observer => {
            try {
                observer.disconnect();
            } catch (error) {
                console.warn('Failed to disconnect observer:', error);
            }
        });
        this.observers = [];
    }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Utility functions for performance monitoring
 */

/**
 * Time an async operation
 */
export async function timeAsync(name, operation) {
    return performanceMonitor.timeFunction(name, operation);
}

/**
 * Mark a performance milestone
 */
export function markMilestone(name) {
    performanceMonitor.mark(name);
}

/**
 * Measure time between milestones
 */
export function measureMilestone(name, start, end) {
    return performanceMonitor.measure(name, start, end);
}

/**
 * Log current performance metrics
 */
export function logPerformance() {
    performanceMonitor.logMetrics();
}

/**
 * Get performance report
 */
export function getPerformanceReport() {
    return performanceMonitor.generateReport();
}