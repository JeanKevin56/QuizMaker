/**
 * Test StorageManager without validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageManager } from '../services/StorageManager.no-validation.js';

describe('StorageManager No Validation Test', () => {
  let storageManager;
  let mockLocalStorage;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {
      data: new Map(),
      getItem: vi.fn((key) => mockLocalStorage.data.get(key) || null),
      setItem: vi.fn((key, value) => mockLocalStorage.data.set(key, value)),
      removeItem: vi.fn((key) => mockLocalStorage.data.delete(key)),
      clear: vi.fn(() => mockLocalStorage.data.clear())
    };
    global.localStorage = mockLocalStorage;

    // Create fresh instance
    storageManager = new StorageManager();
  });

  it('should create StorageManager instance', () => {
    expect(storageManager).toBeDefined();
    expect(storageManager.isInitialized).toBe(false);
  });

  it('should generate user ID', () => {
    const userId = storageManager.getUserId();
    expect(typeof userId).toBe('string');
    expect(userId.length).toBeGreaterThan(0);
    expect(userId).toMatch(/^user_\d+_[a-z0-9]+$/);
  });

  it('should provide default user preferences', () => {
    const defaults = storageManager.getDefaultUserPreferences();
    expect(defaults).toHaveProperty('apiKeys');
    expect(defaults).toHaveProperty('preferences');
    expect(defaults.preferences.theme).toBe('light');
  });
});