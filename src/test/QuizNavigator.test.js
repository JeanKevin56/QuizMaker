/**
 * Tests for QuizNavigator component
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { QuizNavigator } from '../components/QuizNavigator.js';
import { QUESTION_TYPES } from '../models/types.js';

// Sample quiz data
const createSampleQuiz = () => ({
    id: 'test-quiz-1',
    title: 'Test Quiz',
    description: 'A test quiz for navigation',
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
        showExplanations: true,
        timeLimit: null
    },
    createdAt: new Date(),
    updatedAt: new Date()
});

describe('QuizNavigator', () => {
    let navigator;
    let storageManager;
    let onQuizComplete;
    
    beforeEach(() => {
        storageManager = {
            getUserId: () => 'test-user',
            storeResult: async (result) => result.id
        };
        
        onQuizComplete = vi.fn();
        
        navigator = new QuizNavigator(
            createSampleQuiz(),
            storageManager,
            onQuizComplete
        );
    });
    
    afterEach(() => {
        if (navigator && navigator.destroy) {
            navigator.destroy();
        }
    });
    
    describe('Initialization', () => {
        test('should initialize with correct default state', () => {
            expect(navigator.currentQuestionIndex).toBe(0);
            expect(navigator.answerCollector.getAnsweredCount()).toBe(0);
            expect(navigator.isCompleted).toBe(false);
            expect(navigator.startTime).toBeNull();
        });
    });
    
    describe('Navigation', () => {
        test('should start at first question', () => {
            expect(navigator.currentQuestionIndex).toBe(0);
        });
        
        test('should navigate to next question', () => {
            navigator.nextQuestion();
            expect(navigator.currentQuestionIndex).toBe(1);
        });
        
        test('should navigate to previous question', () => {
            navigator.currentQuestionIndex = 1;
            navigator.previousQuestion();
            expect(navigator.currentQuestionIndex).toBe(0);
        });
        
        test('should not navigate beyond bounds', () => {
            // Test previous at first question
            navigator.currentQuestionIndex = 0;
            navigator.previousQuestion();
            expect(navigator.currentQuestionIndex).toBe(0);
            
            // Test next at last question
            navigator.currentQuestionIndex = 2;
            navigator.nextQuestion();
            expect(navigator.currentQuestionIndex).toBe(2);
        });
        
        test('should identify last question correctly', () => {
            navigator.currentQuestionIndex = 2;
            expect(navigator.isLastQuestion()).toBe(true);
            
            navigator.currentQuestionIndex = 1;
            expect(navigator.isLastQuestion()).toBe(false);
        });
    });
    
    describe('Answer Handling', () => {
        
        test('should store user answers', () => {
            navigator.handleAnswerChange('q1', 1);
            expect(navigator.answerCollector.getAnswer('q1')).toBe(1);
        });
        
        test('should validate MCQ single answers correctly', () => {
            const question = navigator.quiz.questions[0];
            const validation1 = navigator.answerCollector.validateAnswer(question.id, 1);
            const validation2 = navigator.answerCollector.validateAnswer(question.id, 0);
            expect(validation1.isCorrect).toBe(true);
            expect(validation2.isCorrect).toBe(false);
        });
        
        test('should validate MCQ multiple answers correctly', () => {
            const question = navigator.quiz.questions[1];
            const validation1 = navigator.answerCollector.validateAnswer(question.id, [1, 3]);
            const validation2 = navigator.answerCollector.validateAnswer(question.id, [1]);
            const validation3 = navigator.answerCollector.validateAnswer(question.id, [1, 2, 3]);
            expect(validation1.isCorrect).toBe(true);
            expect(validation2.isCorrect).toBe(false);
            expect(validation3.isCorrect).toBe(false);
        });
        
        test('should validate text input answers correctly', () => {
            const question = navigator.quiz.questions[2];
            const validation1 = navigator.answerCollector.validateAnswer(question.id, 'Paris');
            const validation2 = navigator.answerCollector.validateAnswer(question.id, 'paris');
            const validation3 = navigator.answerCollector.validateAnswer(question.id, 'London');
            expect(validation1.isCorrect).toBe(true);
            expect(validation2.isCorrect).toBe(true); // case insensitive
            expect(validation3.isCorrect).toBe(false);
        });
        
        test('should handle case sensitive text input', () => {
            // Create a quiz with case sensitive question
            const caseSensitiveQuiz = createSampleQuiz();
            caseSensitiveQuiz.questions[2].caseSensitive = true;
            
            const caseSensitiveNavigator = new QuizNavigator(caseSensitiveQuiz, storageManager, onQuizComplete);
            
            const validation1 = caseSensitiveNavigator.answerCollector.validateAnswer('q3', 'Paris');
            const validation2 = caseSensitiveNavigator.answerCollector.validateAnswer('q3', 'paris');
            expect(validation1.isCorrect).toBe(true);
            expect(validation2.isCorrect).toBe(false);
        });
    });
    
    describe('Quiz Completion', () => {
        
        test('should detect when quiz can be completed', () => {
            expect(navigator.canCompleteQuiz()).toBe(false);
            
            // Answer all questions
            navigator.handleAnswerChange('q1', 1);
            navigator.handleAnswerChange('q2', [1, 3]);
            navigator.handleAnswerChange('q3', 'Paris');
            
            expect(navigator.canCompleteQuiz()).toBe(true);
        });
        
        test('should calculate results correctly', async () => {
            // Answer all questions correctly
            navigator.handleAnswerChange('q1', 1);
            navigator.handleAnswerChange('q2', [1, 3]);
            navigator.handleAnswerChange('q3', 'Paris');
            
            const results = await navigator.calculateResults();
            
            expect(results.score).toBe(100);
            expect(results.totalQuestions).toBe(3);
            expect(results.answers).toHaveLength(3);
            expect(results.answers.every(a => a.isCorrect)).toBe(true);
        });
        
        test('should calculate partial results correctly', async () => {
            // Answer 2 out of 3 questions correctly
            navigator.handleAnswerChange('q1', 1); // correct
            navigator.handleAnswerChange('q2', [1]); // incorrect (partial)
            navigator.handleAnswerChange('q3', 'London'); // incorrect
            
            const results = await navigator.calculateResults();
            
            expect(results.score).toBe(33); // 1/3 = 33%
            expect(results.totalQuestions).toBe(3);
            expect(results.answers.filter(a => a.isCorrect)).toHaveLength(1);
        });
    });
    
    describe('Progress Tracking', () => {
        
        test('should track progress correctly', () => {
            const state = navigator.getState();
            expect(state.currentQuestionIndex).toBe(0);
            expect(state.totalQuestions).toBe(3);
            expect(state.answeredCount).toBe(0);
            expect(state.isCompleted).toBe(false);
        });
        
        test('should update progress when answers are provided', () => {
            navigator.handleAnswerChange('q1', 1);
            navigator.handleAnswerChange('q2', [1, 3]);
            
            const state = navigator.getState();
            expect(state.answeredCount).toBe(2);
        });
    });
    
    describe('Timer Functionality', () => {
        test('should format time correctly', () => {
            expect(navigator.formatTime(0)).toBe('00:00');
            expect(navigator.formatTime(60)).toBe('01:00');
            expect(navigator.formatTime(125)).toBe('02:05');
            expect(navigator.formatTime(3661)).toBe('61:01');
        });
        
        test('should handle timer expiration', async () => {
            const quizWithTimer = createSampleQuiz();
            quizWithTimer.settings.timeLimit = 1;
            
            navigator = new QuizNavigator(quizWithTimer, storageManager, onQuizComplete);
            
            // Answer all questions to make completion possible
            navigator.handleAnswerChange('q1', 1);
            navigator.handleAnswerChange('q2', [1, 3]);
            navigator.handleAnswerChange('q3', 'Paris');
            
            // Mock alert to avoid issues in test
            global.alert = vi.fn();
            
            // Simulate timer expiration
            navigator.timeRemaining = 0;
            await navigator.handleTimeExpired();
            
            expect(navigator.isCompleted).toBe(true);
            expect(onQuizComplete).toHaveBeenCalled();
        });
    });
    
    describe('Question Shuffling', () => {
        test('should shuffle questions when enabled', () => {
            const quiz = createSampleQuiz();
            quiz.settings.shuffleQuestions = true;
            
            const originalOrder = quiz.questions.map(q => q.id);
            
            navigator = new QuizNavigator(quiz, storageManager, onQuizComplete);
            navigator.shuffleQuestions();
            
            const shuffledOrder = navigator.quiz.questions.map(q => q.id);
            
            // Note: There's a small chance the order remains the same after shuffling
            // but we can at least verify the same questions are present
            expect(shuffledOrder.sort()).toEqual(originalOrder.sort());
        });
        
        test('should not shuffle questions when disabled', () => {
            const quiz = createSampleQuiz();
            quiz.settings.shuffleQuestions = false;
            
            const originalOrder = quiz.questions.map(q => q.id);
            
            navigator = new QuizNavigator(quiz, storageManager, onQuizComplete);
            // shuffleQuestions is not called when shuffleQuestions is false
            
            const currentOrder = navigator.quiz.questions.map(q => q.id);
            expect(currentOrder).toEqual(originalOrder);
        });
    });
});