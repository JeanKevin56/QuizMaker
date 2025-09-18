/**
 * Test StorageManager with single import
 */

import { describe, it, expect } from 'vitest';
import { StorageManager } from '../services/StorageManager.single-import.js';

describe('StorageManager Single Import Test', () => {
  it('should create StorageManager instance with validation import', () => {
    const manager = new StorageManager();
    expect(manager).toBeDefined();
    expect(manager.testValidation()).toBe(true);
  });
});