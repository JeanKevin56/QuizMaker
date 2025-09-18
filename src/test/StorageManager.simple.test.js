import { describe, it, expect } from 'vitest';
import { StorageManager } from '../services/StorageManager.js';

describe('StorageManager Simple Test', () => {
  it('should create StorageManager instance', () => {
    const storageManager = new StorageManager();
    expect(storageManager).toBeDefined();
    expect(storageManager.isInitialized).toBe(false);
  });
});