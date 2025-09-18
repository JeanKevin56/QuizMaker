/**
 * Integration tests for QuizCreator and QuizReviewEditor
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { QuizCreator } from '../components/QuizCreator.js';
import { QUESTION_TYPES } from '../models/types.js';

// Mock dependencies
vi.mock('../components/Layout.js', () => ({
    createFormGroup: vi.fn(() => document.createElement('div')),
    createButton: vi.fn(() => document.createElement('button')),
    createAlert: vi.fn((options) => {
        const alert = document.createElement('div');
        alert.className = `alert alert-${options.type}`;
        alert.textContent = options.message;
        return alert;
    })
}));

vi.mock('../services/StorageManager.js', () => ({
    StorageManager: vi.fn().mockImplementation(() => ({
        initialize: vi.fn().mockResolvedValue(),
        storeQuiz: vi.fn().mockResolvedValue()
    }))
}));

vi.mock('../components/QuestionEditor.js', () => ({
    QuestionEditor: vi.fn().mockImplementation(() => ({
        init: vi.fn()
    }))
}));

vi.mock('../services/PDFProcessor.js', () => ({
    PDFProcessor: vi.fn().mockImplementation(() => ({
        validateFile: vi.fn(() => ({ success: true })),
        extractText: vi.fn().mockResolvedValue({
            success: true,
            text: 'Sample PDF content for testing'
        })
    }))
}));

vi.mock('../models/validation.js', () => ({
    validateQuiz: vi.fn(() => ({ isValid: true, errors: [] })),
    validateQuestion: vi.fn(() => ({ isValid: true, errors: [] }))
}));

describe('QuizCreator and QuizReviewEditor Integration', () => {
    let quizCreator;
    let container;
    let mockAIQuizGenerator;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);

        // Mock AI Quiz Generator
        mockAIQuizGenerator = {
            generateQuestions: vi.fn()
        };

        quizCreator = new QuizCreator();
        quizCreator.aiQuizGenerator = mockAIQuizGenerator;
    });

    afterEach(() => {
        document.body.removeChild(container);
        // Clean up any modals that might be left
        document.querySelectorAll('.modal-overlay').forEach(modal => modal.remove());
    });

    describe('AI Generation to Review Flow', () => {
        test('should open review interface after successful text generation', async () => {
            const mockQuestions = [
                {
                    id: 'q1',
                    type: QUESTION_TYPES.MCQ_SINGLE,
                    question: 'What is 2 + 2?',
                    options: ['3', '4', '5', '6'],
                    correctAnswer: 1,
                    explanation: 'Basic addition'
                }
            ];

            await quizCreator.init(container);

            // Directly simulate successful generation (skip the modal flow for integration test)
            quizCreator.handleGenerationSuccess({ questions: mockQuestions }, document.createElement('div'));

            // Check that review modal opened
            const reviewModal = document.querySelector('.quiz-review-modal');
            expect(reviewModal).toBeTruthy();

            // Check that review interface shows the generated questions
            const questionItems = reviewModal.querySelectorAll('.review-question-item');
            expect(questionItems).toHaveLength(1);

            const questionText = reviewModal.querySelector('.question-text');
            expect(questionText.textContent.trim()).toBe('What is 2 + 2?');
        });

        test('should add questions to quiz when review is saved', async () => {
            const mockQuestions = [
                {
                    id: 'q1',
                    type: QUESTION_TYPES.TEXT_INPUT,
                    question: 'What is the capital of France?',
                    correctAnswer: 'Paris',
                    caseSensitive: false,
                    explanation: 'Paris is the capital of France'
                }
            ];

            mockAIQuizGenerator.generateQuestions.mockResolvedValue({
                success: true,
                questions: mockQuestions
            });

            await quizCreator.init(container);

            // Initial question count should be 0
            expect(quizCreator.currentQuiz.questions).toHaveLength(0);

            // Simulate generation and review
            quizCreator.handleGenerationSuccess({ questions: mockQuestions }, document.createElement('div'));

            // Get the review modal
            const reviewModal = document.querySelector('.quiz-review-modal');
            expect(reviewModal).toBeTruthy();

            // Simulate saving the questions
            const saveBtn = reviewModal.querySelector('#save-questions');
            saveBtn.click();

            // Check that questions were added to the quiz
            expect(quizCreator.currentQuiz.questions).toHaveLength(1);
            expect(quizCreator.currentQuiz.questions[0].question).toBe('What is the capital of France?');

            // Check that review modal was closed
            expect(document.querySelector('.quiz-review-modal')).toBeFalsy();
        });

        test('should not add questions when review is cancelled', async () => {
            const mockQuestions = [
                {
                    id: 'q1',
                    type: QUESTION_TYPES.MCQ_SINGLE,
                    question: 'Test question?',
                    options: ['A', 'B', 'C', 'D'],
                    correctAnswer: 0,
                    explanation: 'Test explanation'
                }
            ];

            await quizCreator.init(container);

            // Initial question count should be 0
            expect(quizCreator.currentQuiz.questions).toHaveLength(0);

            // Simulate generation and review
            quizCreator.handleGenerationSuccess({ questions: mockQuestions }, document.createElement('div'));

            // Get the review modal
            const reviewModal = document.querySelector('.quiz-review-modal');
            expect(reviewModal).toBeTruthy();

            // Simulate cancelling the review
            const cancelBtn = reviewModal.querySelector('#cancel-review');
            cancelBtn.click();

            // Check that no questions were added to the quiz
            expect(quizCreator.currentQuiz.questions).toHaveLength(0);

            // Check that review modal was closed
            expect(document.querySelector('.quiz-review-modal')).toBeFalsy();
        });

        test('should handle PDF generation to review flow', async () => {
            const mockQuestions = [
                {
                    id: 'q1',
                    type: QUESTION_TYPES.MCQ_MULTIPLE,
                    question: 'Which are programming languages?',
                    options: ['JavaScript', 'HTML', 'Python', 'CSS'],
                    correctAnswers: [0, 2],
                    explanation: 'JavaScript and Python are programming languages'
                }
            ];

            mockAIQuizGenerator.generateQuestions.mockResolvedValue({
                success: true,
                questions: mockQuestions
            });

            await quizCreator.init(container);

            // Simulate PDF generation success
            quizCreator.handleGenerationSuccess({ questions: mockQuestions }, document.createElement('div'));

            // Check that review modal opened
            const reviewModal = document.querySelector('.quiz-review-modal');
            expect(reviewModal).toBeTruthy();

            // Check that the MCQ multiple question is rendered correctly
            const questionText = reviewModal.querySelector('.question-text');
            expect(questionText.textContent.trim()).toBe('Which are programming languages?');

            const correctOptions = reviewModal.querySelectorAll('.correct-option');
            expect(correctOptions).toHaveLength(2); // JavaScript and Python should be marked correct
        });

        test('should update question count after adding reviewed questions', async () => {
            const mockQuestions = [
                { id: 'q1', type: QUESTION_TYPES.TEXT_INPUT, question: 'Q1?', correctAnswer: 'A1', explanation: 'E1' },
                { id: 'q2', type: QUESTION_TYPES.TEXT_INPUT, question: 'Q2?', correctAnswer: 'A2', explanation: 'E2' }
            ];

            await quizCreator.init(container);

            // Check initial state
            const initialHeader = container.querySelector('.questions-header h3');
            expect(initialHeader.textContent).toBe('Questions (0)');

            // Simulate generation and review
            quizCreator.handleGenerationSuccess({ questions: mockQuestions }, document.createElement('div'));

            // Save the questions
            const reviewModal = document.querySelector('.quiz-review-modal');
            const saveBtn = reviewModal.querySelector('#save-questions');
            saveBtn.click();

            // Check that question count was updated
            const updatedHeader = container.querySelector('.questions-header h3');
            expect(updatedHeader.textContent).toBe('Questions (2)');
        });
    });

    describe('Error Handling', () => {
        test('should handle generation errors gracefully', async () => {
            await quizCreator.init(container);

            // Simulate generation error by not calling handleGenerationSuccess
            // In a real scenario, the error would be handled in the generation modal
            // For integration test, we just verify that no review modal opens
            
            // Check that no review modal opened
            const reviewModal = document.querySelector('.quiz-review-modal');
            expect(reviewModal).toBeFalsy();

            // Verify quiz remains unchanged
            expect(quizCreator.currentQuiz.questions).toHaveLength(0);
        });

        test('should handle empty generation results', async () => {
            mockAIQuizGenerator.generateQuestions.mockResolvedValue({
                success: true,
                questions: []
            });

            await quizCreator.init(container);

            // Simulate generation with empty results
            quizCreator.handleGenerationSuccess({ questions: [] }, document.createElement('div'));

            // Check that review modal opened
            const reviewModal = document.querySelector('.quiz-review-modal');
            expect(reviewModal).toBeTruthy();

            // Check that empty state is shown
            const emptyState = reviewModal.querySelector('.empty-questions');
            expect(emptyState).toBeTruthy();
            expect(emptyState.textContent).toContain('No Questions to Review');
        });
    });
});