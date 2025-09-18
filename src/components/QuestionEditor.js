/**
 * Question Editor Component
 * Handles the creation and editing of individual quiz questions
 */

import { createFormGroup, createButton, createAlert, createModal } from './Layout.js';
import { QUESTION_TYPES } from '../models/types.js';
import { validateQuestion } from '../models/validation.js';
import { MediaUpload } from './MediaUpload.js';

export class QuestionEditor {
    constructor(storageManager = null) {
        this.currentQuestion = this.getDefaultQuestion();
        this.isEditing = false;
        this.onSave = null;
        this.onCancel = null;
        this.container = null;
        this.storageManager = storageManager;
        this.mediaUpload = null;
    }

    /**
     * Get default question structure
     * @returns {Object} Default question object
     */
    getDefaultQuestion() {
        return {
            id: `question_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: QUESTION_TYPES.MCQ_SINGLE,
            question: '',
            explanation: '',
            media: null,
            // MCQ specific fields
            options: ['', ''],
            correctAnswer: 0,
            correctAnswers: [],
            // Text input specific fields
            caseSensitive: false
        };
    }

    /**
     * Initialize the question editor
     * @param {HTMLElement} container - Container element
     * @param {Object} existingQuestion - Existing question to edit (optional)
     * @param {Function} onSave - Callback when question is saved
     * @param {Function} onCancel - Callback when editing is cancelled
     */
    init(container, existingQuestion = null, onSave = null, onCancel = null) {
        this.container = container;
        this.onSave = onSave;
        this.onCancel = onCancel;
        
        if (existingQuestion) {
            this.currentQuestion = { ...existingQuestion };
            this.isEditing = true;
        }

        this.render();
        this.attachEventListeners();
    }

    /**
     * Render the question editor interface
     */
    render() {
        this.container.innerHTML = `
            <div class="question-editor">
                <div class="question-editor-header">
                    <h3>${this.isEditing ? 'Edit Question' : 'Add New Question'}</h3>
                    <div class="question-editor-actions">
                        <button id="save-question" class="btn btn-primary">
                            ${this.isEditing ? 'Update Question' : 'Add Question'}
                        </button>
                        <button id="cancel-question" class="btn btn-secondary">Cancel</button>
                    </div>
                </div>

                <div class="question-editor-content">
                    <!-- Question Type Selection -->
                    <div class="question-type-section">
                        <h4>Question Type</h4>
                        <div class="question-type-selector">
                            <label class="type-option">
                                <input type="radio" name="question-type" value="${QUESTION_TYPES.MCQ_SINGLE}" 
                                       ${this.currentQuestion.type === QUESTION_TYPES.MCQ_SINGLE ? 'checked' : ''}>
                                <div class="type-card">
                                    <div class="type-icon">📝</div>
                                    <div class="type-info">
                                        <div class="type-title">Multiple Choice (Single)</div>
                                        <div class="type-description">Select one correct answer</div>
                                    </div>
                                </div>
                            </label>
                            
                            <label class="type-option">
                                <input type="radio" name="question-type" value="${QUESTION_TYPES.MCQ_MULTIPLE}" 
                                       ${this.currentQuestion.type === QUESTION_TYPES.MCQ_MULTIPLE ? 'checked' : ''}>
                                <div class="type-card">
                                    <div class="type-icon">☑️</div>
                                    <div class="type-info">
                                        <div class="type-title">Multiple Choice (Multiple)</div>
                                        <div class="type-description">Select multiple correct answers</div>
                                    </div>
                                </div>
                            </label>
                            
                            <label class="type-option">
                                <input type="radio" name="question-type" value="${QUESTION_TYPES.TEXT_INPUT}" 
                                       ${this.currentQuestion.type === QUESTION_TYPES.TEXT_INPUT ? 'checked' : ''}>
                                <div class="type-card">
                                    <div class="type-icon">✏️</div>
                                    <div class="type-info">
                                        <div class="type-title">Text Input</div>
                                        <div class="type-description">Type the correct answer</div>
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <!-- Question Text -->
                    <div class="question-text-section">
                        <h4>Question Text</h4>
                        <div class="form-group">
                            <label for="question-text" class="form-label">Question *</label>
                            <textarea 
                                id="question-text" 
                                name="question-text"
                                class="form-textarea question-text-input" 
                                placeholder="Enter your question here..."
                                rows="4"
                                required
                            >${this.currentQuestion.question}</textarea>
                            <small class="form-help">Write a clear, concise question. You can use rich text formatting.</small>
                        </div>
                    </div>

                    <!-- Question Options (for MCQ) -->
                    <div id="question-options-section" class="question-options-section" 
                         style="display: ${this.isMCQType() ? 'block' : 'none'}">
                        <h4>Answer Options</h4>
                        <div id="options-container" class="options-container">
                            <!-- Options will be rendered here -->
                        </div>
                        <button id="add-option" class="btn btn-secondary btn-small">Add Option</button>
                    </div>

                    <!-- Text Input Settings -->
                    <div id="text-input-section" class="text-input-section" 
                         style="display: ${this.currentQuestion.type === QUESTION_TYPES.TEXT_INPUT ? 'block' : 'none'}">
                        <h4>Text Answer Settings</h4>
                        <div class="form-group">
                            <label for="correct-answer-text" class="form-label">Correct Answer *</label>
                            <input 
                                type="text" 
                                id="correct-answer-text" 
                                name="correct-answer-text"
                                class="form-input" 
                                placeholder="Enter the correct answer..."
                                value="${this.currentQuestion.type === QUESTION_TYPES.TEXT_INPUT ? this.currentQuestion.correctAnswer || '' : ''}"
                                required
                            />
                        </div>
                        <div class="form-group form-checkbox-group">
                            <label class="form-checkbox-label">
                                <input 
                                    type="checkbox" 
                                    id="case-sensitive" 
                                    name="case-sensitive"
                                    class="form-checkbox"
                                    ${this.currentQuestion.caseSensitive ? 'checked' : ''}
                                />
                                <span class="form-checkbox-text">Case Sensitive</span>
                            </label>
                            <small class="form-help">Whether the answer must match the exact case (uppercase/lowercase)</small>
                        </div>
                    </div>

                    <!-- Explanation -->
                    <div class="question-explanation-section">
                        <h4>Explanation</h4>
                        <div class="form-group">
                            <label for="question-explanation" class="form-label">Explanation *</label>
                            <textarea 
                                id="question-explanation" 
                                name="question-explanation"
                                class="form-textarea" 
                                placeholder="Explain why this is the correct answer..."
                                rows="3"
                                required
                            >${this.currentQuestion.explanation}</textarea>
                            <small class="form-help">This will be shown to students after they answer the question</small>
                        </div>
                    </div>

                    <!-- Media Upload -->
                    <div class="question-media-section">
                        <h4>Media (Optional)</h4>
                        <div id="media-upload-container" class="media-upload-container">
                            <!-- Media upload component will be rendered here -->
                        </div>
                    </div>
                </div>

                <!-- Alerts container -->
                <div id="question-alerts-container" class="alerts-container"></div>
            </div>
        `;

        this.renderOptions();
        this.initializeMediaUpload();
    }

    /**
     * Check if current question type is MCQ
     * @returns {boolean} True if MCQ type
     */
    isMCQType() {
        return this.currentQuestion.type === QUESTION_TYPES.MCQ_SINGLE || 
               this.currentQuestion.type === QUESTION_TYPES.MCQ_MULTIPLE;
    }

    /**
     * Initialize media upload component
     */
    initializeMediaUpload() {
        const mediaContainer = this.container.querySelector('#media-upload-container');
        if (!mediaContainer) return;

        this.mediaUpload = new MediaUpload(this.storageManager);
        this.mediaUpload.init(
            mediaContainer,
            this.currentQuestion.media,
            (media) => this.handleMediaChange(media)
        );
    }

    /**
     * Handle media change from upload component
     * @param {Object|null} media - New media object or null
     */
    handleMediaChange(media) {
        this.currentQuestion.media = media;
    }

    /**
     * Render MCQ options
     */
    renderOptions() {
        if (!this.isMCQType()) return;

        const optionsContainer = this.container.querySelector('#options-container');
        if (!optionsContainer) return;

        optionsContainer.innerHTML = '';

        this.currentQuestion.options.forEach((option, index) => {
            const optionElement = this.createOptionElement(option, index);
            optionsContainer.appendChild(optionElement);
        });
    }

    /**
     * Create an option element
     * @param {string} option - Option text
     * @param {number} index - Option index
     * @returns {HTMLElement} Option element
     */
    createOptionElement(option, index) {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option-item';
        optionDiv.dataset.optionIndex = index;

        const isCorrect = this.isOptionCorrect(index);
        const inputType = this.currentQuestion.type === QUESTION_TYPES.MCQ_SINGLE ? 'radio' : 'checkbox';
        const inputName = this.currentQuestion.type === QUESTION_TYPES.MCQ_SINGLE ? 'correct-answer' : `correct-answer-${index}`;

        optionDiv.innerHTML = `
            <div class="option-header">
                <span class="option-label">Option ${index + 1}</span>
                <div class="option-actions">
                    <button class="btn btn-small btn-error delete-option" data-index="${index}" 
                            ${this.currentQuestion.options.length <= 2 ? 'disabled' : ''}>
                        Delete
                    </button>
                </div>
            </div>
            <div class="option-content">
                <div class="option-input-group">
                    <input 
                        type="text" 
                        class="form-input option-text" 
                        placeholder="Enter option text..."
                        value="${option}"
                        data-index="${index}"
                        required
                    />
                </div>
                <div class="option-correct-group">
                    <label class="form-checkbox-label">
                        <input 
                            type="${inputType}" 
                            name="${inputName}"
                            class="form-checkbox option-correct" 
                            value="${index}"
                            data-index="${index}"
                            ${isCorrect ? 'checked' : ''}
                        />
                        <span class="form-checkbox-text">Correct Answer</span>
                    </label>
                </div>
            </div>
        `;

        return optionDiv;
    }

    /**
     * Check if an option is marked as correct
     * @param {number} index - Option index
     * @returns {boolean} True if option is correct
     */
    isOptionCorrect(index) {
        if (this.currentQuestion.type === QUESTION_TYPES.MCQ_SINGLE) {
            return this.currentQuestion.correctAnswer === index;
        } else if (this.currentQuestion.type === QUESTION_TYPES.MCQ_MULTIPLE) {
            return this.currentQuestion.correctAnswers.includes(index);
        }
        return false;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Save question button
        const saveButton = this.container.querySelector('#save-question');
        if (saveButton) {
            saveButton.addEventListener('click', () => this.saveQuestion());
        }

        // Cancel button
        const cancelButton = this.container.querySelector('#cancel-question');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => this.cancel());
        }

        // Question type change
        const typeRadios = this.container.querySelectorAll('input[name="question-type"]');
        typeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => this.handleTypeChange(e.target.value));
        });

        // Add option button
        const addOptionButton = this.container.querySelector('#add-option');
        if (addOptionButton) {
            addOptionButton.addEventListener('click', () => this.addOption());
        }

        // Form field changes
        this.container.addEventListener('input', (e) => {
            this.updateQuestionFromForm();
        });

        this.container.addEventListener('change', (e) => {
            this.updateQuestionFromForm();
        });

        // Option actions (delete)
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-option')) {
                const index = parseInt(e.target.dataset.index);
                this.deleteOption(index);
            }
        });
    }

    /**
     * Handle question type change
     * @param {string} newType - New question type
     */
    handleTypeChange(newType) {
        const oldType = this.currentQuestion.type;
        this.currentQuestion.type = newType;

        // Initialize type-specific fields
        if (newType === QUESTION_TYPES.MCQ_SINGLE) {
            if (oldType !== QUESTION_TYPES.MCQ_SINGLE) {
                this.currentQuestion.options = this.currentQuestion.options || ['', ''];
                this.currentQuestion.correctAnswer = 0;
                delete this.currentQuestion.correctAnswers;
                delete this.currentQuestion.caseSensitive;
            }
        } else if (newType === QUESTION_TYPES.MCQ_MULTIPLE) {
            if (oldType !== QUESTION_TYPES.MCQ_MULTIPLE) {
                this.currentQuestion.options = this.currentQuestion.options || ['', ''];
                this.currentQuestion.correctAnswers = [];
                delete this.currentQuestion.correctAnswer;
                delete this.currentQuestion.caseSensitive;
            }
        } else if (newType === QUESTION_TYPES.TEXT_INPUT) {
            this.currentQuestion.correctAnswer = this.currentQuestion.correctAnswer || '';
            this.currentQuestion.caseSensitive = this.currentQuestion.caseSensitive || false;
            delete this.currentQuestion.options;
            delete this.currentQuestion.correctAnswers;
        }

        // Update UI
        this.updateSectionVisibility();
        this.renderOptions();
    }

    /**
     * Update section visibility based on question type
     */
    updateSectionVisibility() {
        const optionsSection = this.container.querySelector('#question-options-section');
        const textInputSection = this.container.querySelector('#text-input-section');

        if (optionsSection) {
            optionsSection.style.display = this.isMCQType() ? 'block' : 'none';
        }

        if (textInputSection) {
            textInputSection.style.display = this.currentQuestion.type === QUESTION_TYPES.TEXT_INPUT ? 'block' : 'none';
        }
    }

    /**
     * Add a new option
     */
    addOption() {
        if (this.currentQuestion.options.length >= 6) {
            this.showAlert('Maximum 6 options allowed', 'warning');
            return;
        }

        this.currentQuestion.options.push('');
        this.renderOptions();
    }

    /**
     * Delete an option
     * @param {number} index - Option index to delete
     */
    deleteOption(index) {
        if (this.currentQuestion.options.length <= 2) {
            this.showAlert('Minimum 2 options required', 'warning');
            return;
        }

        // Remove the option
        this.currentQuestion.options.splice(index, 1);

        // Update correct answers
        if (this.currentQuestion.type === QUESTION_TYPES.MCQ_SINGLE) {
            if (this.currentQuestion.correctAnswer === index) {
                this.currentQuestion.correctAnswer = 0;
            } else if (this.currentQuestion.correctAnswer > index) {
                this.currentQuestion.correctAnswer--;
            }
        } else if (this.currentQuestion.type === QUESTION_TYPES.MCQ_MULTIPLE) {
            // Remove the deleted index and adjust remaining indices
            this.currentQuestion.correctAnswers = this.currentQuestion.correctAnswers
                .filter(i => i !== index)
                .map(i => i > index ? i - 1 : i);
        }

        this.renderOptions();
    }

    /**
     * Update question object from form values
     */
    updateQuestionFromForm() {
        // Update question text
        const questionTextInput = this.container.querySelector('#question-text');
        if (questionTextInput) {
            this.currentQuestion.question = questionTextInput.value.trim();
        }

        // Update explanation
        const explanationInput = this.container.querySelector('#question-explanation');
        if (explanationInput) {
            this.currentQuestion.explanation = explanationInput.value.trim();
        }

        // Update options and correct answers for MCQ
        if (this.isMCQType()) {
            const optionInputs = this.container.querySelectorAll('.option-text');
            this.currentQuestion.options = Array.from(optionInputs).map(input => input.value.trim());

            if (this.currentQuestion.type === QUESTION_TYPES.MCQ_SINGLE) {
                const correctRadio = this.container.querySelector('input[name="correct-answer"]:checked');
                this.currentQuestion.correctAnswer = correctRadio ? parseInt(correctRadio.value) : 0;
            } else if (this.currentQuestion.type === QUESTION_TYPES.MCQ_MULTIPLE) {
                const correctCheckboxes = this.container.querySelectorAll('.option-correct:checked');
                this.currentQuestion.correctAnswers = Array.from(correctCheckboxes).map(cb => parseInt(cb.value));
            }
        }

        // Update text input specific fields
        if (this.currentQuestion.type === QUESTION_TYPES.TEXT_INPUT) {
            const correctAnswerInput = this.container.querySelector('#correct-answer-text');
            if (correctAnswerInput) {
                this.currentQuestion.correctAnswer = correctAnswerInput.value.trim();
            }

            const caseSensitiveInput = this.container.querySelector('#case-sensitive');
            if (caseSensitiveInput) {
                this.currentQuestion.caseSensitive = caseSensitiveInput.checked;
            }
        }
    }

    /**
     * Save the question
     */
    saveQuestion() {
        try {
            // Update question from form
            this.updateQuestionFromForm();

            // Validate question
            const validation = validateQuestion(this.currentQuestion);
            if (!validation.isValid) {
                this.showAlert(validation.errors.join(', '), 'error');
                return;
            }

            // Call save callback
            if (this.onSave) {
                this.onSave(this.currentQuestion);
            }

            this.showAlert(
                `Question ${this.isEditing ? 'updated' : 'added'} successfully!`,
                'success'
            );

        } catch (error) {
            console.error('Error saving question:', error);
            this.showAlert('Failed to save question: ' + error.message, 'error');
        }
    }

    /**
     * Cancel question editing
     */
    cancel() {
        if (this.onCancel) {
            this.onCancel();
        }
    }

    /**
     * Show alert message
     * @param {string} message - Alert message
     * @param {string} type - Alert type (success, error, warning, info)
     */
    showAlert(message, type = 'info') {
        const alertsContainer = this.container.querySelector('#question-alerts-container');
        if (!alertsContainer) return;

        const alert = createAlert({ message, type, dismissible: true });
        alertsContainer.appendChild(alert);

        // Auto-remove success and info alerts after 5 seconds
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.remove();
                }
            }, 5000);
        }
    }

    /**
     * Load an existing question for editing
     * @param {Object} question - Question to load
     */
    loadQuestion(question) {
        this.currentQuestion = { ...question };
        this.isEditing = true;
        this.render();
        this.attachEventListeners();
    }

    /**
     * Get the current question data
     * @returns {Object} Current question object
     */
    getQuestion() {
        this.updateQuestionFromForm();
        return { ...this.currentQuestion };
    }
}