/**
 * Test individual validation imports
 */

import { describe, it, expect } from 'vitest';

describe('Individual Validation Import Test', () => {
  it('should import isValidQuiz', async () => {
    const { isValidQuiz } = await import('../models/validation.js');
    expect(isValidQuiz).toBeDefined();
    expect(typeof isValidQuiz).toBe('function');
  });

  it('should import isValidResult', async () => {
    const { isValidResult } = await import('../models/validation.js');
    expect(isValidResult).toBeDefined();
    expect(typeof isValidResult).toBe('function');
  });

  it('should import isValidUserPreferences', async () => {
    const { isValidUserPreferences } = await import('../models/validation.js');
    expect(isValidUserPreferences).toBeDefined();
    expect(typeof isValidUserPreferences).toBe('function');
  });
});