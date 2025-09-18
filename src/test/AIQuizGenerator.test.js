/**
 * Tests for AIQuizGenerator
 */

import { AIQuizGenerator } from '../services/AIQuizGenerator.js';
import { GeminiAPIService } from '../services/GeminiAPIService.js';
import { QUESTION_TYPES } from '../models/types.js';

// Mock GeminiAPIService
jest.mock('../services/GeminiAPIService.js');

describe('AIQuizGenerator', () => {
  let generator;
  let mockGeminiService;

  beforeEach(() => {
    mockGeminiService = {
      makeRequest: jest.fn(),
      extractTextFromResponse: jest.fn(),
      getAPIKeyStatus: jest.fn(() => ({ hasKey: true, isValid: true }))
    };
    
    GeminiAPIService.mockImplementation(() => mockGeminiService);
    generator = new AIQuizGenerator();
  });

  describe('Content Preprocessing', () => {
    test('should clean and normalize content', () => {
      const rawContent = '  This   is\n\n\ntest   content.  \n  More text here.  ';
      const processed = generator.preprocessContent(rawContent);
      
      expect(processed).toBe('This is test content. More text here.');
    });

    test('should handle empty or invalid content', () => {
      expect(generator.preprocessContent('')).toBe('');
      expect(generator.preprocessContent(null)).toBe('');
      expect(generator.preprocessContent(undefined)).toBe('');
    });

    test('should truncate overly long content', () => {
      const longContent = 'A'.repeat(10000);
      const processed = generator.preprocessContent(longContent);
      
      expect(processed.length).toBeLessThanOrEqual(generator.maxContentLength);
    });
  });

  describe('Options Validation', () => {
    test('should apply default options', () => {
      const validated = generator.validateOptions({});
      
      expect(validated.questionCount).toBe(5);
      expect(validated.questionTypes).toEqual(['mcq-single']);
      expect(validated.difficulty).toBe('mixed');
    });

    test('should validate question count limits', () => {
      expect(generator.validateOptions({ questionCount: 0 }).questionCount).toBe(1);
      expect(generator.validateOptions({ questionCount: 100 }).questionCount).toBe(20);
      expect(generator.validateOptions({ questionCount: 10 }).questionCount).toBe(10);
    });

    test('should filter invalid question types', () => {
      const options = {
        questionTypes: ['invalid-type', 'mcq-single', 'another-invalid']
      };
      const validated = generator.validateOptions(options);
      
      expect(validated.questionTypes).toEqual(['mcq-single']);
    });

    test('should fallback to default types if all invalid', () => {
      const options = { questionTypes: ['invalid1', 'invalid2'] };
      const validated = generator.validateOptions(options);
      
      expect(validated.questionTypes).toEqual(['mcq-single']);
    });
  });

  describe('Question Generation', () => {
    beforeEach(() => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ 
              text: JSON.stringify({
                questions: [{
                  question: 'What is 2 + 2?',
                  options: ['3', '4', '5', '6'],
                  correctAnswer: 1,
                  explanation: 'Basic arithmetic: 2 + 2 = 4'
                }]
              })
            }]
          }
        }]
      };

      mockGeminiService.makeRequest.mockResolvedValue(mockResponse);
      mockGeminiService.extractTextFromResponse.mockReturnValue(
        JSON.stringify({
          questions: [{
            question: 'What is 2 + 2?',
            options: ['3', '4', '5', '6'],
            correctAnswer: 1,
            explanation: 'Basic arithmetic: 2 + 2 = 4'
          }]
        })
      );
    });

    test('should generate questions successfully', async () => {
      const content = 'Mathematics is the study of numbers. Addition is a basic operation.';
      const result = await generator.generateQuestions(content);

      expect(result.success).toBe(true);
      expect(result.questions).toHaveLength(1);
      expect(result.questions[0]).toMatchObject({
        question: 'What is 2 + 2?',
        options: ['3', '4', '5', '6'],
        correctAnswer: 1,
        explanation: 'Basic arithmetic: 2 + 2 = 4'
      });
    });

    test('should handle empty content', async () => {
      const result = await generator.generateQuestions('');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('empty or invalid');
    });

    test('should include generation metadata', async () => {
      const content = 'Test content for generation';
      const result = await generator.generateQuestions(content, { questionCount: 3 });

      expect(result.metadata).toMatchObject({
        sourceContentLength: content.length,
        requestedCount: 3,
        questionTypes: ['mcq-single']
      });
      expect(result.metadata.generatedAt).toBeDefined();
    });
  });

  describe('Response Parsing', () => {
    test('should parse valid JSON response', async () => {
      const validResponse = {
        questions: [{
          question: 'Test question?',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 0,
          explanation: 'Test explanation'
        }]
      };

      mockGeminiService.extractTextFromResponse.mockReturnValue(JSON.stringify(validResponse));

      const questions = await generator.parseAIResponse({});
      expect(questions).toEqual(validResponse.questions);
    });

    test('should handle malformed JSON', async () => {
      mockGeminiService.extractTextFromResponse.mockReturnValue('invalid json');

      await expect(generator.parseAIResponse({})).rejects.toThrow('Failed to parse AI response');
    });

    test('should handle missing questions array', async () => {
      mockGeminiService.extractTextFromResponse.mockReturnValue('{"invalid": "structure"}');

      await expect(generator.parseAIResponse({})).rejects.toThrow('missing questions array');
    });

    test('should clean markdown formatting', async () => {
      const jsonWithMarkdown = '```json\n{"questions": []}\n```';
      mockGeminiService.extractTextFromResponse.mockReturnValue(jsonWithMarkdown);

      const questions = await generator.parseAIResponse({});
      expect(questions).toEqual([]);
    });
  });

  describe('Question Processing', () => {
    test('should process MCQ single questions', () => {
      const rawQuestion = {
        question: 'What is the capital of France?',
        options: ['London', 'Paris', 'Berlin', 'Madrid'],
        correctAnswer: 1,
        explanation: 'Paris is the capital of France.'
      };

      const processed = generator.processSingleQuestion(rawQuestion, 0);

      expect(processed.type).toBe(QUESTION_TYPES.MCQ_SINGLE);
      expect(processed.question).toBe(rawQuestion.question);
      expect(processed.options).toEqual(rawQuestion.options);
      expect(processed.correctAnswer).toBe(1);
      expect(processed.id).toBeDefined();
    });

    test('should process MCQ multiple questions', () => {
      const rawQuestion = {
        type: 'mcq-multiple',
        question: 'Which are programming languages?',
        options: ['JavaScript', 'HTML', 'Python', 'CSS'],
        correctAnswers: [0, 2],
        explanation: 'JavaScript and Python are programming languages.'
      };

      const processed = generator.processSingleQuestion(rawQuestion, 0);

      expect(processed.type).toBe(QUESTION_TYPES.MCQ_MULTIPLE);
      expect(processed.correctAnswers).toEqual([0, 2]);
    });

    test('should process text input questions', () => {
      const rawQuestion = {
        type: 'text-input',
        question: 'What is the largest planet?',
        correctAnswer: 'Jupiter',
        caseSensitive: false,
        explanation: 'Jupiter is the largest planet in our solar system.'
      };

      const processed = generator.processSingleQuestion(rawQuestion, 0);

      expect(processed.type).toBe(QUESTION_TYPES.TEXT_INPUT);
      expect(processed.correctAnswer).toBe('Jupiter');
      expect(processed.caseSensitive).toBe(false);
    });

    test('should reject invalid questions', () => {
      const invalidQuestion = {
        question: '', // Too short
        options: ['A'], // Too few options
        correctAnswer: 5, // Invalid index
        explanation: ''
      };

      expect(() => generator.processSingleQuestion(invalidQuestion, 0)).toThrow();
    });

    test('should clean question text', () => {
      expect(generator.cleanQuestionText('  Valid question?  ')).toBe('Valid question?');
      expect(() => generator.cleanQuestionText('')).toThrow('too short');
      expect(() => generator.cleanQuestionText('Short')).toThrow('too short');
    });

    test('should validate options array', () => {
      expect(generator.validateOptions(['A', 'B', 'C'])).toEqual(['A', 'B', 'C']);
      expect(() => generator.validateOptions(['A'])).toThrow('At least 2 options');
      expect(() => generator.validateOptions([])).toThrow('At least 2 options');
    });

    test('should validate correct answer indices', () => {
      expect(generator.validateCorrectAnswer(1, 4)).toBe(1);
      expect(() => generator.validateCorrectAnswer(-1, 4)).toThrow('Invalid correct answer');
      expect(() => generator.validateCorrectAnswer(4, 4)).toThrow('Invalid correct answer');
    });

    test('should validate multiple correct answers', () => {
      expect(generator.validateCorrectAnswers([0, 2, 1], 4)).toEqual([0, 1, 2]);
      expect(() => generator.validateCorrectAnswers([], 4)).toThrow('At least one correct answer');
      expect(() => generator.validateCorrectAnswers([5], 4)).toThrow('No valid correct answers');
    });
  });

  describe('Service Capabilities', () => {
    test('should return service capabilities', () => {
      const capabilities = generator.getCapabilities();

      expect(capabilities).toMatchObject({
        maxContentLength: expect.any(Number),
        maxQuestions: expect.any(Number),
        minQuestions: expect.any(Number),
        supportedTypes: expect.arrayContaining(Object.values(QUESTION_TYPES)),
        apiKeyStatus: expect.any(Object)
      });
    });

    test('should test connection successfully', async () => {
      mockGeminiService.makeRequest.mockResolvedValue({});
      mockGeminiService.extractTextFromResponse.mockReturnValue('OK');

      const isConnected = await generator.testConnection();
      expect(isConnected).toBe(true);
    });

    test('should handle connection test failure', async () => {
      mockGeminiService.makeRequest.mockRejectedValue(new Error('Connection failed'));

      const isConnected = await generator.testConnection();
      expect(isConnected).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      mockGeminiService.makeRequest.mockRejectedValue(new Error('API Error'));

      const result = await generator.generateQuestions('Test content');

      expect(result.success).toBe(false);
      expect(result.error).toContain('API Error');
      expect(result.questions).toEqual([]);
    });

    test('should skip invalid questions in batch', () => {
      const questions = [
        { question: 'Valid question?', options: ['A', 'B'], correctAnswer: 0, explanation: 'Good' },
        { question: '', options: ['A'], correctAnswer: 5, explanation: '' }, // Invalid
        { question: 'Another valid question?', options: ['X', 'Y'], correctAnswer: 1, explanation: 'Also good' }
      ];

      const processed = generator.postProcessQuestions(questions);

      expect(processed).toHaveLength(2);
      expect(processed[0].question).toBe('Valid question?');
      expect(processed[1].question).toBe('Another valid question?');
    });
  });
});