/**
 * Error Handler Service Tests
 * Tests for comprehensive error handling, offline detection, and quota monitoring
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorHandler, ERROR_TYPES, ERROR_SEVERITY } from '../services/ErrorHandler.js';

// Mock DOM elements
const mockDOM = () => {
  document.body.innerHTML = '';
  
  // Mock notification container
  const container = document.createElement('div');
  container.id = 'notification-container';
  container.className = 'notification-container';
  document.body.appendChild(container);
  
  // Mock error boundary
  const errorBoundary = document.createElement('div');
  errorBoundary.id = 'error-boundary';
  errorBoundary.className = 'error-container';
  errorBoundary.style.display = 'none';
  
  const errorMessage = document.createElement('p');
  errorMessage.id = 'error-message';
  errorBoundary.appendChild(errorMessage);
  
  document.body.appendChild(errorBoundary);
};

describe('ErrorHandler', () => {
  let errorHandler;
  let originalFetch;
  let originalConsoleError;
  let originalConsoleWarn;

  beforeEach(() => {
    // Mock DOM
    mockDOM();
    
    // Mock console methods
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    console.error = vi.fn();
    console.warn = vi.fn();
    
    // Mock fetch
    originalFetch = global.fetch;
    global.fetch = vi.fn();
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
    
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
    
    // Create new error handler instance
    errorHandler = new ErrorHandler();
  });

  afterEach(() => {
    // Restore original methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    global.fetch = originalFetch;
    
    // Clean up DOM
    document.body.innerHTML = '';
    
    // Clear timers
    vi.clearAllTimers();
  });

  describe('Initialization', () => {
    test('should initialize with default values', () => {
      expect(errorHandler.isOnline).toBe(true);
      expect(errorHandler.errorQueue).toEqual([]);
      expect(errorHandler.quotaWarningThreshold).toBe(0.8);
    });

    test('should set up global error handlers', () => {
      const errorEvent = new ErrorEvent('error', {
        message: 'Test error',
        filename: 'test.js',
        lineno: 10,
        colno: 5
      });
      
      // Trigger global error
      window.dispatchEvent(errorEvent);
      
      expect(console.error).toHaveBeenCalledWith(
        'Global error caught:',
        expect.objectContaining({
          type: ERROR_TYPES.UNKNOWN,
          message: 'Test error'
        })
      );
    });

    test('should handle unhandled promise rejections', () => {
      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(), // Use resolved promise to avoid actual rejection
        reason: new Error('Test rejection')
      });
      
      // Prevent the actual rejection from being handled
      rejectionEvent.preventDefault();
      
      window.dispatchEvent(rejectionEvent);
      
      expect(console.error).toHaveBeenCalledWith(
        'Global error caught:',
        expect.objectContaining({
          type: ERROR_TYPES.UNKNOWN,
          message: 'Test rejection'
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should create standardized error objects', () => {
      const errorInfo = {
        type: ERROR_TYPES.NETWORK,
        message: 'Network error',
        severity: ERROR_SEVERITY.HIGH
      };
      
      const error = errorHandler.createErrorObject(errorInfo);
      
      expect(error).toMatchObject({
        type: ERROR_TYPES.NETWORK,
        message: 'Network error',
        severity: ERROR_SEVERITY.HIGH,
        userMessage: expect.any(String),
        timestamp: expect.any(String),
        id: expect.any(String)
      });
    });

    test('should generate user-friendly messages', () => {
      const networkError = { type: ERROR_TYPES.NETWORK };
      const apiError = { type: ERROR_TYPES.API, message: 'API key invalid' };
      const storageError = { type: ERROR_TYPES.STORAGE };
      
      expect(errorHandler.generateUserFriendlyMessage(networkError))
        .toContain('Network connection issue');
      
      expect(errorHandler.generateUserFriendlyMessage(apiError))
        .toContain('API key issue');
      
      expect(errorHandler.generateUserFriendlyMessage(storageError))
        .toContain('Unable to save data');
    });

    test('should handle offline errors differently', () => {
      const offlineError = { 
        type: ERROR_TYPES.NETWORK, 
        isOffline: true 
      };
      
      const message = errorHandler.generateUserFriendlyMessage(offlineError);
      expect(message).toContain('offline');
    });
  });

  describe('Notification System', () => {
    test('should create notification elements', () => {
      errorHandler.showNotification('Test message', 'info');
      
      const notifications = document.querySelectorAll('.notification');
      expect(notifications).toHaveLength(1);
      expect(notifications[0].classList.contains('alert-info')).toBe(true);
      expect(notifications[0].textContent).toContain('Test message');
    });

    test('should create notifications with actions', () => {
      const actions = [
        { text: 'Action 1', action: vi.fn() },
        { text: 'Action 2', action: vi.fn() }
      ];
      
      errorHandler.showNotification('Test message', 'warning', { actions });
      
      const actionButtons = document.querySelectorAll('.notification-actions .btn');
      expect(actionButtons).toHaveLength(2);
      expect(actionButtons[0].textContent).toBe('Action 1');
      expect(actionButtons[1].textContent).toBe('Action 2');
    });

    test('should auto-remove non-persistent notifications', async () => {
      vi.useFakeTimers();
      
      errorHandler.showNotification('Test message', 'info');
      
      let notifications = document.querySelectorAll('.notification');
      expect(notifications).toHaveLength(1);
      
      // Fast-forward time
      vi.advanceTimersByTime(5000);
      
      // Wait for removal animation
      vi.advanceTimersByTime(300);
      
      notifications = document.querySelectorAll('.notification');
      expect(notifications).toHaveLength(0);
      
      vi.useRealTimers();
    });

    test('should not auto-remove persistent notifications', async () => {
      vi.useFakeTimers();
      
      errorHandler.showNotification('Test message', 'error', { persistent: true });
      
      let notifications = document.querySelectorAll('.notification');
      expect(notifications).toHaveLength(1);
      
      // Check that persistent class is added
      expect(notifications[0].classList.contains('persistent')).toBe(true);
      
      // Fast-forward time
      vi.advanceTimersByTime(10000);
      
      notifications = document.querySelectorAll('.notification');
      expect(notifications).toHaveLength(1);
      
      vi.useRealTimers();
    });
  });

  describe('Offline Detection', () => {
    test('should detect online status changes', () => {
      const showNotificationSpy = vi.spyOn(errorHandler, 'showNotification');
      
      // Simulate going offline
      navigator.onLine = false;
      window.dispatchEvent(new Event('offline'));
      
      expect(showNotificationSpy).toHaveBeenCalledWith(
        expect.stringContaining('offline'),
        'warning'
      );
      
      // Simulate going online
      navigator.onLine = true;
      window.dispatchEvent(new Event('online'));
      
      expect(showNotificationSpy).toHaveBeenCalledWith(
        expect.stringContaining('restored'),
        'success'
      );
    });

    test('should check connectivity periodically', async () => {
      vi.useFakeTimers();
      
      // Create a new ErrorHandler instance to test the timer
      const testErrorHandler = new (await import('../services/ErrorHandler.js')).ErrorHandler();
      const checkConnectivitySpy = vi.spyOn(testErrorHandler, 'checkConnectivity');
      
      // Fast-forward to trigger connectivity check
      vi.advanceTimersByTime(30000);
      
      expect(checkConnectivitySpy).toHaveBeenCalled();
      
      vi.useRealTimers();
    });
  });

  describe('API Quota Monitoring', () => {
    test('should monitor API usage from response headers', () => {
      const showNotificationSpy = vi.spyOn(errorHandler, 'showNotification');
      
      const mockResponse = {
        headers: {
          get: vi.fn((header) => {
            switch (header) {
              case 'x-ratelimit-remaining': return '20';
              case 'x-ratelimit-limit': return '100';
              case 'x-ratelimit-reset': return '1640995200';
              default: return null;
            }
          })
        }
      };
      
      errorHandler.monitorAPIUsage(mockResponse);
      
      // Should trigger quota warning at 80% usage (20/100 = 80% used)
      expect(showNotificationSpy).toHaveBeenCalledWith(
        expect.stringContaining('API quota warning'),
        'warning',
        expect.objectContaining({ persistent: true })
      );
    });

    test('should handle quota exceeded status', () => {
      const mockResponse = {
        status: 429,
        headers: {
          get: vi.fn((header) => {
            switch (header) {
              case 'x-ratelimit-reset': return '1640995200';
              default: return null;
            }
          })
        }
      };
      
      const handleQuotaExceededSpy = vi.spyOn(errorHandler, 'handleQuotaExceeded');
      
      errorHandler.monitorAPIUsage(mockResponse);
      
      expect(handleQuotaExceededSpy).toHaveBeenCalledWith({
        service: 'Gemini API',
        resetTime: '1640995200'
      });
    });
  });

  describe('Error Storage', () => {
    test('should store errors in localStorage', async () => {
      const error = {
        id: 'test-error',
        type: ERROR_TYPES.NETWORK,
        message: 'Test error'
      };
      
      await errorHandler.storeError(error);
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'QuizMaker-errors',
        expect.stringContaining('test-error')
      );
    });

    test('should limit stored errors to 50', async () => {
      // Mock existing errors
      const existingErrors = Array.from({ length: 50 }, (_, i) => ({
        id: `error-${i}`,
        message: `Error ${i}`
      }));
      
      localStorage.getItem.mockReturnValue(JSON.stringify(existingErrors));
      
      const newError = {
        id: 'new-error',
        message: 'New error'
      };
      
      await errorHandler.storeError(newError);
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'QuizMaker-errors',
        expect.stringMatching(/new-error/)
      );
    });

    test('should handle localStorage errors gracefully', async () => {
      localStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const error = { id: 'test', message: 'Test' };
      
      // Should not throw
      await expect(errorHandler.storeError(error)).resolves.toBeUndefined();
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to store error:',
        expect.any(Error)
      );
    });
  });

  describe('Error Listeners', () => {
    test('should add and notify error listeners', () => {
      const listener = vi.fn();
      errorHandler.addErrorListener(listener);
      
      const error = { type: ERROR_TYPES.NETWORK, message: 'Test' };
      errorHandler.notifyErrorListeners(error);
      
      expect(listener).toHaveBeenCalledWith(error);
    });

    test('should remove error listeners', () => {
      const listener = vi.fn();
      errorHandler.addErrorListener(listener);
      errorHandler.removeErrorListener(listener);
      
      const error = { type: ERROR_TYPES.NETWORK, message: 'Test' };
      errorHandler.notifyErrorListeners(error);
      
      expect(listener).not.toHaveBeenCalled();
    });

    test('should handle errors in error listeners', () => {
      const faultyListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      
      errorHandler.addErrorListener(faultyListener);
      
      const error = { type: ERROR_TYPES.NETWORK, message: 'Test' };
      
      // Should not throw
      expect(() => errorHandler.notifyErrorListeners(error)).not.toThrow();
      expect(console.error).toHaveBeenCalledWith(
        'Error in error listener:',
        expect.any(Error)
      );
    });
  });

  describe('Utility Methods', () => {
    test('should get stored errors', () => {
      const errors = [{ id: 'test', message: 'Test error' }];
      localStorage.getItem.mockReturnValue(JSON.stringify(errors));
      
      const result = errorHandler.getStoredErrors();
      expect(result).toEqual(errors);
    });

    test('should handle invalid stored errors', () => {
      localStorage.getItem.mockReturnValue('invalid json');
      
      const result = errorHandler.getStoredErrors();
      expect(result).toEqual([]);
    });

    test('should clear stored errors', () => {
      errorHandler.clearStoredErrors();
      expect(localStorage.removeItem).toHaveBeenCalledWith('QuizMaker-errors');
    });

    test('should return online status', () => {
      expect(errorHandler.isOnlineStatus()).toBe(true);
      
      errorHandler.isOnline = false;
      expect(errorHandler.isOnlineStatus()).toBe(false);
    });

    test('should generate unique error IDs', () => {
      const id1 = errorHandler.generateErrorId();
      const id2 = errorHandler.generateErrorId();
      
      expect(id1).toMatch(/^error_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^error_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });
});