/**
 * Unit tests for StorageManager
 * Tests all storage operations including IndexedDB and LocalStorage functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StorageManager } from '../services/StorageManager.js';
import { QUESTION_TYPES } from '../models/types.js';

// Mock IndexedDB for testing
class MockIDBDatabase {
  constructor() {
    this.objectStoreNames = {
      contains: vi.fn(() => false)
    };
  }

  transaction(stores, mode) {
    return new MockIDBTransaction(stores, mode);
  }

  createObjectStore(name, options) {
    return new MockIDBObjectStore(name, options);
  }
}

class MockIDBTransaction {
  constructor(stores, mode) {
    this.stores = stores;
    this.mode = mode;
    this.oncomplete = null;
    this.onerror = null;
  }

  objectStore(name) {
    return new MockIDBObjectStore(name);
  }
}

class MockIDBObjectStore {
  constructor(name, options = {}) {
    this.name = name;
    this.options = options;
    this.data = new Map();
    this.indices = new Map();
  }

  createIndex(name, keyPath, options) {
    this.indices.set(name, { name, keyPath, options });
    return { name, keyPath, options };
  }

  index(name) {
    return {
      getAll: (key) => ({
        onsuccess: null,
        onerror: null,
        result: Array.from(this.data.values()).filter(item => {
          const index = this.indices.get(name);
          return key ? (index && item[index.keyPath] === key) : true;
        })
      }),
      openCursor: (range) => ({
        onsuccess: null,
        onerror: null
      })
    };
  }

  put(data) {
    this.data.set(data.id, data);
    return {
      onsuccess: null,
      onerror: null,
      result: data.id
    };
  }

  get(key) {
    return {
      onsuccess: null,
      onerror: null,
      result: this.data.get(key) || null
    };
  }

  getAll() {
    return {
      onsuccess: null,
      onerror: null,
      result: Array.from(this.data.values())
    };
  }

  delete(key) {
    return {
      onsuccess: null,
      onerror: null,
      result: this.data.delete(key)
    };
  }

  clear() {
    this.data.clear();
    return {
      onsuccess: null,
      onerror: null
    };
  }
}

// Mock IndexedDB global
const mockIndexedDB = {
  open: vi.fn((name, version) => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: new MockIDBDatabase()
  }))
};

// Test data fixtures
const createTestQuiz = (id = 'test-quiz-1') => ({
  id,
  title: 'Test Quiz',
  description: 'A test quiz for unit testing',
  questions: [
    {
      id: 'q1',
      type: QUESTION_TYPES.MCQ_SINGLE,
      question: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctAnswer: 1,
      explanation: '2 + 2 equals 4'
    }
  ],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  settings: {
    shuffleQuestions: false,
    showExplanations: true
  }
});

const createTestResult = (id = 'test-result-1', quizId = 'test-quiz-1') => ({
  id,
  quizId,
  userId: 'test-user',
  score: 100,
  totalQuestions: 1,
  answers: [
    {
      questionId: 'q1',
      userAnswer: 1,
      isCorrect: true,
      explanation: '2 + 2 equals 4'
    }
  ],
  completedAt: new Date('2024-01-01'),
  timeSpent: 30
});

const createTestUserPreferences = () => ({
  apiKeys: {
    gemini: 'test-api-key'
  },
  preferences: {
    theme: 'dark',
    defaultQuizSettings: {
      shuffleQuestions: true,
      showExplanations: false
    }
  }
});

describe('StorageManager', () => {
  let storageManager;
  let mockLocalStorage;

  beforeEach(() => {
    // Mock IndexedDB
    global.indexedDB = mockIndexedDB;
    
    // Mock localStorage
    mockLocalStorage = {
      data: new Map(),
      getItem: vi.fn((key) => mockLocalStorage.data.get(key) || null),
      setItem: vi.fn((key, value) => mockLocalStorage.data.set(key, value)),
      removeItem: vi.fn((key) => mockLocalStorage.data.delete(key)),
      clear: vi.fn(() => mockLocalStorage.data.clear())
    };
    global.localStorage = mockLocalStorage;

    // Create fresh instance
    storageManager = new StorageManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid browser support', async () => {
      await expect(storageManager.initialize()).resolves.not.toThrow();
      expect(storageManager.isInitialized).toBe(true);
    });

    it('should throw error when IndexedDB is not supported', async () => {
      global.indexedDB = undefined;
      storageManager = new StorageManager();
      
      await expect(storageManager.initialize()).rejects.toThrow('IndexedDB not supported');
    });

    it('should generate user ID on initialization', () => {
      expect(storageManager.getUserId()).toMatch(/^user_\d+_[a-z0-9]+$/);
    });

    it('should reuse existing user ID from localStorage', () => {
      const existingUserId = 'existing-user-123';
      mockLocalStorage.data.set('quiz-platform-user-id', existingUserId);
      
      const newStorageManager = new StorageManager();
      expect(newStorageManager.getUserId()).toBe(existingUserId);
    });
  });

  describe('Quiz Operations', () => {
    beforeEach(async () => {
      await storageManager.initialize();
    });

    it('should store a valid quiz', async () => {
      const quiz = createTestQuiz();
      const result = await storageManager.storeQuiz(quiz);
      expect(result).toBe(quiz.id);
    });

    it('should reject invalid quiz data', async () => {
      const invalidQuiz = { id: 'invalid', title: '' }; // Missing required fields
      await expect(storageManager.storeQuiz(invalidQuiz)).rejects.toThrow('Invalid quiz data');
    });

    it('should retrieve stored quiz by ID', async () => {
      const quiz = createTestQuiz();
      await storageManager.storeQuiz(quiz);
      
      const retrieved = await storageManager.getQuiz(quiz.id);
      expect(retrieved).toEqual(quiz);
    });

    it('should return null for non-existent quiz', async () => {
      const result = await storageManager.getQuiz('non-existent');
      expect(result).toBeNull();
    });

    it('should retrieve all quizzes', async () => {
      const quiz1 = createTestQuiz('quiz-1');
      const quiz2 = createTestQuiz('quiz-2');
      
      await storageManager.storeQuiz(quiz1);
      await storageManager.storeQuiz(quiz2);
      
      const allQuizzes = await storageManager.getAllQuizzes();
      expect(allQuizzes).toHaveLength(2);
      expect(allQuizzes.map(q => q.id)).toContain('quiz-1');
      expect(allQuizzes.map(q => q.id)).toContain('quiz-2');
    });

    it('should update existing quiz', async () => {
      const quiz = createTestQuiz();
      await storageManager.storeQuiz(quiz);
      
      const updates = { title: 'Updated Title' };
      const updated = await storageManager.updateQuiz(quiz.id, updates);
      
      expect(updated.title).toBe('Updated Title');
      expect(updated.id).toBe(quiz.id);
      expect(updated.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error when updating non-existent quiz', async () => {
      await expect(storageManager.updateQuiz('non-existent', { title: 'New Title' }))
        .rejects.toThrow('Quiz not found');
    });

    it('should delete quiz and associated results', async () => {
      const quiz = createTestQuiz();
      const result = createTestResult();
      
      await storageManager.storeQuiz(quiz);
      await storageManager.storeResult(result);
      
      await storageManager.deleteQuiz(quiz.id);
      
      const retrievedQuiz = await storageManager.getQuiz(quiz.id);
      expect(retrievedQuiz).toBeNull();
    });
  });

  describe('Result Operations', () => {
    beforeEach(async () => {
      await storageManager.initialize();
    });

    it('should store a valid result', async () => {
      const result = createTestResult();
      const resultId = await storageManager.storeResult(result);
      expect(resultId).toBe(result.id);
    });

    it('should reject invalid result data', async () => {
      const invalidResult = { id: 'invalid', score: 'not-a-number' };
      await expect(storageManager.storeResult(invalidResult)).rejects.toThrow('Invalid result data');
    });

    it('should retrieve results for specific quiz', async () => {
      const result1 = createTestResult('result-1', 'quiz-1');
      const result2 = createTestResult('result-2', 'quiz-1');
      const result3 = createTestResult('result-3', 'quiz-2');
      
      await storageManager.storeResult(result1);
      await storageManager.storeResult(result2);
      await storageManager.storeResult(result3);
      
      const quiz1Results = await storageManager.getResultsForQuiz('quiz-1');
      expect(quiz1Results).toHaveLength(2);
      expect(quiz1Results.map(r => r.id)).toContain('result-1');
      expect(quiz1Results.map(r => r.id)).toContain('result-2');
    });

    it('should retrieve all user results', async () => {
      const result1 = createTestResult('result-1');
      const result2 = createTestResult('result-2');
      
      await storageManager.storeResult(result1);
      await storageManager.storeResult(result2);
      
      const userResults = await storageManager.getUserResults();
      expect(userResults).toHaveLength(2);
    });

    it('should retrieve specific result by ID', async () => {
      const result = createTestResult();
      await storageManager.storeResult(result);
      
      const retrieved = await storageManager.getResult(result.id);
      expect(retrieved).toEqual(result);
    });

    it('should delete specific result', async () => {
      const result = createTestResult();
      await storageManager.storeResult(result);
      
      await storageManager.deleteResult(result.id);
      
      const retrieved = await storageManager.getResult(result.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('Media Operations', () => {
    beforeEach(async () => {
      await storageManager.initialize();
    });

    it('should store media as base64', async () => {
      const mediaId = 'test-image-1';
      const base64Data = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      const mimeType = 'image/png';
      
      const result = await storageManager.storeMedia(mediaId, base64Data, mimeType);
      expect(result).toBe(mediaId);
    });

    it('should retrieve stored media', async () => {
      const mediaId = 'test-image-1';
      const base64Data = 'test-data';
      const mimeType = 'image/png';
      
      await storageManager.storeMedia(mediaId, base64Data, mimeType);
      const retrieved = await storageManager.getMedia(mediaId);
      
      expect(retrieved.id).toBe(mediaId);
      expect(retrieved.data).toBe(base64Data);
      expect(retrieved.mimeType).toBe(mimeType);
    });

    it('should delete media', async () => {
      const mediaId = 'test-image-1';
      await storageManager.storeMedia(mediaId, 'test-data', 'image/png');
      
      await storageManager.deleteMedia(mediaId);
      
      const retrieved = await storageManager.getMedia(mediaId);
      expect(retrieved).toBeNull();
    });
  });

  describe('User Preferences Operations', () => {
    beforeEach(async () => {
      await storageManager.initialize();
    });

    it('should store valid user preferences', async () => {
      const preferences = createTestUserPreferences();
      await expect(storageManager.storeUserPreferences(preferences)).resolves.not.toThrow();
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'quiz-platform-preferences',
        JSON.stringify(preferences)
      );
    });

    it('should reject invalid user preferences', async () => {
      const invalidPreferences = { apiKeys: 'not-an-object' };
      await expect(storageManager.storeUserPreferences(invalidPreferences))
        .rejects.toThrow('Invalid user preferences data');
    });

    it('should retrieve stored user preferences', async () => {
      const preferences = createTestUserPreferences();
      mockLocalStorage.data.set('quiz-platform-preferences', JSON.stringify(preferences));
      
      const retrieved = await storageManager.getUserPreferences();
      expect(retrieved).toEqual(preferences);
    });

    it('should return null for non-existent preferences', async () => {
      const retrieved = await storageManager.getUserPreferences();
      expect(retrieved).toBeNull();
    });

    it('should update user preferences', async () => {
      const initial = createTestUserPreferences();
      await storageManager.storeUserPreferences(initial);
      
      const updates = {
        preferences: { theme: 'light' }
      };
      
      const updated = await storageManager.updateUserPreferences(updates);
      expect(updated.preferences.theme).toBe('light');
      expect(updated.apiKeys.gemini).toBe('test-api-key'); // Should preserve existing
    });

    it('should provide default user preferences', () => {
      const defaults = storageManager.getDefaultUserPreferences();
      expect(defaults).toHaveProperty('apiKeys');
      expect(defaults).toHaveProperty('preferences');
      expect(defaults.preferences.theme).toBe('light');
    });
  });

  describe('Data Export/Import Operations', () => {
    beforeEach(async () => {
      await storageManager.initialize();
    });

    it('should export all user data', async () => {
      const quiz = createTestQuiz();
      const result = createTestResult();
      const preferences = createTestUserPreferences();
      
      await storageManager.storeQuiz(quiz);
      await storageManager.storeResult(result);
      await storageManager.storeUserPreferences(preferences);
      
      const exportData = await storageManager.exportData();
      
      expect(exportData).toHaveProperty('version');
      expect(exportData).toHaveProperty('exportedAt');
      expect(exportData).toHaveProperty('userId');
      expect(exportData.data.quizzes).toHaveLength(1);
      expect(exportData.data.results).toHaveLength(1);
      expect(exportData.data.preferences).toEqual(preferences);
    });

    it('should import valid data', async () => {
      const importData = {
        version: '1.0',
        data: {
          quizzes: [createTestQuiz()],
          results: [createTestResult()],
          preferences: createTestUserPreferences()
        }
      };
      
      const summary = await storageManager.importData(importData);
      
      expect(summary.quizzes.imported).toBe(1);
      expect(summary.results.imported).toBe(1);
      expect(summary.preferences.imported).toBe(true);
    });

    it('should skip existing data when not overwriting', async () => {
      const quiz = createTestQuiz();
      await storageManager.storeQuiz(quiz);
      
      const importData = {
        version: '1.0',
        data: {
          quizzes: [quiz]
        }
      };
      
      const summary = await storageManager.importData(importData, false);
      expect(summary.quizzes.skipped).toBe(1);
      expect(summary.quizzes.imported).toBe(0);
    });

    it('should overwrite existing data when specified', async () => {
      const quiz = createTestQuiz();
      await storageManager.storeQuiz(quiz);
      
      const updatedQuiz = { ...quiz, title: 'Updated Title' };
      const importData = {
        version: '1.0',
        data: {
          quizzes: [updatedQuiz]
        }
      };
      
      const summary = await storageManager.importData(importData, true);
      expect(summary.quizzes.imported).toBe(1);
      expect(summary.quizzes.skipped).toBe(0);
    });

    it('should reject invalid import data', async () => {
      const invalidData = { invalid: 'data' };
      await expect(storageManager.importData(invalidData))
        .rejects.toThrow('Invalid import data format');
    });
  });

  describe('Data Management Operations', () => {
    beforeEach(async () => {
      await storageManager.initialize();
    });

    it('should clear all data when confirmed', async () => {
      const quiz = createTestQuiz();
      const result = createTestResult();
      
      await storageManager.storeQuiz(quiz);
      await storageManager.storeResult(result);
      
      await storageManager.clearAllData(true);
      
      const quizzes = await storageManager.getAllQuizzes();
      const results = await storageManager.getUserResults();
      
      expect(quizzes).toHaveLength(0);
      expect(results).toHaveLength(0);
    });

    it('should require confirmation to clear data', async () => {
      await expect(storageManager.clearAllData(false))
        .rejects.toThrow('Data clearing requires explicit confirmation');
    });

    it('should provide storage statistics', async () => {
      const quiz = createTestQuiz();
      const result = createTestResult();
      
      await storageManager.storeQuiz(quiz);
      await storageManager.storeResult(result);
      
      const stats = await storageManager.getStorageStats();
      
      expect(stats.quizzes.count).toBe(1);
      expect(stats.results.count).toBe(1);
      expect(stats.totalEstimatedSize).toBeGreaterThan(0);
    });

    it('should perform health check', async () => {
      const health = await storageManager.healthCheck();
      
      expect(health).toHaveProperty('indexedDB');
      expect(health).toHaveProperty('localStorage');
      expect(health).toHaveProperty('initialized');
      expect(health).toHaveProperty('errors');
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage failures gracefully', async () => {
      // Mock localStorage to throw errors
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const preferences = createTestUserPreferences();
      await expect(storageManager.storeUserPreferences(preferences))
        .rejects.toThrow('Failed to store user preferences');
    });

    it('should handle corrupted localStorage data', async () => {
      mockLocalStorage.data.set('quiz-platform-preferences', 'invalid-json');
      
      const retrieved = await storageManager.getUserPreferences();
      expect(retrieved).toBeNull();
    });

    it('should ensure initialization before operations', async () => {
      const uninitializedManager = new StorageManager();
      
      // Should auto-initialize when needed
      const quiz = createTestQuiz();
      await expect(uninitializedManager.storeQuiz(quiz)).resolves.not.toThrow();
      expect(uninitializedManager.isInitialized).toBe(true);
    });
  });

  describe('Utility Methods', () => {
    it('should return current user ID', () => {
      const userId = storageManager.getUserId();
      expect(typeof userId).toBe('string');
      expect(userId.length).toBeGreaterThan(0);
    });

    it('should handle fallback user ID when localStorage fails', () => {
      // Mock localStorage to fail
      const originalLocalStorage = global.localStorage;
      global.localStorage = {
        getItem: () => { throw new Error('Access denied'); },
        setItem: () => { throw new Error('Access denied'); }
      };
      
      const fallbackManager = new StorageManager();
      const userId = fallbackManager.getUserId();
      
      expect(userId).toMatch(/^user_\d+_[a-z0-9]+$/);
      
      // Restore localStorage
      global.localStorage = originalLocalStorage;
    });
  });
});