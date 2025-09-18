/**
 * Question Editor Component Tests
 */

import { QuestionEditor } from '../components/QuestionEditor.js';
import { QUESTION_TYPES } from '../models/types.js';

describe('QuestionEditor', () => {
    let questionEditor;
    let container;

    beforeEach(() => {
        // Create a container element
        container = document.createElement('div');
        document.body.appendChild(container);
        
        questionEditor = new QuestionEditor();
    });

    afterEach(() => {
        // Clean up
        if (container.parentNode) {
            container.parentNode.removeChild(container);
        }
    });

    describe('Initialization', () => {
        test('should create a new question editor instance', () => {
            expect(questionEditor).toBeInstanceOf(QuestionEditor);
            expect(questionEditor.currentQuestion).toBeDefined();
            expect(questionEditor.isEditing).toBe(false);
        });

        test('should generate default question structure', () => {
            const defaultQuestion = questionEditor.getDefaultQuestion();
            
            expect(defaultQuestion).toHaveProperty('id');
            expect(defaultQuestion).toHaveProperty('type', QUESTION_TYPES.MCQ_SINGLE);
            expect(defaultQuestion).toHaveProperty('question', '');
            expect(defaultQuestion).toHaveProperty('explanation', '');
            expect(defaultQuestion).toHaveProperty('media', null);
            expect(defaultQuestion).toHaveProperty('options', ['', '']);
            expect(defaultQuestion).toHaveProperty('correctAnswer', 0);
            expect(defaultQuestion).toHaveProperty('correctAnswers', []);
            expect(defaultQuestion).toHaveProperty('caseSensitive', false);
        });
    });

    describe('Rendering', () => {
        test('should render question editor interface', () => {
            questionEditor.init(container);
            
            expect(container.querySelector('.question-editor')).toBeTruthy();
            expect(container.querySelector('.question-editor-header')).toBeTruthy();
            expect(container.querySelector('.question-type-section')).toBeTruthy();
            expect(container.querySelector('.question-text-section')).toBeTruthy();
            expect(container.querySelector('.question-explanation-section')).toBeTruthy();
        });

        test('should render question type selector', () => {
            questionEditor.init(container);
            
            const typeRadios = container.querySelectorAll('input[name="question-type"]');
            expect(typeRadios).toHaveLength(3);
            
            const mcqSingle = container.querySelector(`input[value="${QUESTION_TYPES.MCQ_SINGLE}"]`);
            const mcqMultiple = container.querySelector(`input[value="${QUESTION_TYPES.MCQ_MULTIPLE}"]`);
            const textInput = container.querySelector(`input[value="${QUESTION_TYPES.TEXT_INPUT}"]`);
            
            expect(mcqSingle).toBeTruthy();
            expect(mcqMultiple).toBeTruthy();
            expect(textInput).toBeTruthy();
            expect(mcqSingle.checked).toBe(true); // Default type
        });

        test('should show correct header for new question', () => {
            questionEditor.init(container);
            
            const header = container.querySelector('.question-editor-header h3');
            expect(header.textContent).toBe('Add New Question');
        });

        test('should show correct header for editing question', () => {
            const existingQuestion = {
                id: 'test-question',
                type: QUESTION_TYPES.MCQ_SINGLE,
                question: 'Test Question?',
                options: ['Option 1', 'Option 2'],
                correctAnswer: 0,
                explanation: 'Test explanation'
            };

            questionEditor.init(container, existingQuestion);
            
            const header = container.querySelector('.question-editor-header h3');
            expect(header.textContent).toBe('Edit Question');
            expect(questionEditor.isEditing).toBe(true);
        });

        test('should show MCQ options section for MCQ types', () => {
            questionEditor.init(container);
            
            const optionsSection = container.querySelector('#question-options-section');
            expect(optionsSection.style.display).toBe('block');
        });

        test('should hide text input section for MCQ types', () => {
            questionEditor.init(container);
            
            const textInputSection = container.querySelector('#text-input-section');
            expect(textInputSection.style.display).toBe('none');
        });
    });

    describe('Question Type Handling', () => {
        test('should detect MCQ types correctly', () => {
            questionEditor.currentQuestion.type = QUESTION_TYPES.MCQ_SINGLE;
            expect(questionEditor.isMCQType()).toBe(true);
            
            questionEditor.currentQuestion.type = QUESTION_TYPES.MCQ_MULTIPLE;
            expect(questionEditor.isMCQType()).toBe(true);
            
            questionEditor.currentQuestion.type = QUESTION_TYPES.TEXT_INPUT;
            expect(questionEditor.isMCQType()).toBe(false);
        });

        test('should handle type change from MCQ single to MCQ multiple', () => {
            questionEditor.init(container);
            
            questionEditor.handleTypeChange(QUESTION_TYPES.MCQ_MULTIPLE);
            
            expect(questionEditor.currentQuestion.type).toBe(QUESTION_TYPES.MCQ_MULTIPLE);
            expect(questionEditor.currentQuestion.correctAnswers).toEqual([]);
            expect(questionEditor.currentQuestion.correctAnswer).toBeUndefined();
        });

        test('should handle type change from MCQ to text input', () => {
            questionEditor.init(container);
            
            questionEditor.handleTypeChange(QUESTION_TYPES.TEXT_INPUT);
            
            expect(questionEditor.currentQuestion.type).toBe(QUESTION_TYPES.TEXT_INPUT);
            expect(questionEditor.currentQuestion.correctAnswer).toBe('');
            expect(questionEditor.currentQuestion.caseSensitive).toBe(false);
            expect(questionEditor.currentQuestion.options).toBeUndefined();
        });

        test('should update section visibility on type change', () => {
            questionEditor.init(container);
            
            // Change to text input
            questionEditor.handleTypeChange(QUESTION_TYPES.TEXT_INPUT);
            
            const optionsSection = container.querySelector('#question-options-section');
            const textInputSection = container.querySelector('#text-input-section');
            
            expect(optionsSection.style.display).toBe('none');
            expect(textInputSection.style.display).toBe('block');
        });
    });

    describe('Options Management', () => {
        test('should render default options', () => {
            questionEditor.init(container);
            
            const optionItems = container.querySelectorAll('.option-item');
            expect(optionItems).toHaveLength(2);
        });

        test('should add new option', () => {
            questionEditor.init(container);
            
            questionEditor.addOption();
            
            expect(questionEditor.currentQuestion.options).toHaveLength(3);
            
            const optionItems = container.querySelectorAll('.option-item');
            expect(optionItems).toHaveLength(3);
        });

        test('should not add more than 6 options', () => {
            questionEditor.init(container);
            
            // Add options to reach maximum
            while (questionEditor.currentQuestion.options.length < 6) {
                questionEditor.addOption();
            }
            
            // Try to add one more
            questionEditor.addOption();
            
            expect(questionEditor.currentQuestion.options).toHaveLength(6);
        });

        test('should delete option', () => {
            questionEditor.init(container);
            questionEditor.addOption(); // Add third option
            
            questionEditor.deleteOption(1);
            
            expect(questionEditor.currentQuestion.options).toHaveLength(2);
        });

        test('should not delete when only 2 options remain', () => {
            questionEditor.init(container);
            
            questionEditor.deleteOption(0);
            
            expect(questionEditor.currentQuestion.options).toHaveLength(2);
        });

        test('should update correct answer when deleting option', () => {
            questionEditor.init(container);
            questionEditor.currentQuestion.correctAnswer = 1;
            questionEditor.addOption(); // Add third option
            
            questionEditor.deleteOption(0); // Delete first option
            
            expect(questionEditor.currentQuestion.correctAnswer).toBe(0); // Adjusted from 1 to 0
        });
    });

    describe('Form Updates', () => {
        test('should update question from form values', () => {
            questionEditor.init(container);
            
            // Update form fields
            const questionTextInput = container.querySelector('#question-text');
            const explanationInput = container.querySelector('#question-explanation');
            
            questionTextInput.value = 'Test Question Text';
            explanationInput.value = 'Test Explanation';
            
            // Trigger update
            questionEditor.updateQuestionFromForm();
            
            expect(questionEditor.currentQuestion.question).toBe('Test Question Text');
            expect(questionEditor.currentQuestion.explanation).toBe('Test Explanation');
        });

        test('should update MCQ options from form', () => {
            questionEditor.init(container);
            
            const optionInputs = container.querySelectorAll('.option-text');
            optionInputs[0].value = 'Option A';
            optionInputs[1].value = 'Option B';
            
            questionEditor.updateQuestionFromForm();
            
            expect(questionEditor.currentQuestion.options[0]).toBe('Option A');
            expect(questionEditor.currentQuestion.options[1]).toBe('Option B');
        });

        test('should update correct answer for MCQ single', () => {
            questionEditor.init(container);
            
            const correctRadio = container.querySelector('input[name="correct-answer"][value="1"]');
            correctRadio.checked = true;
            
            questionEditor.updateQuestionFromForm();
            
            expect(questionEditor.currentQuestion.correctAnswer).toBe(1);
        });

        test('should update text input specific fields', () => {
            questionEditor.init(container);
            questionEditor.handleTypeChange(QUESTION_TYPES.TEXT_INPUT);
            
            const correctAnswerInput = container.querySelector('#correct-answer-text');
            const caseSensitiveInput = container.querySelector('#case-sensitive');
            
            correctAnswerInput.value = 'Test Answer';
            caseSensitiveInput.checked = true;
            
            questionEditor.updateQuestionFromForm();
            
            expect(questionEditor.currentQuestion.correctAnswer).toBe('Test Answer');
            expect(questionEditor.currentQuestion.caseSensitive).toBe(true);
        });
    });

    describe('Validation and Saving', () => {
        test('should validate question before saving', () => {
            const mockOnSave = vi.fn();
            questionEditor.init(container, null, mockOnSave);
            
            // Try to save empty question
            questionEditor.saveQuestion();
            
            // Should not call onSave due to validation errors
            expect(mockOnSave).not.toHaveBeenCalled();
        });

        test('should call onSave with valid question', () => {
            const mockOnSave = vi.fn();
            questionEditor.init(container, null, mockOnSave);
            
            // Fill in valid question data
            const questionTextInput = container.querySelector('#question-text');
            const explanationInput = container.querySelector('#question-explanation');
            const optionInputs = container.querySelectorAll('.option-text');
            
            questionTextInput.value = 'What is 2 + 2?';
            explanationInput.value = '2 + 2 equals 4';
            optionInputs[0].value = '3';
            optionInputs[1].value = '4';
            
            const correctRadio = container.querySelector('input[name="correct-answer"][value="1"]');
            correctRadio.checked = true;
            
            questionEditor.saveQuestion();
            
            expect(mockOnSave).toHaveBeenCalledWith(
                expect.objectContaining({
                    question: 'What is 2 + 2?',
                    explanation: '2 + 2 equals 4',
                    options: ['3', '4'],
                    correctAnswer: 1
                })
            );
        });
    });

    describe('Event Handling', () => {
        test('should attach event listeners', () => {
            questionEditor.init(container);
            
            const saveButton = container.querySelector('#save-question');
            const cancelButton = container.querySelector('#cancel-question');
            const addOptionButton = container.querySelector('#add-option');
            
            expect(saveButton).toBeTruthy();
            expect(cancelButton).toBeTruthy();
            expect(addOptionButton).toBeTruthy();
        });

        test('should handle cancel callback', () => {
            const mockOnCancel = vi.fn();
            questionEditor.init(container, null, null, mockOnCancel);
            
            questionEditor.cancel();
            
            expect(mockOnCancel).toHaveBeenCalled();
        });
    });

    describe('Utility Methods', () => {
        test('should check if option is correct for MCQ single', () => {
            questionEditor.currentQuestion.type = QUESTION_TYPES.MCQ_SINGLE;
            questionEditor.currentQuestion.correctAnswer = 1;
            
            expect(questionEditor.isOptionCorrect(0)).toBe(false);
            expect(questionEditor.isOptionCorrect(1)).toBe(true);
        });

        test('should check if option is correct for MCQ multiple', () => {
            questionEditor.currentQuestion.type = QUESTION_TYPES.MCQ_MULTIPLE;
            questionEditor.currentQuestion.correctAnswers = [0, 2];
            
            expect(questionEditor.isOptionCorrect(0)).toBe(true);
            expect(questionEditor.isOptionCorrect(1)).toBe(false);
            expect(questionEditor.isOptionCorrect(2)).toBe(true);
        });

        test('should get current question data', () => {
            questionEditor.init(container);
            
            const questionTextInput = container.querySelector('#question-text');
            questionTextInput.value = 'Test Question';
            
            const question = questionEditor.getQuestion();
            
            expect(question.question).toBe('Test Question');
        });
    });
});