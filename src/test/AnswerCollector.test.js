/**
 * Tests for AnswerCollector component
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnswerCollector } from '../components/AnswerCollector.js';
import { QUESTION_TYPES } from '../models/types.js';

// Sample quiz data
const createSampleQuiz = () => ({
    id: 'test-quiz-1',
    title: 'Test Quiz',
    description: 'A test quiz for answer collection',
    questions: [
        {
            id: 'q1',
            type: QUESTION_TYPES.MCQ_SINGLE,
            question: 'What is 2 + 2?',
            options: ['3', '4', '5', '6'],
            correctAnswer: 1,
            explanation: '2 + 2 equals 4'
        },
        {
            id: 'q2',
            type: QUESTION_TYPES.MCQ_MULTIPLE,
            question: 'Which are even numbers?',
            options: ['1', '2', '3', '4'],
            correctAnswers: [1, 3],
            explanation: '2 and 4 are even numbers'
        },
        {
            id: 'q3',
            type: QUESTION_TYPES.TEXT_INPUT,
            question: 'What is the capital of France?',
            correctAnswer: 'Paris',
            caseSensitive: false,
            explanation: 'Paris is the capital of France'
        }
    ],
    settings: {
        shuffleQuestions: false,
        showExplanations: true
    },
    createdAt: new Date(),
    updatedAt: new Date()
});

describe('AnswerCollector', () => {
    let collector;
    let storageManager;
    let quiz;
    
    beforeEach(() => {
        quiz = createSampleQuiz();
        storageManager = {
            getUserId: () => 'test-user'
        };
        
        collector = new AnswerCollector(quiz, storageManager);
        
        // Mock localStorage
        global.localStorage = {
            getItem: vi.fn(() => null),
            setItem: vi.fn(),
            removeItem: vi.fn()
        };
    });
    
    afterEach(() => {
        vi.clearAllMocks();
    });
    
    describe('Initialization', () => {
        test('should initialize with empty state', () => {
            expect(collector.answers.size).toBe(0);
            expect(collector.validationResults.size).toBe(0);
            expect(collector.submissionTimestamps.size).toBe(0);
            expect(collector.startTime).toBeInstanceOf(Date);
        });
        
        test('should initialize validation rules for all question types', () => {
            expect(collector.validationRules.has(QUESTION_TYPES.MCQ_SINGLE)).toBe(true);
            expect(collector.validationRules.has(QUESTION_TYPES.MCQ_MULTIPLE)).toBe(true);
            expect(collector.validationRules.has(QUESTION_TYPES.TEXT_INPUT)).toBe(true);
        });
    });
    
    describe('Answer Submission', () => {
        test('should submit valid MCQ single answer', () => {
            const result = collector.submitAnswer('q1', 1);
            
            expect(result.success).toBe(true);
            expect(result.questionId).toBe('q1');
            expect(result.answer).toBe(1);
            expect(result.validation.isValid).toBe(true);
            expect(result.validation.isCorrect).toBe(true);
        });
        
        test('should submit valid MCQ multiple answer', () => {
            const result = collector.submitAnswer('q2', [1, 3]);
            
            expect(result.success).toBe(true);
            expect(result.questionId).toBe('q2');
            expect(result.answer).toEqual([1, 3]);
            expect(result.validation.isValid).toBe(true);
            expect(result.validation.isCorrect).toBe(true);
        });
        
        test('should submit valid text input answer', () => {
            const result = collector.submitAnswer('q3', 'Paris');
            
            expect(result.success).toBe(true);
            expect(result.questionId).toBe('q3');
            expect(result.answer).toBe('Paris');
            expect(result.validation.isValid).toBe(true);
            expect(result.validation.isCorrect).toBe(true);
        });
        
        test('should reject invalid question ID', () => {
            const result = collector.submitAnswer('invalid-id', 1);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Question not found');
        });
        
        test('should reject invalid MCQ single answer', () => {
            const result = collector.submitAnswer('q1', 'invalid');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Answer must be a number');
        });
        
        test('should reject out of range MCQ single answer', () => {
            const result = collector.submitAnswer('q1', 10);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Answer index out of range');
        });
        
        test('should reject invalid MCQ multiple answer', () => {
            const result = collector.submitAnswer('q2', 'not-array');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Answer must be an array');
        });
        
        test('should reject empty MCQ multiple answer', () => {
            const result = collector.submitAnswer('q2', []);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('At least one option must be selected');
        });
        
        test('should reject duplicate MCQ multiple options', () => {
            const result = collector.submitAnswer('q2', [1, 1, 3]);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Duplicate options selected');
        });
        
        test('should reject empty text input answer', () => {
            const result = collector.submitAnswer('q3', '   ');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Answer cannot be empty');
        });
    });
    
    describe('Answer Validation', () => {
        test('should validate MCQ single answers correctly', () => {
            // Correct answer
            let validation = collector.validateAnswer('q1', 1);
            expect(validation.isValid).toBe(true);
            expect(validation.isCorrect).toBe(true);
            
            // Incorrect answer
            validation = collector.validateAnswer('q1', 0);
            expect(validation.isValid).toBe(true);
            expect(validation.isCorrect).toBe(false);
        });
        
        test('should validate MCQ multiple answers correctly', () => {
            // Correct answer
            let validation = collector.validateAnswer('q2', [1, 3]);
            expect(validation.isValid).toBe(true);
            expect(validation.isCorrect).toBe(true);
            
            // Incorrect answer (partial)
            validation = collector.validateAnswer('q2', [1]);
            expect(validation.isValid).toBe(true);
            expect(validation.isCorrect).toBe(false);
            
            // Incorrect answer (wrong options)
            validation = collector.validateAnswer('q2', [0, 2]);
            expect(validation.isValid).toBe(true);
            expect(validation.isCorrect).toBe(false);
        });
        
        test('should validate text input answers correctly', () => {
            // Correct answer (exact case)
            let validation = collector.validateAnswer('q3', 'Paris');
            expect(validation.isValid).toBe(true);
            expect(validation.isCorrect).toBe(true);
            
            // Correct answer (different case - case insensitive)
            validation = collector.validateAnswer('q3', 'paris');
            expect(validation.isValid).toBe(true);
            expect(validation.isCorrect).toBe(true);
            
            // Incorrect answer
            validation = collector.validateAnswer('q3', 'London');
            expect(validation.isValid).toBe(true);
            expect(validation.isCorrect).toBe(false);
        });
        
        test('should handle case sensitive text input', () => {
            // Modify question to be case sensitive
            const caseSensitiveQuiz = createSampleQuiz();
            caseSensitiveQuiz.questions[2].caseSensitive = true;
            
            const caseSensitiveCollector = new AnswerCollector(caseSensitiveQuiz, storageManager);
            
            // Correct case
            let validation = caseSensitiveCollector.validateAnswer('q3', 'Paris');
            expect(validation.isValid).toBe(true);
            expect(validation.isCorrect).toBe(true);
            
            // Wrong case
            validation = caseSensitiveCollector.validateAnswer('q3', 'paris');
            expect(validation.isValid).toBe(true);
            expect(validation.isCorrect).toBe(false);
        });
    });
    
    describe('Answer Retrieval', () => {
        beforeEach(() => {
            collector.submitAnswer('q1', 1);
            collector.submitAnswer('q2', [1, 3]);
        });
        
        test('should retrieve specific answers', () => {
            expect(collector.getAnswer('q1')).toBe(1);
            expect(collector.getAnswer('q2')).toEqual([1, 3]);
            expect(collector.getAnswer('q3')).toBeUndefined();
        });
        
        test('should retrieve all answers', () => {
            const allAnswers = collector.getAllAnswers();
            expect(allAnswers.size).toBe(2);
            expect(allAnswers.get('q1')).toBe(1);
            expect(allAnswers.get('q2')).toEqual([1, 3]);
        });
        
        test('should check if questions are answered', () => {
            expect(collector.isAnswered('q1')).toBe(true);
            expect(collector.isAnswered('q2')).toBe(true);
            expect(collector.isAnswered('q3')).toBe(false);
        });
        
        test('should count answered questions', () => {
            expect(collector.getAnsweredCount()).toBe(2);
        });
        
        test('should check if all questions are answered', () => {
            expect(collector.areAllQuestionsAnswered()).toBe(false);
            
            collector.submitAnswer('q3', 'Paris');
            expect(collector.areAllQuestionsAnswered()).toBe(true);
        });
    });
    
    describe('Score Calculation', () => {
        test('should calculate current score with partial answers', () => {
            collector.submitAnswer('q1', 1); // correct
            collector.submitAnswer('q2', [1]); // incorrect
            
            const score = collector.calculateCurrentScore();
            expect(score.correctCount).toBe(1);
            expect(score.totalAnswered).toBe(2);
            expect(score.totalQuestions).toBe(3);
            expect(score.currentScore).toBe(50); // 1/2 = 50%
            expect(score.projectedScore).toBe(33); // 1/3 = 33%
            expect(score.completionPercentage).toBe(67); // 2/3 = 67%
        });
        
        test('should calculate perfect score', () => {
            collector.submitAnswer('q1', 1);
            collector.submitAnswer('q2', [1, 3]);
            collector.submitAnswer('q3', 'Paris');
            
            const score = collector.calculateCurrentScore();
            expect(score.correctCount).toBe(3);
            expect(score.totalAnswered).toBe(3);
            expect(score.currentScore).toBe(100);
            expect(score.projectedScore).toBe(100);
            expect(score.completionPercentage).toBe(100);
        });
        
        test('should handle zero answers', () => {
            const score = collector.calculateCurrentScore();
            expect(score.correctCount).toBe(0);
            expect(score.totalAnswered).toBe(0);
            expect(score.currentScore).toBe(0);
            expect(score.projectedScore).toBe(0);
            expect(score.completionPercentage).toBe(0);
        });
    });
    
    describe('Final Results Generation', () => {
        test('should generate complete final results', () => {
            collector.submitAnswer('q1', 1); // correct
            collector.submitAnswer('q2', [1]); // incorrect
            collector.submitAnswer('q3', 'Paris'); // correct
            
            const results = collector.generateFinalResults();
            
            expect(results.id).toBeDefined();
            expect(results.quizId).toBe('test-quiz-1');
            expect(results.userId).toBe('test-user');
            expect(results.score).toBe(67); // 2/3 = 67%
            expect(results.correctCount).toBe(2);
            expect(results.totalQuestions).toBe(3);
            expect(results.answers).toHaveLength(3);
            expect(results.completedAt).toBeInstanceOf(Date);
            expect(results.startedAt).toBeInstanceOf(Date);
            expect(results.timeSpent).toBeGreaterThanOrEqual(0);
            expect(results.metadata.answeredCount).toBe(3);
        });
        
        test('should handle partial completion', () => {
            collector.submitAnswer('q1', 1);
            // q2 and q3 not answered
            
            const results = collector.generateFinalResults();
            
            expect(results.score).toBe(33); // 1/3 = 33%
            expect(results.correctCount).toBe(1);
            expect(results.answers).toHaveLength(3);
            expect(results.answers[0].userAnswer).toBe(1);
            expect(results.answers[1].userAnswer).toBeNull();
            expect(results.answers[2].userAnswer).toBeNull();
            expect(results.metadata.answeredCount).toBe(1);
            expect(results.metadata.validAnswers).toBe(1);
        });
    });
    
    describe('Progress Management', () => {
        test('should save progress to localStorage', async () => {
            collector.submitAnswer('q1', 1);
            collector.submitAnswer('q2', [1, 3]);
            
            const success = await collector.saveProgress();
            
            expect(success).toBe(true);
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'quiz-progress-test-quiz-1',
                expect.any(String)
            );
        });
        
        test('should load progress from localStorage', async () => {
            const progressData = {
                quizId: 'test-quiz-1',
                answers: { q1: 1, q2: [1, 3] },
                validationResults: {
                    q1: { isValid: true, isCorrect: true },
                    q2: { isValid: true, isCorrect: true }
                },
                submissionTimestamps: {
                    q1: new Date().toISOString(),
                    q2: new Date().toISOString()
                },
                startTime: new Date().toISOString()
            };
            
            localStorage.getItem.mockReturnValue(JSON.stringify(progressData));
            
            const success = await collector.loadProgress();
            
            expect(success).toBe(true);
            expect(collector.getAnswer('q1')).toBe(1);
            expect(collector.getAnswer('q2')).toEqual([1, 3]);
            expect(collector.getAnsweredCount()).toBe(2);
        });
        
        test('should clear progress from localStorage', async () => {
            const success = await collector.clearProgress();
            
            expect(success).toBe(true);
            expect(localStorage.removeItem).toHaveBeenCalledWith('quiz-progress-test-quiz-1');
        });
    });
    
    describe('Progress Statistics', () => {
        test('should provide accurate progress stats', () => {
            collector.submitAnswer('q1', 1);
            collector.submitAnswer('q2', [1, 3]);
            
            const stats = collector.getProgressStats();
            
            expect(stats.totalQuestions).toBe(3);
            expect(stats.answeredQuestions).toBe(2);
            expect(stats.remainingQuestions).toBe(1);
            expect(stats.completionPercentage).toBe(67);
            expect(stats.elapsedTime).toBeGreaterThanOrEqual(0);
            expect(stats.averageTimePerQuestion).toBeGreaterThanOrEqual(0);
        });
    });
    
    describe('Answer Validation Summary', () => {
        test('should validate all answers and provide summary', () => {
            collector.submitAnswer('q1', 1); // valid
            // Force an invalid answer into the answers map (bypassing validation)
            collector.answers.set('q2', 'invalid'); // invalid
            // q3 not answered
            
            const validation = collector.validateAllAnswers();
            
            expect(validation.valid).toBe(1);
            expect(validation.invalid).toBe(1);
            expect(validation.missing).toBe(1);
            expect(validation.errors).toHaveLength(1);
            expect(validation.errors[0].questionId).toBe('q2');
        });
    });
    
    describe('Reset and Export', () => {
        test('should reset all data', () => {
            collector.submitAnswer('q1', 1);
            collector.submitAnswer('q2', [1, 3]);
            
            collector.reset();
            
            expect(collector.answers.size).toBe(0);
            expect(collector.validationResults.size).toBe(0);
            expect(collector.submissionTimestamps.size).toBe(0);
            expect(collector.getAnsweredCount()).toBe(0);
        });
        
        test('should export answers for external processing', () => {
            collector.submitAnswer('q1', 1);
            collector.submitAnswer('q2', [1, 3]);
            
            const exported = collector.exportAnswers();
            
            expect(exported.quizId).toBe('test-quiz-1');
            expect(exported.quizTitle).toBe('Test Quiz');
            expect(exported.answers).toEqual({ q1: 1, q2: [1, 3] });
            expect(exported.stats).toBeDefined();
            expect(exported.score).toBeDefined();
        });
    });
});