/**
 * StorageManager without validation imports for testing
 */

/**
 * Storage configuration constants
 */
const STORAGE_CONFIG = {
  DB_NAME: 'QuizPlatformDB',
  DB_VERSION: 1,
  STORES: {
    QUIZZES: 'quizzes',
    RESULTS: 'results',
    MEDIA: 'media'
  },
  LOCAL_STORAGE_KEYS: {
    USER_PREFERENCES: 'quiz-platform-preferences',
    USER_ID: 'quiz-platform-user-id'
  }
};

/**
 * StorageManager class handles all data persistence operations
 */
export class StorageManager {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.userId = this.generateOrGetUserId();
  }

  /**
   * Generate or retrieve user ID
   * @returns {string} User ID
   */
  generateOrGetUserId() {
    try {
      const existingId = localStorage.getItem(STORAGE_CONFIG.LOCAL_STORAGE_KEYS.USER_ID);
      if (existingId) {
        return existingId;
      }

      const newId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(STORAGE_CONFIG.LOCAL_STORAGE_KEYS.USER_ID, newId);
      return newId;
    } catch (error) {
      // Fallback if localStorage fails
      return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Get current user ID
   * @returns {string} User ID
   */
  getUserId() {
    return this.userId;
  }

  /**
   * Get default user preferences
   * @returns {Object} Default preferences object
   */
  getDefaultUserPreferences() {
    return {
      apiKeys: {
        gemini: undefined
      },
      preferences: {
        theme: 'light',
        defaultQuizSettings: {
          shuffleQuestions: false,
          showExplanations: true
        }
      }
    };
  }
}