/**
 * Tests for QuizReviewEditor component
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { QuizReviewEditor } from '../components/QuizReviewEditor.js';
import { QUESTION_TYPES } from '../models/types.js';

// Mock the Layout module
vi.mock('../components/Layout.js', () => ({
    createButton: vi.fn((options) => {
        const button = document.createElement('button');
        button.textContent = options.text || 'Button';
        button.className = options.className || 'btn';
        return button;
    }),
    createAlert: vi.fn((options) => {
        const alert = document.createElement('div');
        alert.className = `alert alert-${options.type}`;
        alert.innerHTML = `
            <div class="alert-content">${options.message}</div>
            ${options.dismissible ? '<button class="alert-close">&times;</button>' : ''}
        `;
        return alert;
    })
}));

// Mock the validation module
vi.mock('../models/validation.js', () => ({
    validateQuestion: vi.fn(() => ({
        isValid: true,
        errors: []
    }))
}));

// Mock the QuestionEditor
vi.mock('../components/QuestionEditor.js', () => ({
    QuestionEditor: vi.fn().mockImplementation(() => ({
        init: vi.fn()
    }))
}));

describe('QuizReviewEditor', () => {
    let reviewEditor;
    let container;
    let mockQuestions;
    let mockOnSave;
    let mockOnCancel;

    beforeEach(() => {
        reviewEditor = new QuizReviewEditor();
        container = document.createElement('div');
        document.body.appendChild(container);

        mockQuestions = [
            {
                id: 'q1',
                type: QUESTION_TYPES.MCQ_SINGLE,
                question: 'What is 2 + 2?',
                options: ['3', '4', '5', '6'],
                correctAnswer: 1,
                explanation: 'Basic addition: 2 + 2 = 4'
            },
            {
                id: 'q2',
                type: QUESTION_TYPES.TEXT_INPUT,
                question: 'What is the capital of France?',
                correctAnswer: 'Paris',
                caseSensitive: false,
                explanation: 'Paris is the capital and largest city of France.'
            }
        ];

        mockOnSave = vi.fn();
        mockOnCancel = vi.fn();
    });

    afterEach(() => {
        document.body.removeChild(container);
    });

    describe('Initialization', () => {
        test('should initialize with questions', () => {
            reviewEditor.init(container, mockQuestions, mockOnSave, mockOnCancel);

            expect(reviewEditor.questions).toHaveLength(2);
            expect(reviewEditor.onSave).toBe(mockOnSave);
            expect(reviewEditor.onCancel).toBe(mockOnCancel);
        });

        test('should render header with question count', () => {
            reviewEditor.init(container, mockQuestions, mockOnSave, mockOnCancel);

            const questionCount = container.querySelector('.question-count');
            expect(questionCount.textContent).toBe('2 questions');
        });

        test('should render all questions', () => {
            reviewEditor.init(container, mockQuestions, mockOnSave, mockOnCancel);

            const questionItems = container.querySelectorAll('.review-question-item');
            expect(questionItems).toHaveLength(2);
        });
    });

    describe('Question Rendering', () => {
        beforeEach(() => {
            reviewEditor.init(container, mockQuestions, mockOnSave, mockOnCancel);
        });

        test('should render MCQ question correctly', () => {
            const firstQuestion = container.querySelector('[data-question-index="0"]');
            
            expect(firstQuestion.querySelector('.question-text').textContent.trim())
                .toBe('What is 2 + 2?');
            
            const options = firstQuestion.querySelectorAll('.option-preview');
            expect(options).toHaveLength(4);
            
            const correctOption = firstQuestion.querySelector('.correct-option');
            expect(correctOption.querySelector('.option-text').textContent).toBe('4');
        });

        test('should render text input question correctly', () => {
            const secondQuestion = container.querySelector('[data-question-index="1"]');
            
            expect(secondQuestion.querySelector('.question-text').textContent.trim())
                .toBe('What is the capital of France?');
            
            const answerText = secondQuestion.querySelector('.answer-text');
            expect(answerText.textContent).toBe('Paris');
        });

        test('should show explanations by default', () => {
            const explanations = container.querySelectorAll('.question-explanation');
            expect(explanations).toHaveLength(2);
        });

        test('should hide explanations when toggled', () => {
            const showExplanationsCheckbox = container.querySelector('#show-explanations');
            showExplanationsCheckbox.checked = false;
            showExplanationsCheckbox.dispatchEvent(new Event('change'));

            const explanations = container.querySelectorAll('.question-explanation');
            expect(explanations).toHaveLength(0);
        });
    });

    describe('Question Selection', () => {
        beforeEach(() => {
            reviewEditor.init(container, mockQuestions, mockOnSave, mockOnCancel);
        });

        test('should select individual questions', () => {
            const firstCheckbox = container.querySelector('[data-index="0"]');
            firstCheckbox.click();

            expect(reviewEditor.selectedQuestions.has(0)).toBe(true);
            expect(container.querySelector('#selected-count').textContent).toBe('1');
        });

        test('should select all questions', () => {
            const selectAllBtn = container.querySelector('#select-all');
            selectAllBtn.click();

            expect(reviewEditor.selectedQuestions.size).toBe(2);
            expect(container.querySelector('#selected-count').textContent).toBe('2');
        });

        test('should deselect all questions', () => {
            // First select all
            const selectAllBtn = container.querySelector('#select-all');
            selectAllBtn.click();

            // Then deselect all
            const deselectAllBtn = container.querySelector('#deselect-all');
            deselectAllBtn.click();

            expect(reviewEditor.selectedQuestions.size).toBe(0);
            expect(container.querySelector('.selected-count').style.display).toBe('none');
        });

        test('should enable bulk action buttons when questions are selected', () => {
            const firstCheckbox = container.querySelector('[data-index="0"]');
            firstCheckbox.click();

            const deleteBtn = container.querySelector('#delete-selected');
            const regenerateBtn = container.querySelector('#regenerate-selected');

            expect(deleteBtn.disabled).toBe(false);
            expect(regenerateBtn.disabled).toBe(false);
        });
    });

    describe('Question Management', () => {
        beforeEach(() => {
            reviewEditor.init(container, mockQuestions, mockOnSave, mockOnCancel);
        });

        test('should delete individual question', () => {
            // Mock confirm dialog
            window.confirm = vi.fn(() => true);

            const deleteBtn = container.querySelector('.delete-question[data-index="0"]');
            deleteBtn.click();

            expect(reviewEditor.questions).toHaveLength(1);
            expect(reviewEditor.questions[0].question).toBe('What is the capital of France?');
        });

        test('should delete selected questions', () => {
            // Select first question
            const firstCheckbox = container.querySelector('[data-index="0"]');
            firstCheckbox.click();

            // Mock confirm dialog
            window.confirm = vi.fn(() => true);

            // Delete selected
            const deleteSelectedBtn = container.querySelector('#delete-selected');
            deleteSelectedBtn.click();

            expect(reviewEditor.questions).toHaveLength(1);
            expect(reviewEditor.questions[0].question).toBe('What is the capital of France?');
        });

        test('should not delete questions if user cancels', () => {
            // Mock confirm dialog to return false
            window.confirm = vi.fn(() => false);

            const deleteBtn = container.querySelector('.delete-question[data-index="0"]');
            deleteBtn.click();

            expect(reviewEditor.questions).toHaveLength(2);
        });
    });

    describe('Save and Cancel', () => {
        beforeEach(() => {
            reviewEditor.init(container, mockQuestions, mockOnSave, mockOnCancel);
        });

        test('should call onSave with questions when saved', () => {
            const saveBtn = container.querySelector('#save-questions');
            saveBtn.click();

            expect(mockOnSave).toHaveBeenCalledWith(reviewEditor.questions);
        });

        test('should call onCancel when cancelled', () => {
            const cancelBtn = container.querySelector('#cancel-review');
            cancelBtn.click();

            expect(mockOnCancel).toHaveBeenCalled();
        });

        test('should show warning when saving with no questions', () => {
            // Remove all questions
            reviewEditor.questions = [];
            reviewEditor.renderQuestions();

            const saveBtn = container.querySelector('#save-questions');
            saveBtn.click();

            expect(mockOnSave).not.toHaveBeenCalled();
        });

        test('should confirm cancel if there are unsaved changes', () => {
            // Make some changes
            reviewEditor.hasUnsavedChanges = true;
            
            // Mock confirm dialog
            window.confirm = vi.fn(() => false);

            const cancelBtn = container.querySelector('#cancel-review');
            cancelBtn.click();

            expect(window.confirm).toHaveBeenCalled();
            expect(mockOnCancel).not.toHaveBeenCalled();
        });
    });

    describe('Empty State', () => {
        test('should show empty state when no questions', () => {
            reviewEditor.init(container, [], mockOnSave, mockOnCancel);

            const emptyState = container.querySelector('.empty-questions');
            expect(emptyState).toBeTruthy();
            expect(emptyState.textContent).toContain('No Questions to Review');
        });
    });

    describe('Question Type Labels', () => {
        test('should return correct labels for question types', () => {
            expect(reviewEditor.getQuestionTypeLabel(QUESTION_TYPES.MCQ_SINGLE))
                .toBe('Multiple Choice');
            expect(reviewEditor.getQuestionTypeLabel(QUESTION_TYPES.MCQ_MULTIPLE))
                .toBe('Multiple Select');
            expect(reviewEditor.getQuestionTypeLabel(QUESTION_TYPES.TEXT_INPUT))
                .toBe('Text Input');
            expect(reviewEditor.getQuestionTypeLabel('unknown'))
                .toBe('Unknown');
        });
    });

    describe('HTML Escaping', () => {
        test('should escape HTML in question text', () => {
            const maliciousQuestion = {
                id: 'q1',
                type: QUESTION_TYPES.TEXT_INPUT,
                question: '<script>alert("xss")</script>What is this?',
                correctAnswer: 'Safe answer',
                explanation: 'Safe explanation'
            };

            reviewEditor.init(container, [maliciousQuestion], mockOnSave, mockOnCancel);

            const questionText = container.querySelector('.question-text');
            expect(questionText.innerHTML).not.toContain('<script>');
            expect(questionText.innerHTML).toContain('&lt;script&gt;');
        });
    });
});