/**
 * Simple import test for validation module
 */

import { describe, it, expect } from 'vitest';

describe('Validation Import Test', () => {
  it('should import validation functions successfully', async () => {
    const { isValidQuiz, isValidResult, isValidUserPreferences } = await import('../models/validation.js');
    expect(isValidQuiz).toBeDefined();
    expect(isValidResult).toBeDefined();
    expect(isValidUserPreferences).toBeDefined();
    expect(typeof isValidQuiz).toBe('function');
  });
});