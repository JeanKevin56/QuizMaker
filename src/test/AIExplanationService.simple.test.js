/**
 * Simple tests for AIExplanationService
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { AIExplanationService } from '../services/AIExplanationService.js';

// Mock localStorage
global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};

describe('AIExplanationService', () => {
  let service;

  beforeEach(() => {
    // Clear localStorage mocks
    vi.clearAllMocks();
    service = new AIExplanationService();
  });

  describe('Prompt Building', () => {
    test('should format MCQ options correctly', () => {
      const options = ['Option A', 'Option B', 'Option C'];
      const formatted = service.formatMCQOptions(options);

      expect(formatted).toBe('Options:\nA. Option A\nB. Option B\nC. Option C');
    });

    test('should handle empty options array', () => {
      const formatted = service.formatMCQOptions([]);
      expect(formatted).toBe('');
    });

    test('should handle null options', () => {
      const formatted = service.formatMCQOptions(null);
      expect(formatted).toBe('');
    });
  });

  describe('Text Cleaning', () => {
    test('should clean explanation text', () => {
      const messy = '  This   is\n\n\n\nmessy   text.  \n  ';
      const cleaned = service.cleanExplanationText(messy);

      expect(cleaned).toBe('This is messy text.');
    });

    test('should handle empty or invalid text', () => {
      expect(service.cleanExplanationText('')).toBe('No explanation available.');
      expect(service.cleanExplanationText(null)).toBe('No explanation available.');
      expect(service.cleanExplanationText(undefined)).toBe('No explanation available.');
    });

    test('should normalize whitespace', () => {
      const text = 'This  has   multiple    spaces';
      const cleaned = service.cleanExplanationText(text);
      expect(cleaned).toBe('This has multiple spaces');
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

    test('should generate fallback for incorrect MCQ multiple', () => {
      const question = {
        type: 'mcq-multiple',
        question: 'Test question?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswers: [1, 2]
      };

      const fallback = service.generateFallbackExplanation(question, [0], false);
      expect(fallback).toContain('The correct answers are: B, C');
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

    test('should return cache statistics', () => {
      const stats = service.getCacheStats();

      expect(stats).toMatchObject({
        size: expect.any(Number),
        maxSize: expect.any(Number),
        expiryHours: expect.any(Number)
      });
    });
  });

  describe('Template Filling', () => {
    test('should fill MCQ single template correctly', () => {
      const template = 'Question: {question}\n{optionsText}\nUser: {userAnswer}\nCorrect: {correctAnswer}';
      const question = {
        type: 'mcq-single',
        question: 'What is 2 + 2?',
        options: ['3', '4', '5', '6'],
        correctAnswer: 1
      };

      const filled = service.fillPromptTemplate(template, question, 0);

      expect(filled).toContain('What is 2 + 2?');
      expect(filled).toContain('A. 3');
      expect(filled).toContain('B. 4');
      expect(filled).toContain('User: 3');
      expect(filled).toContain('Correct: 4');
    });

    test('should fill text input template correctly', () => {
      const template = 'Question: {question}\nUser: {userAnswer}\nCorrect: {correctAnswer}';
      const question = {
        type: 'text-input',
        question: 'What is the largest planet?',
        correctAnswer: 'Jupiter'
      };

      const filled = service.fillPromptTemplate(template, question, 'Mars');

      expect(filled).toContain('What is the largest planet?');
      expect(filled).toContain('User: Mars');
      expect(filled).toContain('Correct: Jupiter');
    });

    test('should handle null user answer', () => {
      const template = 'User: {userAnswer}';
      const question = {
        type: 'text-input',
        question: 'Test?',
        correctAnswer: 'Answer'
      };

      const filled = service.fillPromptTemplate(template, question, null);
      expect(filled).toContain('User: Not provided');
    });
  });
});