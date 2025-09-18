/**
 * Tests for AIExplanationService
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { AIExplanationService } from '../services/AIExplanationService.js';

// Mock GeminiAPIService
vi.mock('../services/GeminiAPIService.js', () => ({
  GeminiAPIService: vi.fn()
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};
global.localStorage = localStorageMock;

describe('AIExplanationService', () => {
  let service;
  let mockGeminiService;

  beforeEach(() => {
    mockGeminiService = {
      makeRequest: vi.fn(),
      extractTextFromResponse: vi.fn(),
      getAPIKeyStatus: vi.fn(() => ({ hasKey: true, isValid: true }))
    };
    
    const { GeminiAPIService } = await import('../services/GeminiAPIService.js');
    GeminiAPIService.mockImplementation(() => mockGeminiService);
    
    // Clear localStorage mocks
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    
    service = new AIExplanationService();
  });

  describe('Explanation Generation', () => {
    const sampleQuestion = {
      id: 'q1',
      type: 'mcq-single',
      question: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctAnswer: 1,
      explanation: 'Basic arithmetic'
    };

    beforeEach(() => {
      mockGeminiService.makeRequest.mockResolvedValue({});
      mockGeminiService.extractTextFromResponse.mockReturnValue(
        'Great job! You got it right. 2 + 2 equals 4, which is basic arithmetic.'
      );
    });

    test('should generate explanation for correct answer', async () => {
      const result = await service.generateExplanation(sampleQuestion, 1, true);

      expect(result.success).toBe(true);
      expect(result.explanation).toContain('Great job');
      expect(result.fromCache).toBe(false);
      expect(result.generatedAt).toBeDefined();
    });

    test('should generate explanation for incorrect answer', async () => {
      mockGeminiService.extractTextFromResponse.mockReturnValue(
        'Not quite right. The correct answer is 4, not 3. Remember that 2 + 2 = 4.'
      );

      const result = await service.generateExplanation(sampleQuestion, 0, false);

      expect(result.success).toBe(true);
      expect(result.explanation).toContain('Not quite right');
      expect(result.fromCache).toBe(false);
    });

    test('should use cached explanation when available', async () => {
      // First call
      await service.generateExplanation(sampleQuestion, 1, true);
      
      // Second call should use cache
      const result = await service.generateExplanation(sampleQuestion, 1, true);

      expect(result.fromCache).toBe(true);
      expect(mockGeminiService.makeRequest).toHaveBeenCalledTimes(1);
    });

    test('should force refresh when requested', async () => {
      // First call
      await service.generateExplanation(sampleQuestion, 1, true);
      
      // Second call with force refresh
      const result = await service.generateExplanation(sampleQuestion, 1, true, { forceRefresh: true });

      expect(result.fromCache).toBe(false);
      expect(mockGeminiService.makeRequest).toHaveBeenCalledTimes(2);
    });

    test('should handle API errors gracefully', async () => {
      mockGeminiService.makeRequest.mockRejectedValue(new Error('API Error'));

      const result = await service.generateExplanation(sampleQuestion, 1, true);

      expect(result.success).toBe(false);
      expect(result.explanation).toBe('Correct! Your answer is right.');
      expect(result.error).toBe('API Error');
    });
  });

  describe('General Explanations', () => {
    const sampleQuestion = {
      id: 'q1',
      type: 'mcq-single',
      question: 'What is the capital of France?',
      options: ['London', 'Paris', 'Berlin', 'Madrid'],
      correctAnswer: 1
    };

    beforeEach(() => {
      mockGeminiService.makeRequest.mockResolvedValue({});
      mockGeminiService.extractTextFromResponse.mockReturnValue(
        'Paris is the capital of France. It has been the capital since 987 AD.'
      );
    });

    test('should generate general explanation', async () => {
      const result = await service.generateGeneralExplanation(sampleQuestion);

      expect(result.success).toBe(true);
      expect(result.explanation).toContain('Paris is the capital');
      expect(result.fromCache).toBe(false);
    });

    test('should cache general explanations', async () => {
      // First call
      await service.generateGeneralExplanation(sampleQuestion);
      
      // Second call should use cache
      const result = await service.generateGeneralExplanation(sampleQuestion);

      expect(result.fromCache).toBe(true);
      expect(mockGeminiService.makeRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe('Prompt Building', () => {
    test('should build MCQ single prompt correctly', () => {
      const question = {
        type: 'mcq-single',
        question: 'What is 2 + 2?',
        options: ['3', '4', '5', '6'],
        correctAnswer: 1
      };

      const prompt = service.buildExplanationPrompt(question, 0, false);

      expect(prompt).toContain('What is 2 + 2?');
      expect(prompt).toContain('A. 3');
      expect(prompt).toContain('B. 4');
      expect(prompt).toContain('Student\'s Answer: 3');
      expect(prompt).toContain('Correct Answer: 4');
    });

    test('should build MCQ multiple prompt correctly', () => {
      const question = {
        type: 'mcq-multiple',
        question: 'Which are programming languages?',
        options: ['JavaScript', 'HTML', 'Python', 'CSS'],
        correctAnswers: [0, 2]
      };

      const prompt = service.buildExplanationPrompt(question, [0, 1], false);

      expect(prompt).toContain('Which are programming languages?');
      expect(prompt).toContain('A. JavaScript');
      expect(prompt).toContain('Student\'s Answer: JavaScript, HTML');
      expect(prompt).toContain('Correct Answer: JavaScript, Python');
    });

    test('should build text input prompt correctly', () => {
      const question = {
        type: 'text-input',
        question: 'What is the largest planet?',
        correctAnswer: 'Jupiter'
      };

      const prompt = service.buildExplanationPrompt(question, 'Mars', false);

      expect(prompt).toContain('What is the largest planet?');
      expect(prompt).toContain('Student\'s Answer: Mars');
      expect(prompt).toContain('Correct Answer: Jupiter');
    });

    test('should format MCQ options correctly', () => {
      const options = ['Option A', 'Option B', 'Option C'];
      const formatted = service.formatMCQOptions(options);

      expect(formatted).toBe('Options:\nA. Option A\nB. Option B\nC. Option C');
    });
  });

  describe('Fallback Explanations', () => {
    test('should use question explanation as fallback', () => {
      const question = {
        type: 'mcq-single',
        question: 'Test question?',
        options: ['A', 'B'],
        correctAnswer: 1,
        explanation: 'This is the original explanation'
      };

      const fallback = service.generateFallbackExplanation(question, 0, false);
      expect(fallback).toBe('This is the original explanation');
    });

    test('should generate fallback for correct answer', () => {
      const question = {
        type: 'mcq-single',
        question: 'Test question?',
        options: ['A', 'B'],
        correctAnswer: 1
      };

      const fallback = service.generateFallbackExplanation(question, 1, true);
      expect(fallback).toBe('Correct! Your answer is right.');
    });

    test('should generate fallback for incorrect MCQ single', () => {
      const question = {
        type: 'mcq-single',
        question: 'Test question?',
        options: ['Wrong', 'Right'],
        correctAnswer: 1
      };

      const fallback = service.generateFallbackExplanation(question, 0, false);
      expect(fallback).toContain('The correct answer is: Right');
    });

    test('should generate fallback for incorrect text input', () => {
      const question = {
        type: 'text-input',
        question: 'What is the answer?',
        correctAnswer: 'Correct Answer'
      };

      const fallback = service.generateFallbackExplanation(question, 'Wrong Answer', false);
      expect(fallback).toContain('The correct answer is: Correct Answer');
    });
  });

  describe('Caching', () => {
    test('should create consistent cache keys', () => {
      const question = { question: 'Test?', options: ['A', 'B'] };
      
      const key1 = service.createCacheKey(question, 'answer', true);
      const key2 = service.createCacheKey(question, 'answer', true);
      const key3 = service.createCacheKey(question, 'different', true);

      expect(key1).toBe(key2);
      expect(key1).not.toBe(key3);
    });

    test('should hash strings consistently', () => {
      const hash1 = service.hashString('test string');
      const hash2 = service.hashString('test string');
      const hash3 = service.hashString('different string');

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });

    test('should clear cache', () => {
      service.cache.set('test', { explanation: 'test' });
      expect(service.cache.size).toBe(1);

      service.clearCache();
      expect(service.cache.size).toBe(0);
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });

    test('should return cache statistics', () => {
      const stats = service.getCacheStats();

      expect(stats).toMatchObject({
        size: expect.any(Number),
        maxSize: expect.any(Number),
        expiryHours: expect.any(Number)
      });
    });
  });

  describe('Batch Operations', () => {
    const questions = [
      {
        id: 'q1',
        type: 'mcq-single',
        question: 'Question 1?',
        options: ['A', 'B'],
        correctAnswer: 1
      },
      {
        id: 'q2',
        type: 'text-input',
        question: 'Question 2?',
        correctAnswer: 'Answer'
      }
    ];

    beforeEach(() => {
      mockGeminiService.makeRequest.mockResolvedValue({});
      mockGeminiService.extractTextFromResponse.mockReturnValue('Generated explanation');
    });

    test('should batch generate explanations', async () => {
      const results = await service.batchGenerateExplanations(questions);

      expect(results).toHaveLength(2);
      expect(results[0].questionId).toBe('q1');
      expect(results[1].questionId).toBe('q2');
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    test('should handle errors in batch processing', async () => {
      mockGeminiService.makeRequest.mockRejectedValueOnce(new Error('API Error'));
      mockGeminiService.makeRequest.mockResolvedValueOnce({});

      const results = await service.batchGenerateExplanations(questions);

      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(true);
      expect(results[0].error).toBe('API Error');
    });
  });

  describe('Service Status', () => {
    test('should return service status', () => {
      const status = service.getStatus();

      expect(status).toMatchObject({
        apiKeyStatus: expect.any(Object),
        cacheStats: expect.any(Object),
        isReady: expect.any(Boolean)
      });
    });
  });

  describe('Text Cleaning', () => {
    test('should clean explanation text', () => {
      const messy = '  This   is\n\n\n\nmessy   text.  \n  ';
      const cleaned = service.cleanExplanationText(messy);

      expect(cleaned).toBe('This is\n\nmessy text.');
    });

    test('should handle empty or invalid text', () => {
      expect(service.cleanExplanationText('')).toBe('No explanation available.');
      expect(service.cleanExplanationText(null)).toBe('No explanation available.');
      expect(service.cleanExplanationText(undefined)).toBe('No explanation available.');
    });
  });
});