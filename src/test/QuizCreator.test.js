/**
 * Quiz Creator Component Tests
 */

import { QuizCreator } from '../components/QuizCreator.js';
import { QUESTION_TYPES } from '../models/types.js';

// Mock StorageManager
vi.mock('../services/StorageManager.js', () => ({
    StorageManager: vi.fn().mockImplementation(() => ({
        initialize: vi.fn().mockResolvedValue(undefined),
        storeQuiz: vi.fn().mockResolvedValue('quiz-id'),
        getQuiz: vi.fn().mockResolvedValue(null),
        getAllQuizzes: vi.fn().mockResolvedValue([]),
        updateQuiz: vi.fn().mockResolvedValue({}),
        deleteQuiz: vi.fn().mockResolvedValue(undefined)
    }))
}));

describe('QuizCreator', () => {
    let quizCreator;
    let container;

    beforeEach(() => {
        // Create a container element
        container = document.createElement('div');
        document.body.appendChild(container);
        
        quizCreator = new QuizCreator();
    });

    afterEach(() => {
        // Clean up
        if (container.parentNode) {
            container.parentNode.removeChild(container);
        }
    });

    describe('Initialization', () => {
        test('should create a new quiz creator instance', () => {
            expect(quizCreator).toBeInstanceOf(QuizCreator);
            expect(quizCreator.currentQuiz).toBeDefined();
            expect(quizCreator.isEditing).toBe(false);
        });

        test('should generate default quiz structure', () => {
            const defaultQuiz = quizCreator.getDefaultQuiz();
            
            expect(defaultQuiz).toHaveProperty('id');
            expect(defaultQuiz).toHaveProperty('title', '');
            expect(defaultQuiz).toHaveProperty('description', '');
            expect(defaultQuiz).toHaveProperty('questions', []);
            expect(defaultQuiz).toHaveProperty('createdAt');
            expect(defaultQuiz).toHaveProperty('updatedAt');
            expect(defaultQuiz).toHaveProperty('settings');
            expect(defaultQuiz.settings).toHaveProperty('shuffleQuestions', false);
            expect(defaultQuiz.settings).toHaveProperty('showExplanations', true);
            expect(defaultQuiz.settings).toHaveProperty('timeLimit', null);
        });
    });

    describe('Rendering', () => {
        test('should render quiz creator interface', async () => {
            await quizCreator.init(container);
            
            expect(container.querySelector('.quiz-creator')).toBeTruthy();
            expect(container.querySelector('.quiz-creator-header')).toBeTruthy();
            expect(container.querySelector('.quiz-metadata-section')).toBeTruthy();
            expect(container.querySelector('.quiz-settings-section')).toBeTruthy();
            expect(container.querySelector('.quiz-questions-section')).toBeTruthy();
        });

        test('should render metadata form fields', async () => {
            await quizCreator.init(container);
            
            expect(container.querySelector('#quiz-title')).toBeTruthy();
            expect(container.querySelector('#quiz-description')).toBeTruthy();
        });

        test('should render settings form fields', async () => {
            await quizCreator.init(container);
            
            expect(container.querySelector('#shuffle-questions')).toBeTruthy();
            expect(container.querySelector('#show-explanations')).toBeTruthy();
            expect(container.querySelector('#time-limit')).toBeTruthy();
        });

        test('should show correct header for new quiz', async () => {
            await quizCreator.init(container);
            
            const header = container.querySelector('.quiz-creator-header h2');
            expect(header.textContent).toBe('Create New Quiz');
        });

        test('should show correct header for editing quiz', async () => {
            const existingQuiz = {
                id: 'test-quiz',
                title: 'Test Quiz',
                description: 'Test Description',
                questions: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                settings: {
                    shuffleQuestions: true,
                    showExplanations: false,
                    timeLimit: 30
                }
            };

            await quizCreator.init(container, existingQuiz);
            
            const header = container.querySelector('.quiz-creator-header h2');
            expect(header.textContent).toBe('Edit Quiz');
            expect(quizCreator.isEditing).toBe(true);
        });
    });

    describe('Form Updates', () => {
        test('should update quiz from form values', async () => {
            await quizCreator.init(container);
            
            // Update form fields
            const titleInput = container.querySelector('#quiz-title');
            const descriptionInput = container.querySelector('#quiz-description');
            const shuffleInput = container.querySelector('#shuffle-questions');
            const explanationsInput = container.querySelector('#show-explanations');
            const timeLimitInput = container.querySelector('#time-limit');
            
            titleInput.value = 'Test Quiz Title';
            descriptionInput.value = 'Test Quiz Description';
            shuffleInput.checked = true;
            explanationsInput.checked = false;
            timeLimitInput.value = '45';
            
            // Trigger update
            quizCreator.updateQuizFromForm();
            
            expect(quizCreator.currentQuiz.title).toBe('Test Quiz Title');
            expect(quizCreator.currentQuiz.description).toBe('Test Quiz Description');
            expect(quizCreator.currentQuiz.settings.shuffleQuestions).toBe(true);
            expect(quizCreator.currentQuiz.settings.showExplanations).toBe(false);
            expect(quizCreator.currentQuiz.settings.timeLimit).toBe(45);
        });

        test('should handle empty time limit', async () => {
            await quizCreator.init(container);
            
            const timeLimitInput = container.querySelector('#time-limit');
            timeLimitInput.value = '';
            
            quizCreator.updateQuizFromForm();
            
            expect(quizCreator.currentQuiz.settings.timeLimit).toBe(null);
        });
    });

    describe('Question Management', () => {
        test('should show empty questions message when no questions', async () => {
            await quizCreator.init(container);
            
            const emptyMessage = container.querySelector('.empty-questions');
            expect(emptyMessage).toBeTruthy();
            expect(emptyMessage.textContent).toContain('No questions added yet');
        });

        test('should update question count in header', async () => {
            quizCreator.currentQuiz.questions = [
                { 
                    id: '1', 
                    type: QUESTION_TYPES.MCQ_SINGLE, 
                    question: 'Test?',
                    options: ['Option 1', 'Option 2'],
                    correctAnswer: 0,
                    explanation: 'Test explanation'
                },
                { 
                    id: '2', 
                    type: QUESTION_TYPES.TEXT_INPUT, 
                    question: 'Test 2?',
                    correctAnswer: 'Answer',
                    caseSensitive: false,
                    explanation: 'Test explanation 2'
                }
            ];
            
            await quizCreator.init(container);
            
            const header = container.querySelector('.questions-header h3');
            expect(header.textContent).toBe('Questions (2)');
        });

        test('should get correct question type labels', () => {
            expect(quizCreator.getQuestionTypeLabel(QUESTION_TYPES.MCQ_SINGLE))
                .toBe('Multiple Choice (Single)');
            expect(quizCreator.getQuestionTypeLabel(QUESTION_TYPES.MCQ_MULTIPLE))
                .toBe('Multiple Choice (Multiple)');
            expect(quizCreator.getQuestionTypeLabel(QUESTION_TYPES.TEXT_INPUT))
                .toBe('Text Input');
            expect(quizCreator.getQuestionTypeLabel('unknown'))
                .toBe('Unknown');
        });
    });

    describe('Utility Methods', () => {
        test('should detect unsaved changes', async () => {
            await quizCreator.init(container);
            
            // Initially no changes
            expect(quizCreator.hasUnsavedChanges()).toBe(false);
            
            // Add title
            quizCreator.currentQuiz.title = 'Test Title';
            expect(quizCreator.hasUnsavedChanges()).toBe(true);
            
            // Reset and add description
            quizCreator.currentQuiz.title = '';
            quizCreator.currentQuiz.description = 'Test Description';
            expect(quizCreator.hasUnsavedChanges()).toBe(true);
            
            // Reset and add question
            quizCreator.currentQuiz.description = '';
            quizCreator.currentQuiz.questions = [{ id: '1', question: 'Test?' }];
            expect(quizCreator.hasUnsavedChanges()).toBe(true);
        });

        test('should show alerts', async () => {
            await quizCreator.init(container);
            
            quizCreator.showAlert('Test message', 'success');
            
            const alert = container.querySelector('.alert-success');
            expect(alert).toBeTruthy();
            expect(alert.textContent).toContain('Test message');
        });
    });

    describe('Event Handling', () => {
        test('should attach event listeners', async () => {
            await quizCreator.init(container);
            
            const saveButton = container.querySelector('#save-quiz');
            const cancelButton = container.querySelector('#cancel-quiz');
            const addQuestionButton = container.querySelector('#add-question');
            
            expect(saveButton).toBeTruthy();
            expect(cancelButton).toBeTruthy();
            expect(addQuestionButton).toBeTruthy();
        });

        test('should handle form input changes', async () => {
            await quizCreator.init(container);
            
            const titleInput = container.querySelector('#quiz-title');
            titleInput.value = 'New Title';
            
            // Simulate input event
            const inputEvent = new Event('input', { bubbles: true });
            titleInput.dispatchEvent(inputEvent);
            
            expect(quizCreator.currentQuiz.title).toBe('New Title');
        });
    });
});