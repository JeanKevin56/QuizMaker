/**
 * Simple import test for StorageManager
 */

import { describe, it, expect } from 'vitest';

describe('StorageManager Import Test', () => {
  it('should import StorageManager successfully', async () => {
    const { StorageManager } = await import('../services/StorageManager.js');
    expect(StorageManager).toBeDefined();
    expect(typeof StorageManager).toBe('function');
    
    const instance = new StorageManager();
    expect(instance).toBeDefined();
    expect(instance.isInitialized).toBe(false);
  });
});