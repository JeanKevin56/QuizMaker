/**
 * StorageManager with all validation imports for testing
 */

import { 
  isValidQuiz, 
  isValidResult, 
  isValidUserPreferences 
} from '../models/validation.js';

export class StorageManager {
  constructor() {
    this.isInitialized = false;
  }
  
  getUserId() {
    return 'test-user';
  }
  
  testValidation() {
    return typeof isValidQuiz === 'function' && 
           typeof isValidResult === 'function' && 
           typeof isValidUserPreferences === 'function';
  }
}