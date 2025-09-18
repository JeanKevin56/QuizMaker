/**
 * StorageManager with single validation import for testing
 */

import { isValidQuiz } from '../models/validation.js';

export class StorageManager {
  constructor() {
    this.isInitialized = false;
  }
  
  getUserId() {
    return 'test-user';
  }
  
  testValidation() {
    return typeof isValidQuiz === 'function';
  }
}