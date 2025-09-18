/**
 * Quota Monitor Component Tests
 * Tests for API quota monitoring and warning functionality
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { QuotaMonitor } from '../components/QuotaMonitor.js';

// Mock DOM
const mockDOM = () => {
  document.body.innerHTML = '';
  
  // Mock notification container
  const container = document.createElement('div');
  container.id = 'notification-container';
  container.className = 'notification-container';
  document.body.appendChild(container);
};

describe('QuotaMonitor', () => {
  let quotaMonitor;
  let originalConsoleWarn;

  beforeEach(() => {
    mockDOM();
    
    // Mock console.warn
    originalConsoleWarn = console.warn;
    console.warn = vi.fn();
    
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock
    });
    
    quotaMonitor = new QuotaMonitor();
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
    vi.clearAllTimers();
  });

  describe('Initialization', () => {
    test('should initialize with default values', () => {
      expect(quotaMonitor.warningThreshold).toBe(0.8);
      expect(quotaMonitor.criticalThreshold).toBe(0.95);
      expect(quotaMonitor.quotaData).toBeInstanceOf(Map);
      expect(quotaMonitor.warningShown).toBeInstanceOf(Set);
      expect(quotaMonitor.criticalWarningShown).toBeInstanceOf(Set);
    });

    test('should load stored quota data', () => {
      const storedData = {
        'Gemini API': {
          usage: 0.5,
          remaining: 50,
          limit: 100,
          lastUpdated: Date.now()
        }
      };
      
      localStorage.getItem.mockReturnValue(JSON.stringify(storedData));
      
      const newMonitor = new QuotaMonitor();
      
      expect(newMonitor.quotaData.get('Gemini API')).toEqual(storedData['Gemini API']);
    });

    test('should handle invalid stored data gracefully', () => {
      localStorage.getItem.mockReturnValue('invalid json');
      
      expect(() => new QuotaMonitor()).not.toThrow();
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to load quota data:',
        expect.any(Error)
      );
    });
  });

  describe('Quota Updates', () => {
    test('should update quota with usage percentage', () => {
      quotaMonitor.updateQuota('Test API', {
        usage: 0.75,
        remaining: 25,
        limit: 100,
        resetTime: 1640995200
      });
      
      const quotaData = quotaMonitor.getQuotaStatus('Test API');
      expect(quotaData).toMatchObject({
        usage: 0.75,
        remaining: 25,
        limit: 100,
        resetTime: 1640995200
      });
    });

    test('should calculate usage from remaining and limit', () => {
      quotaMonitor.updateQuota('Test API', {
        remaining: 20,
        limit: 100
      });
      
      const quotaData = quotaMonitor.getQuotaStatus('Test API');
      expect(quotaData.usage).toBe(0.8); // (100 - 20) / 100
    });

    test('should calculate usage from used and limit', () => {
      quotaMonitor.updateQuota('Test API', {
        used: 80,
        limit: 100
      });
      
      const quotaData = quotaMonitor.getQuotaStatus('Test API');
      expect(quotaData.usage).toBe(0.8); // 80 / 100
    });

    test('should warn when unable to calculate usage', () => {
      quotaMonitor.updateQuota('Test API', {
        // No usage data provided
      });
      
      expect(console.warn).toHaveBeenCalledWith(
        'Unable to calculate usage percentage for',
        'Test API'
      );
    });

    test('should save quota data to localStorage', () => {
      quotaMonitor.updateQuota('Test API', { usage: 0.5 });
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'QuizMaker-quota-data',
        expect.stringContaining('Test API')
      );
    });
  });

  describe('Warning System', () => {
    test('should show warning at 80% usage', () => {
      const showWarningSpy = vi.spyOn(quotaMonitor, 'showWarning');
      
      quotaMonitor.updateQuota('Test API', { usage: 0.85 });
      
      expect(showWarningSpy).toHaveBeenCalledWith('Test API', 0.85);
    });

    test('should show critical warning at 95% usage', () => {
      const showCriticalWarningSpy = vi.spyOn(quotaMonitor, 'showCriticalWarning');
      
      quotaMonitor.updateQuota('Test API', { usage: 0.97 });
      
      expect(showCriticalWarningSpy).toHaveBeenCalledWith('Test API', 0.97);
    });

    test('should not show duplicate warnings', () => {
      const showWarningSpy = vi.spyOn(quotaMonitor, 'showWarning');
      
      quotaMonitor.updateQuota('Test API', { usage: 0.85 });
      quotaMonitor.updateQuota('Test API', { usage: 0.87 });
      
      expect(showWarningSpy).toHaveBeenCalledTimes(1);
    });

    test('should create warning notification elements', () => {
      quotaMonitor.showWarning('Test API', 0.85);
      
      const warning = document.querySelector('.quota-warning');
      expect(warning).toBeTruthy();
      expect(warning.textContent).toContain('Test API');
      expect(warning.textContent).toContain('85%');
    });

    test('should create critical warning notification elements', () => {
      quotaMonitor.showCriticalWarning('Test API', 0.97);
      
      const warning = document.querySelector('.alert-error');
      expect(warning).toBeTruthy();
      expect(warning.textContent).toContain('Critical');
      expect(warning.textContent).toContain('97%');
    });

    test('should include reset time in warnings', () => {
      const resetTime = new Date('2024-01-01T12:00:00Z');
      quotaMonitor.quotaData.set('Test API', {
        usage: 0.85,
        resetTime: resetTime.getTime() / 1000
      });
      
      quotaMonitor.showWarning('Test API', 0.85);
      
      const warning = document.querySelector('.quota-warning');
      expect(warning.textContent).toContain('Resets at');
    });
  });

  describe('Quota Exceeded Handling', () => {
    test('should handle quota exceeded', () => {
      const updateQuotaSpy = vi.spyOn(quotaMonitor, 'updateQuota');
      const showNotificationSpy = vi.spyOn(quotaMonitor, 'showQuotaExceededNotification');
      
      quotaMonitor.handleQuotaExceeded('Test API', {
        resetTime: 1640995200,
        retryAfter: 3600
      });
      
      expect(updateQuotaSpy).toHaveBeenCalledWith('Test API', {
        usage: 1.0,
        resetTime: 1640995200,
        remaining: 0
      });
      
      expect(showNotificationSpy).toHaveBeenCalledWith('Test API', {
        resetTime: 1640995200,
        retryAfter: 3600
      });
    });

    test('should show quota exceeded notification', () => {
      quotaMonitor.showQuotaExceededNotification('Test API', {
        resetTime: 1640995200
      });
      
      const notification = document.querySelector('.alert-error.persistent');
      expect(notification).toBeTruthy();
      expect(notification.textContent).toContain('Quota Exceeded');
      expect(notification.textContent).toContain('Test API');
    });

    test('should include retry after in notification', () => {
      quotaMonitor.showQuotaExceededNotification('Test API', {
        retryAfter: 3600
      });
      
      const notification = document.querySelector('.alert-error');
      expect(notification.textContent).toContain('3600 seconds');
    });
  });

  describe('Data Management', () => {
    test('should get quota status for service', () => {
      const quotaData = {
        usage: 0.5,
        remaining: 50,
        limit: 100
      };
      
      quotaMonitor.quotaData.set('Test API', quotaData);
      
      const result = quotaMonitor.getQuotaStatus('Test API');
      expect(result).toEqual(quotaData);
    });

    test('should return null for non-existent service', () => {
      const result = quotaMonitor.getQuotaStatus('Non-existent API');
      expect(result).toBeNull();
    });

    test('should get all quota statuses', () => {
      quotaMonitor.quotaData.set('API 1', { usage: 0.5 });
      quotaMonitor.quotaData.set('API 2', { usage: 0.8 });
      
      const result = quotaMonitor.getAllQuotaStatuses();
      expect(result).toEqual({
        'API 1': { usage: 0.5 },
        'API 2': { usage: 0.8 }
      });
    });

    test('should reset warnings for service', () => {
      quotaMonitor.warningShown.add('test api');
      quotaMonitor.criticalWarningShown.add('test api');
      
      quotaMonitor.resetWarnings('Test API');
      
      expect(quotaMonitor.warningShown.has('test api')).toBe(false);
      expect(quotaMonitor.criticalWarningShown.has('test api')).toBe(false);
    });

    test('should clear all quota data', () => {
      quotaMonitor.quotaData.set('Test API', { usage: 0.5 });
      quotaMonitor.warningShown.add('test api');
      quotaMonitor.criticalWarningShown.add('test api');
      
      quotaMonitor.clearAllQuotaData();
      
      expect(quotaMonitor.quotaData.size).toBe(0);
      expect(quotaMonitor.warningShown.size).toBe(0);
      expect(quotaMonitor.criticalWarningShown.size).toBe(0);
    });
  });

  describe('Data Cleanup', () => {
    test('should clean up expired data', () => {
      const now = Date.now();
      const expiredTime = now - (25 * 60 * 60 * 1000); // 25 hours ago
      
      quotaMonitor.quotaData.set('Expired API', {
        usage: 0.5,
        lastUpdated: expiredTime
      });
      
      quotaMonitor.quotaData.set('Valid API', {
        usage: 0.5,
        lastUpdated: now
      });
      
      quotaMonitor.cleanupOldData();
      
      expect(quotaMonitor.quotaData.has('Expired API')).toBe(false);
      expect(quotaMonitor.quotaData.has('Valid API')).toBe(true);
    });

    test('should clean up data past reset time', () => {
      const now = Date.now();
      const pastResetTime = (now / 1000) - 3600; // 1 hour ago
      
      quotaMonitor.quotaData.set('Reset API', {
        usage: 1.0,
        resetTime: pastResetTime,
        lastUpdated: now
      });
      
      quotaMonitor.cleanupOldData();
      
      expect(quotaMonitor.quotaData.has('Reset API')).toBe(false);
    });

    test('should set up periodic cleanup', async () => {
      vi.useFakeTimers();
      
      // Create a new QuotaMonitor instance to test the timer
      const testMonitor = new (await import('../components/QuotaMonitor.js')).QuotaMonitor();
      const cleanupSpy = vi.spyOn(testMonitor, 'cleanupOldData');
      
      // Fast-forward 1 hour
      vi.advanceTimersByTime(60 * 60 * 1000);
      
      expect(cleanupSpy).toHaveBeenCalled();
      
      vi.useRealTimers();
    });
  });

  describe('Threshold Configuration', () => {
    test('should set warning thresholds', () => {
      quotaMonitor.setThresholds(0.7, 0.9);
      
      expect(quotaMonitor.warningThreshold).toBe(0.7);
      expect(quotaMonitor.criticalThreshold).toBe(0.9);
    });

    test('should clamp thresholds to valid range', () => {
      quotaMonitor.setThresholds(-0.1, 1.5);
      
      expect(quotaMonitor.warningThreshold).toBe(0);
      expect(quotaMonitor.criticalThreshold).toBe(1);
    });
  });

  describe('Recommendations', () => {
    test('should provide recommendations for high usage', () => {
      const recommendations = quotaMonitor.getQuotaRecommendations(0.97);
      
      expect(recommendations).toContain('waiting for quota reset');
      expect(recommendations).toContain('optimize requests');
      expect(recommendations).toContain('upgrading');
    });

    test('should provide recommendations for medium usage', () => {
      const recommendations = quotaMonitor.getQuotaRecommendations(0.85);
      
      expect(recommendations).toContain('Monitor your usage');
      expect(recommendations).toContain('batching requests');
      expect(recommendations).toContain('Cache responses');
    });

    test('should always include general recommendations', () => {
      const recommendations = quotaMonitor.getQuotaRecommendations(0.5);
      
      expect(recommendations).toContain('usage alerts');
      expect(recommendations).toContain('API documentation');
    });
  });
});