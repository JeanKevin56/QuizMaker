/**
 * Offline Indicator Component Tests
 * Tests for offline detection and reconnection functionality
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { OfflineIndicator } from '../components/OfflineIndicator.js';

// Mock DOM
const mockDOM = () => {
  document.body.innerHTML = '';
};

describe('OfflineIndicator', () => {
  let offlineIndicator;
  let originalFetch;

  beforeEach(() => {
    mockDOM();
    
    // Mock fetch
    originalFetch = global.fetch;
    global.fetch = vi.fn();
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
    
    offlineIndicator = new OfflineIndicator();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    offlineIndicator.destroy();
    vi.clearAllTimers();
  });

  describe('Initialization', () => {
    test('should create indicator elements', () => {
      const indicator = document.querySelector('.offline-indicator');
      const connectionStatus = document.querySelector('.connection-status');
      
      expect(indicator).toBeTruthy();
      expect(connectionStatus).toBeTruthy();
    });

    test('should initialize with online status', () => {
      expect(offlineIndicator.isOnline).toBe(true);
      expect(offlineIndicator.retryAttempts).toBe(0);
    });

    test('should set up event listeners', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      
      new OfflineIndicator();
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });

  describe('Status Updates', () => {
    test('should show offline indicator when offline', () => {
      offlineIndicator.updateStatus(false);
      
      const indicator = document.querySelector('.offline-indicator');
      expect(indicator.classList.contains('show')).toBe(true);
    });

    test('should hide offline indicator when online', () => {
      offlineIndicator.updateStatus(true);
      
      const indicator = document.querySelector('.offline-indicator');
      expect(indicator.classList.contains('show')).toBe(false);
    });

    test('should update connection status text', () => {
      offlineIndicator.updateConnectionStatus('offline', 'Offline');
      
      const statusText = document.querySelector('.connection-status-text');
      expect(statusText.textContent).toBe('Offline');
      
      const connectionStatus = document.querySelector('.connection-status');
      expect(connectionStatus.classList.contains('offline')).toBe(true);
    });

    test('should show connection status temporarily when online', async () => {
      vi.useFakeTimers();
      
      offlineIndicator.updateConnectionStatus('online', 'Online');
      
      const connectionStatus = document.querySelector('.connection-status');
      expect(connectionStatus.classList.contains('show')).toBe(true);
      
      // Fast-forward time
      vi.advanceTimersByTime(3000);
      
      expect(connectionStatus.classList.contains('show')).toBe(false);
      
      vi.useRealTimers();
    });
  });

  describe('Connectivity Checking', () => {
    test('should check connectivity with favicon request', async () => {
      global.fetch.mockResolvedValue({ ok: true });
      
      await offlineIndicator.checkConnectivity();
      
      expect(global.fetch).toHaveBeenCalledWith('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: expect.any(AbortSignal)
      });
    });

    test('should update status when connectivity check succeeds', async () => {
      global.fetch.mockResolvedValue({ ok: true });
      offlineIndicator.isOnline = false;
      
      const updateStatusSpy = vi.spyOn(offlineIndicator, 'updateStatus');
      
      await offlineIndicator.checkConnectivity();
      
      expect(offlineIndicator.isOnline).toBe(true);
      expect(updateStatusSpy).toHaveBeenCalledWith(true);
    });

    test('should update status when connectivity check fails', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));
      offlineIndicator.isOnline = true;
      
      const updateStatusSpy = vi.spyOn(offlineIndicator, 'updateStatus');
      
      await offlineIndicator.checkConnectivity();
      
      expect(offlineIndicator.isOnline).toBe(false);
      expect(updateStatusSpy).toHaveBeenCalledWith(false);
    });

    test('should perform periodic connectivity checks', async () => {
      vi.useFakeTimers();
      
      // Create a new OfflineIndicator instance to test the timer
      const testIndicator = new (await import('../components/OfflineIndicator.js')).OfflineIndicator();
      const checkConnectivitySpy = vi.spyOn(testIndicator, 'checkConnectivity');
      
      // Fast-forward to trigger periodic check
      vi.advanceTimersByTime(30000);
      
      expect(checkConnectivitySpy).toHaveBeenCalled();
      
      testIndicator.destroy();
      vi.useRealTimers();
    });
  });

  describe('Reconnection Attempts', () => {
    test('should attempt reconnection when button is clicked', async () => {
      global.fetch.mockResolvedValue({ ok: true });
      
      const checkConnectivitySpy = vi.spyOn(offlineIndicator, 'checkConnectivity');
      const reconnectButton = document.querySelector('.reconnect-button');
      
      reconnectButton.click();
      
      expect(checkConnectivitySpy).toHaveBeenCalled();
    });

    test('should update retry attempts', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));
      
      await offlineIndicator.attemptReconnection();
      
      expect(offlineIndicator.retryAttempts).toBe(1);
    });

    test('should show max retries message after max attempts', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));
      offlineIndicator.retryAttempts = offlineIndicator.maxRetryAttempts;
      
      const showMaxRetriesMessageSpy = vi.spyOn(offlineIndicator, 'showMaxRetriesMessage');
      
      await offlineIndicator.attemptReconnection();
      
      expect(showMaxRetriesMessageSpy).toHaveBeenCalled();
    });

    test('should schedule next retry with countdown', async () => {
      // Mock fetch to reject (simulating network failure)
      global.fetch.mockRejectedValue(new Error('Network error'));
      
      // Ensure we start online so the connectivity check will detect the failure
      offlineIndicator.isOnline = true;
      
      // Spy on scheduleNextRetry to verify it's called
      const scheduleNextRetrySpy = vi.spyOn(offlineIndicator, 'scheduleNextRetry');
      
      await offlineIndicator.attemptReconnection();
      
      // Verify scheduleNextRetry was called
      expect(scheduleNextRetrySpy).toHaveBeenCalled();
    });

    test('should update button state during reconnection', async () => {
      global.fetch.mockResolvedValue({ ok: true });
      
      const button = document.querySelector('.reconnect-button');
      
      // Start reconnection
      const reconnectionPromise = offlineIndicator.attemptReconnection();
      
      // Check initial loading state
      expect(button.textContent).toBe('Connecting...');
      expect(button.disabled).toBe(true);
      expect(button.classList.contains('loading')).toBe(true);
      
      // Wait for completion
      await reconnectionPromise;
      
      // Check final state
      expect(button.textContent).toBe('Try to reconnect');
      expect(button.disabled).toBe(false);
      expect(button.classList.contains('loading')).toBe(false);
    });
  });

  describe('Event Handling', () => {
    test('should handle online event', () => {
      offlineIndicator.isOnline = false;
      offlineIndicator.retryAttempts = 2;
      
      const updateStatusSpy = vi.spyOn(offlineIndicator, 'updateStatus');
      const showReconnectedMessageSpy = vi.spyOn(offlineIndicator, 'showReconnectedMessage');
      
      window.dispatchEvent(new Event('online'));
      
      expect(offlineIndicator.isOnline).toBe(true);
      expect(offlineIndicator.retryAttempts).toBe(0);
      expect(updateStatusSpy).toHaveBeenCalledWith(true);
      expect(showReconnectedMessageSpy).toHaveBeenCalled();
    });

    test('should handle offline event', () => {
      offlineIndicator.isOnline = true;
      
      const updateStatusSpy = vi.spyOn(offlineIndicator, 'updateStatus');
      
      window.dispatchEvent(new Event('offline'));
      
      expect(offlineIndicator.isOnline).toBe(false);
      expect(updateStatusSpy).toHaveBeenCalledWith(false);
    });
  });

  describe('Notifications', () => {
    test('should show reconnected message', () => {
      offlineIndicator.showReconnectedMessage();
      
      const notification = document.querySelector('.alert-success');
      expect(notification).toBeTruthy();
      expect(notification.textContent).toContain('Connection restored');
    });

    test('should auto-remove reconnected message', async () => {
      vi.useFakeTimers();
      
      offlineIndicator.showReconnectedMessage();
      
      let notification = document.querySelector('.alert-success');
      expect(notification).toBeTruthy();
      
      // Fast-forward time
      vi.advanceTimersByTime(3000);
      vi.advanceTimersByTime(300); // Animation time
      
      notification = document.querySelector('.alert-success');
      expect(notification).toBeFalsy();
      
      vi.useRealTimers();
    });

    test('should show max retries message', () => {
      offlineIndicator.showMaxRetriesMessage();
      
      const message = document.querySelector('.offline-message');
      const button = document.querySelector('.reconnect-button');
      
      expect(message.textContent).toContain('Unable to reconnect');
      expect(button.textContent).toBe('Reload page');
    });
  });

  describe('Utility Methods', () => {
    test('should return online status', () => {
      expect(offlineIndicator.getOnlineStatus()).toBe(true);
      
      offlineIndicator.isOnline = false;
      expect(offlineIndicator.getOnlineStatus()).toBe(false);
    });

    test('should manually check connection', async () => {
      global.fetch.mockResolvedValue({ ok: true });
      
      const result = await offlineIndicator.checkConnection();
      
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalled();
    });

    test('should show connection status on demand', async () => {
      vi.useFakeTimers();
      
      offlineIndicator.showConnectionStatus();
      
      const connectionStatus = document.querySelector('.connection-status');
      expect(connectionStatus.classList.contains('show')).toBe(true);
      
      vi.advanceTimersByTime(3000);
      
      expect(connectionStatus.classList.contains('show')).toBe(false);
      
      vi.useRealTimers();
    });

    test('should destroy indicator elements', () => {
      offlineIndicator.destroy();
      
      const indicator = document.querySelector('.offline-indicator');
      const connectionStatus = document.querySelector('.connection-status');
      
      expect(indicator).toBeFalsy();
      expect(connectionStatus).toBeFalsy();
    });
  });
});