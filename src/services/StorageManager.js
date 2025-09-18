import { THEMES } from '../models/types.js';

/**
 * StorageManager handles all data persistence operations using IndexedDB and LocalStorage
 * - IndexedDB: Quiz data, results, media files
 * - LocalStorage: User preferences, API keys, user ID
 */
export class StorageManager {
  constructor() {
    this.isInitialized = false;
    this.db = null;
    this.dbName = 'QuizPlatformDB';
    this.dbVersion = 1;
    this.userId = this.getUserId();
  }

  /**
   * Initialize the storage manager and set up IndexedDB
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) return;

    // Check for IndexedDB support
    if (!window.indexedDB) {
      const error = new Error('IndexedDB not supported in this browser');
      console.error('Storage Initialization Error:', error);
      throw error;
    }

    try {
      this.db = await this.openDatabase();
      this.isInitialized = true;
    } catch (error) {
      const storageError = new Error(`Failed to initialize storage: ${error.message}`);
      console.error('Storage Initialization Error:', storageError);
      throw storageError;
    }
  }

  /**
   * Open IndexedDB database and create object stores
   * @returns {Promise<IDBDatabase>}
   */
  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(new Error('Failed to open database'));
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create quizzes object store
        if (!db.objectStoreNames.contains('quizzes')) {
          const quizStore = db.createObjectStore('quizzes', { keyPath: 'id' });
          quizStore.createIndex('createdAt', 'createdAt', { unique: false });
          quizStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Create results object store
        if (!db.objectStoreNames.contains('results')) {
          const resultStore = db.createObjectStore('results', { keyPath: 'id' });
          resultStore.createIndex('quizId', 'quizId', { unique: false });
          resultStore.createIndex('userId', 'userId', { unique: false });
          resultStore.createIndex('completedAt', 'completedAt', { unique: false });
        }

        // Create media object store
        if (!db.objectStoreNames.contains('media')) {
          db.createObjectStore('media', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Ensure the storage manager is initialized before operations
   * @private
   */
  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Get or generate user ID
   * @returns {string} User ID
   */
  getUserId() {
    if (this.userId) return this.userId;

    try {
      let userId = localStorage.getItem('QuizMaker-user-id');
      if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('QuizMaker-user-id', userId);
      }
      this.userId = userId;
      return userId;
    } catch (error) {
      // Fallback if localStorage is not available
      this.userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return this.userId;
    }
  }

  // Quiz Operations

  /**
   * Store a quiz in IndexedDB
   * @param {Object} quiz - Quiz object to store
   * @returns {Promise<string>} Quiz ID
   */
  async storeQuiz(quiz) {
    await this.ensureInitialized();

    // Basic validation - just check if quiz has required fields
    if (!quiz || !quiz.id || !quiz.title || !quiz.questions) {
      throw new Error('Invalid quiz data');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['quizzes'], 'readwrite');
      const store = transaction.objectStore('quizzes');
      
      // Ensure dates are Date objects
      const quizToStore = {
        ...quiz,
        createdAt: new Date(quiz.createdAt),
        updatedAt: new Date(quiz.updatedAt)
      };

      const request = store.put(quizToStore);
      
      request.onsuccess = () => resolve(quiz.id);
      request.onerror = () => reject(new Error('Failed to store quiz'));
    });
  }

  /**
   * Retrieve a quiz by ID
   * @param {string} quizId - Quiz ID
   * @returns {Promise<Object|null>} Quiz object or null if not found
   */
  async getQuiz(quizId) {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['quizzes'], 'readonly');
      const store = transaction.objectStore('quizzes');
      const request = store.get(quizId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to retrieve quiz'));
    });
  }

  /**
   * Retrieve all quizzes
   * @returns {Promise<Object[]>} Array of quiz objects
   */
  async getAllQuizzes() {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['quizzes'], 'readonly');
      const store = transaction.objectStore('quizzes');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to retrieve quizzes'));
    });
  }

  /**
   * Update an existing quiz
   * @param {string} quizId - Quiz ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated quiz object
   */
  async updateQuiz(quizId, updates) {
    await this.ensureInitialized();

    const existingQuiz = await this.getQuiz(quizId);
    if (!existingQuiz) {
      throw new Error('Quiz not found');
    }

    const updatedQuiz = {
      ...existingQuiz,
      ...updates,
      id: quizId, // Ensure ID doesn't change
      updatedAt: new Date()
    };

    // Basic validation will be done in storeQuiz

    await this.storeQuiz(updatedQuiz);
    return updatedQuiz;
  }

  /**
   * Delete a quiz and its associated results
   * @param {string} quizId - Quiz ID
   * @returns {Promise<void>}
   */
  async deleteQuiz(quizId) {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['quizzes', 'results'], 'readwrite');
      
      // Delete quiz
      const quizStore = transaction.objectStore('quizzes');
      quizStore.delete(quizId);

      // Delete associated results
      const resultStore = transaction.objectStore('results');
      const index = resultStore.index('quizId');
      const request = index.openCursor(IDBKeyRange.only(quizId));

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Failed to delete quiz'));
    });
  }

  // Result Operations

  /**
   * Store a quiz result
   * @param {Object} result - Result object to store
   * @returns {Promise<string>} Result ID
   */
  async storeResult(result) {
    await this.ensureInitialized();

    // Basic validation
    if (!result || !result.id || !result.quizId || typeof result.score !== 'number') {
      throw new Error('Invalid result data');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['results'], 'readwrite');
      const store = transaction.objectStore('results');
      
      // Ensure dates are Date objects
      const resultToStore = {
        ...result,
        completedAt: new Date(result.completedAt)
      };

      const request = store.put(resultToStore);
      
      request.onsuccess = () => resolve(result.id);
      request.onerror = () => reject(new Error('Failed to store result'));
    });
  }

  /**
   * Retrieve a result by ID
   * @param {string} resultId - Result ID
   * @returns {Promise<Object|null>} Result object or null if not found
   */
  async getResult(resultId) {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['results'], 'readonly');
      const store = transaction.objectStore('results');
      const request = store.get(resultId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to retrieve result'));
    });
  }

  /**
   * Retrieve all results for a specific quiz
   * @param {string} quizId - Quiz ID
   * @returns {Promise<Object[]>} Array of result objects
   */
  async getResultsForQuiz(quizId) {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['results'], 'readonly');
      const store = transaction.objectStore('results');
      const index = store.index('quizId');
      const request = index.getAll(quizId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to retrieve results for quiz'));
    });
  }

  /**
   * Retrieve all results for the current user
   * @returns {Promise<Object[]>} Array of result objects
   */
  async getUserResults() {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['results'], 'readonly');
      const store = transaction.objectStore('results');
      const index = store.index('userId');
      const request = index.getAll(this.userId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to retrieve user results'));
    });
  }

  /**
   * Delete a specific result
   * @param {string} resultId - Result ID
   * @returns {Promise<void>}
   */
  async deleteResult(resultId) {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['results'], 'readwrite');
      const store = transaction.objectStore('results');
      const request = store.delete(resultId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete result'));
    });
  }

  // Media Operations

  /**
   * Store media data (images as base64)
   * @param {string} mediaId - Media ID
   * @param {string} data - Base64 data
   * @param {string} mimeType - MIME type
   * @returns {Promise<string>} Media ID
   */
  async storeMedia(mediaId, data, mimeType) {
    await this.ensureInitialized();

    const mediaObject = {
      id: mediaId,
      data,
      mimeType,
      createdAt: new Date()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['media'], 'readwrite');
      const store = transaction.objectStore('media');
      const request = store.put(mediaObject);

      request.onsuccess = () => resolve(mediaId);
      request.onerror = () => reject(new Error('Failed to store media'));
    });
  }

  /**
   * Retrieve media by ID
   * @param {string} mediaId - Media ID
   * @returns {Promise<Object|null>} Media object or null if not found
   */
  async getMedia(mediaId) {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['media'], 'readonly');
      const store = transaction.objectStore('media');
      const request = store.get(mediaId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to retrieve media'));
    });
  }

  /**
   * Delete media by ID
   * @param {string} mediaId - Media ID
   * @returns {Promise<void>}
   */
  async deleteMedia(mediaId) {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['media'], 'readwrite');
      const store = transaction.objectStore('media');
      const request = store.delete(mediaId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete media'));
    });
  }

  // User Preferences Operations

  /**
   * Store user preferences in localStorage
   * @param {Object} preferences - User preferences object
   * @returns {Promise<void>}
   */
  async storeUserPreferences(preferences) {
    // Basic validation
    if (!preferences || typeof preferences !== 'object') {
      const error = new Error('Invalid user preferences data');
      console.error('User Preferences Validation Error:', error);
      throw error;
    }

    try {
      localStorage.setItem('QuizMaker-preferences', JSON.stringify(preferences));
    } catch (error) {
      // Handle storage quota exceeded
      if (error.name === 'QuotaExceededError') {
        console.error('Storage quota exceeded. Please clear some data or free up browser storage.');
      }
      
      const storageError = new Error('Failed to store user preferences: ' + error.message);
      console.error('User Preferences Storage Error:', storageError);
      throw storageError;
    }
  }

  /**
   * Retrieve user preferences from localStorage
   * @returns {Promise<Object|null>} User preferences or null if not found
   */
  async getUserPreferences() {
    try {
      const data = localStorage.getItem('QuizMaker-preferences');
      if (!data) return null;
      
      const preferences = JSON.parse(data);
      return preferences;
    } catch (error) {
      return null;
    }
  }

  /**
   * Update user preferences
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated preferences object
   */
  async updateUserPreferences(updates) {
    const existing = await this.getUserPreferences() || this.getDefaultUserPreferences();
    
    const updated = {
      apiKeys: { ...existing.apiKeys, ...updates.apiKeys },
      preferences: { ...existing.preferences, ...updates.preferences }
    };

    await this.storeUserPreferences(updated);
    return updated;
  }

  /**
   * Get default user preferences
   * @returns {Object} Default preferences object
   */
  getDefaultUserPreferences() {
    return {
      apiKeys: {},
      preferences: {
        theme: THEMES.LIGHT,
        defaultQuizSettings: {
          shuffleQuestions: false,
          showExplanations: true
        }
      }
    };
  }

  // Data Export/Import Operations

  /**
   * Export all user data
   * @returns {Promise<Object>} Export data object
   */
  async exportData() {
    await this.ensureInitialized();

    const [quizzes, results, preferences] = await Promise.all([
      this.getAllQuizzes(),
      this.getUserResults(),
      this.getUserPreferences()
    ]);

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      userId: this.userId,
      data: {
        quizzes,
        results,
        preferences
      }
    };
  }

  /**
   * Import data from export
   * @param {Object} importData - Data to import
   * @param {boolean} overwrite - Whether to overwrite existing data
   * @returns {Promise<Object>} Import summary
   */
  async importData(importData, overwrite = false) {
    await this.ensureInitialized();

    if (!importData || !importData.version || !importData.data) {
      throw new Error('Invalid import data format');
    }

    const summary = {
      quizzes: { imported: 0, skipped: 0 },
      results: { imported: 0, skipped: 0 },
      preferences: { imported: false }
    };

    // Import quizzes
    if (importData.data.quizzes) {
      for (const quiz of importData.data.quizzes) {
        try {
          const existing = await this.getQuiz(quiz.id);
          if (existing && !overwrite) {
            summary.quizzes.skipped++;
          } else {
            await this.storeQuiz(quiz);
            summary.quizzes.imported++;
          }
        } catch (error) {
          summary.quizzes.skipped++;
        }
      }
    }

    // Import results
    if (importData.data.results) {
      for (const result of importData.data.results) {
        try {
          const existing = await this.getResult(result.id);
          if (existing && !overwrite) {
            summary.results.skipped++;
          } else {
            await this.storeResult(result);
            summary.results.imported++;
          }
        } catch (error) {
          summary.results.skipped++;
        }
      }
    }

    // Import preferences
    if (importData.data.preferences) {
      try {
        await this.storeUserPreferences(importData.data.preferences);
        summary.preferences.imported = true;
      } catch (error) {
        // Preferences import failed
      }
    }

    return summary;
  }

  // Data Management Operations

  /**
   * Clear all data (requires confirmation)
   * @param {boolean} confirmed - Confirmation flag
   * @returns {Promise<void>}
   */
  async clearAllData(confirmed) {
    if (!confirmed) {
      throw new Error('Data clearing requires explicit confirmation');
    }

    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['quizzes', 'results', 'media'], 'readwrite');
      
      transaction.objectStore('quizzes').clear();
      transaction.objectStore('results').clear();
      transaction.objectStore('media').clear();

      transaction.oncomplete = () => {
        // Also clear localStorage
        try {
          localStorage.removeItem('QuizMaker-preferences');
          localStorage.removeItem('QuizMaker-user-id');
        } catch (error) {
          // Ignore localStorage errors
        }
        resolve();
      };
      
      transaction.onerror = () => reject(new Error('Failed to clear data'));
    });
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>} Storage statistics
   */
  async getStorageStats() {
    await this.ensureInitialized();

    const [quizzes, results] = await Promise.all([
      this.getAllQuizzes(),
      this.getUserResults()
    ]);

    const estimateSize = (obj) => JSON.stringify(obj).length * 2; // Rough estimate

    return {
      quizzes: {
        count: quizzes.length,
        estimatedSize: quizzes.reduce((sum, quiz) => sum + estimateSize(quiz), 0)
      },
      results: {
        count: results.length,
        estimatedSize: results.reduce((sum, result) => sum + estimateSize(result), 0)
      },
      totalEstimatedSize: quizzes.reduce((sum, quiz) => sum + estimateSize(quiz), 0) +
                         results.reduce((sum, result) => sum + estimateSize(result), 0)
    };
  }

  /**
   * Perform health check on storage systems
   * @returns {Promise<Object>} Health check results
   */
  async healthCheck() {
    const health = {
      indexedDB: false,
      localStorage: false,
      initialized: this.isInitialized,
      errors: []
    };

    // Check IndexedDB
    try {
      await this.ensureInitialized();
      health.indexedDB = true;
    } catch (error) {
      health.errors.push(`IndexedDB: ${error.message}`);
    }

    // Check localStorage
    try {
      localStorage.setItem('health-check', 'test');
      localStorage.removeItem('health-check');
      health.localStorage = true;
    } catch (error) {
      health.errors.push(`localStorage: ${error.message}`);
    }

    return health;
  }
}