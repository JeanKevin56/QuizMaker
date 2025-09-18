/**
 * Direct import test for StorageManager
 */

import { describe, it, expect } from 'vitest';

describe('StorageManager Direct Import Test', () => {
  it('should import StorageManager directly', async () => {
    const module = await import('../services/StorageManager.js');
    console.log('Module:', module);
    console.log('StorageManager:', module.StorageManager);
    expect(module.StorageManager).toBeDefined();
    expect(typeof module.StorageManager).toBe('function');
  });
});