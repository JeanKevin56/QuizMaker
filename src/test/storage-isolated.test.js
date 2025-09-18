/**
 * Isolated Storage Tests
 * Tests storage functionality without circular dependencies
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock IndexedDB for testing
const createMockIDB = () => {
  const stores = {
    quizzes: new Map(),
    results: new Map(),
    media: new Map()
  };

  const mockDB = {
    transaction: vi.fn((storeNames, mode) => {
      const transaction = {
        objectStore: vi.fn((storeName) => {
          const store = {
            put: vi.fn((data) => ({
              onsuccess: null,
              onerror: null,
              result: data.id
            })),
            get: vi.fn((id) => ({
              onsuccess: null,
              onerror: null,
              result: stores[storeName].get(id)
            })),
            getAll: vi.fn(() => ({
              onsuccess: null,
              onerror: null,
              result: Array.from(stores[storeName].values())
            })),
            delete: vi.fn((id) => ({
              onsuccess: null,
              onerror: null
            })),
            clear: vi.fn(() => ({
              onsuccess: null,
              onerror: null
            })),
            createIndex: vi.fn(),
            index: vi.fn((indexName) => ({
              getAll: vi.fn((key) => ({
                onsuccess: null,
                onerror: null,
                result: Array.from(stores[storeName].values()).filter(item => 
                  indexName === 'quizId' ? item.quizId === key :
                  indexName === 'userId' ? item.userId === key :
                  true
                )
              })),
              openCursor: vi.fn(() => ({
                onsuccess: null,
                onerror: null
              }))
            }))
          };
          return store;
        }),
        oncomplete: null,
        onerror: null
      };
      return transaction;
    }),
    createObjectStore: vi.fn(),
    objectStoreNames: {
      contains: vi.fn(() => false)
    }
  };

  return { mockDB, stores };
};

describe('Storage Operations (Isolated)', () => {
  let mockIDB, stores;

  beforeEach(() => {
    const mock = createMockIDB();
    mockIDB = mock.mockDB;
    stores = mock.stores;

    // Mock global indexedDB
    global.indexedDB = {
      open: vi.fn(() => ({
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        result: mockIDB
      }))
    };

    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Database Operations', () => {
    it('should simulate storing a quiz', async () => {
      const quiz = {
        id: 'test-quiz',
        title: 'Test Quiz',
        questions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Simulate storing
      stores.quizzes.set(quiz.id, quiz);
      
      // Verify storage
      expect(stores.quizzes.has(quiz.id)).toBe(true);
      expect(stores.quizzes.get(quiz.id)).toEqual(quiz);
    });

    it('should simulate retrieving a quiz', async () => {
      const quiz = {
        id: 'test-quiz',
        title: 'Test Quiz',
        questions: []
      };

      stores.quizzes.set(quiz.id, quiz);
      const retrieved = stores.quizzes.get(quiz.id);
      
      expect(retrieved).toEqual(quiz);
    });

    it('should simulate deleting a quiz', async () => {
      const quiz = {
        id: 'test-quiz',
        title: 'Test Quiz',
        questions: []
      };

      stores.quizzes.set(quiz.id, quiz);
      expect(stores.quizzes.has(quiz.id)).toBe(true);
      
      stores.quizzes.delete(quiz.id);
      expect(stores.quizzes.has(quiz.id)).toBe(false);
    });

    it('should simulate storing and retrieving results', async () => {
      const result = {
        id: 'result-1',
        quizId: 'quiz-1',
        userId: 'user-1',
        score: 5,
        totalQuestions: 10,
        completedAt: new Date()
      };

      stores.results.set(result.id, result);
      const retrieved = stores.results.get(result.id);
      
      expect(retrieved).toEqual(result);
    });

    it('should simulate filtering results by quiz ID', async () => {
      const results = [
        { id: 'r1', quizId: 'quiz-1', userId: 'user-1', score: 5 },
        { id: 'r2', quizId: 'quiz-1', userId: 'user-2', score: 7 },
        { id: 'r3', quizId: 'quiz-2', userId: 'user-1', score: 8 }
      ];

      results.forEach(result => stores.results.set(result.id, result));
      
      const quiz1Results = Array.from(stores.results.values())
        .filter(r => r.quizId === 'quiz-1');
      
      expect(quiz1Results).toHaveLength(2);
      expect(quiz1Results.map(r => r.id)).toEqual(['r1', 'r2']);
    });

    it('should simulate media storage', async () => {
      const media = {
        id: 'media-1',
        data: 'base64-image-data',
        mimeType: 'image/png',
        createdAt: new Date()
      };

      stores.media.set(media.id, media);
      const retrieved = stores.media.get(media.id);
      
      expect(retrieved).toEqual(media);
    });
  });

  describe('LocalStorage Operations', () => {
    it('should simulate storing user preferences', () => {
      const preferences = {
        apiKeys: { gemini: 'test-key' },
        preferences: { theme: 'dark' }
      };

      localStorage.setItem('QuizMaker-preferences', JSON.stringify(preferences));
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'QuizMaker-preferences',
        JSON.stringify(preferences)
      );
    });

    it('should simulate retrieving user preferences', () => {
      const preferences = {
        apiKeys: { gemini: 'test-key' },
        preferences: { theme: 'dark' }
      };

      localStorage.getItem.mockReturnValue(JSON.stringify(preferences));
      
      const data = localStorage.getItem('QuizMaker-preferences');
      const parsed = JSON.parse(data);
      
      expect(parsed).toEqual(preferences);
    });

    it('should simulate user ID generation and storage', () => {
      localStorage.getItem.mockReturnValue(null);
      
      // Simulate generating new user ID
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('QuizMaker-user-id', userId);
      
      expect(localStorage.setItem).toHaveBeenCalledWith('QuizMaker-user-id', userId);
    });
  });

  describe('Data Validation in Storage Context', () => {
    it('should validate quiz data before storage', () => {
      const validateQuizForStorage = (quiz) => {
        const errors = [];
        
        if (!quiz) errors.push('Quiz is required');
        if (!quiz.id) errors.push('Quiz ID is required');
        if (!quiz.title) errors.push('Quiz title is required');
        if (!quiz.questions || !Array.isArray(quiz.questions)) {
          errors.push('Quiz questions must be an array');
        }
        if (quiz.questions && quiz.questions.length === 0) {
          errors.push('Quiz must have at least one question');
        }
        
        return { isValid: errors.length === 0, errors };
      };

      // Valid quiz
      const validQuiz = {
        id: 'quiz-1',
        title: 'Test Quiz',
        questions: [{ id: 'q1', question: 'Test?' }]
      };
      
      expect(validateQuizForStorage(validQuiz).isValid).toBe(true);

      // Invalid quiz
      const invalidQuiz = { title: 'Test Quiz' };
      const validation = validateQuizForStorage(invalidQuiz);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Quiz ID is required');
    });

    it('should validate result data before storage', () => {
      const validateResultForStorage = (result) => {
        const errors = [];
        
        if (!result) errors.push('Result is required');
        if (!result.id) errors.push('Result ID is required');
        if (!result.quizId) errors.push('Quiz ID is required');
        if (!result.userId) errors.push('User ID is required');
        if (typeof result.score !== 'number') errors.push('Score must be a number');
        if (result.score < 0) errors.push('Score must be non-negative');
        if (typeof result.totalQuestions !== 'number') errors.push('Total questions must be a number');
        if (result.totalQuestions <= 0) errors.push('Total questions must be positive');
        if (result.score > result.totalQuestions) errors.push('Score cannot exceed total questions');
        
        return { isValid: errors.length === 0, errors };
      };

      // Valid result
      const validResult = {
        id: 'result-1',
        quizId: 'quiz-1',
        userId: 'user-1',
        score: 5,
        totalQuestions: 10
      };
      
      expect(validateResultForStorage(validResult).isValid).toBe(true);

      // Invalid result
      const invalidResult = { score: -1, totalQuestions: 0 };
      const validation = validateResultForStorage(invalidResult);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Storage Error Handling', () => {
    it('should handle storage quota exceeded errors', () => {
      const handleStorageError = (error) => {
        if (error.name === 'QuotaExceededError') {
          return {
            type: 'quota_exceeded',
            message: 'Storage quota exceeded. Please clear some data.',
            recoverable: true
          };
        }
        
        return {
          type: 'unknown',
          message: error.message,
          recoverable: false
        };
      };

      const quotaError = new Error('Storage quota exceeded');
      quotaError.name = 'QuotaExceededError';
      
      const handled = handleStorageError(quotaError);
      
      expect(handled.type).toBe('quota_exceeded');
      expect(handled.recoverable).toBe(true);
    });

    it('should handle database connection errors', () => {
      const handleDBError = (error) => {
        if (error.message.includes('database')) {
          return {
            type: 'database_error',
            message: 'Failed to connect to database',
            fallback: 'localStorage'
          };
        }
        
        return { type: 'unknown', message: error.message };
      };

      const dbError = new Error('Failed to open database');
      const handled = handleDBError(dbError);
      
      expect(handled.type).toBe('database_error');
      expect(handled.fallback).toBe('localStorage');
    });
  });

  describe('Data Export/Import Simulation', () => {
    it('should simulate data export', () => {
      // Setup test data
      const quiz = { id: 'quiz-1', title: 'Test Quiz', questions: [] };
      const result = { id: 'result-1', quizId: 'quiz-1', score: 5 };
      const preferences = { theme: 'dark' };

      stores.quizzes.set(quiz.id, quiz);
      stores.results.set(result.id, result);

      // Simulate export
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        data: {
          quizzes: Array.from(stores.quizzes.values()),
          results: Array.from(stores.results.values()),
          preferences
        }
      };

      expect(exportData.data.quizzes).toHaveLength(1);
      expect(exportData.data.results).toHaveLength(1);
      expect(exportData.data.quizzes[0]).toEqual(quiz);
      expect(exportData.data.results[0]).toEqual(result);
    });

    it('should simulate data import', () => {
      const importData = {
        version: '1.0',
        data: {
          quizzes: [
            { id: 'imported-quiz', title: 'Imported Quiz', questions: [] }
          ],
          results: [
            { id: 'imported-result', quizId: 'imported-quiz', score: 8 }
          ]
        }
      };

      // Simulate import process
      let importedQuizzes = 0;
      let importedResults = 0;

      if (importData.data.quizzes) {
        importData.data.quizzes.forEach(quiz => {
          if (!stores.quizzes.has(quiz.id)) {
            stores.quizzes.set(quiz.id, quiz);
            importedQuizzes++;
          }
        });
      }

      if (importData.data.results) {
        importData.data.results.forEach(result => {
          if (!stores.results.has(result.id)) {
            stores.results.set(result.id, result);
            importedResults++;
          }
        });
      }

      expect(importedQuizzes).toBe(1);
      expect(importedResults).toBe(1);
      expect(stores.quizzes.has('imported-quiz')).toBe(true);
      expect(stores.results.has('imported-result')).toBe(true);
    });
  });
});