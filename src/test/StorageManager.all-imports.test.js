/**
 * Test StorageManager with all imports
 */

import { describe, it, expect } from 'vitest';
import { StorageManager } from '../services/StorageManager.all-imports.js';

describe('StorageManager All Imports Test', () => {
  it('should create StorageManager instance with all validation imports', () => {
    const manager = new StorageManager();
    expect(manager).toBeDefined();
    expect(manager.testValidation()).toBe(true);
  });
});