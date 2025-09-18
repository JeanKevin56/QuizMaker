/**
 * Quiz Creator Component
 * Handles the creation and editing of quizzes with metadata and questions
 */

import { createFormGroup, createButton, createAlert } from './Layout.js';
import { QUESTION_TYPES } from '../models/types.js';
import { validateQuiz } from '../models/validation.js';
import { StorageManager } from '../services/StorageManager.js';
import { QuestionEditor } from './QuestionEditor.js';

export class QuizCreator {
    constructor(storageManager = null) {
        this.storageManager = storageManager || new StorageManager();
        this.currentQuiz = this.getDefaultQuiz();
        this.isEditing = false;
        this.container = null;
        this.metadataForm = null;
        this.questionsContainer = null;
    }

    /**
     * Get default quiz structure
     * @returns {Object} Default quiz object
     */
    getDefaultQuiz() {
        return {
            id: `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: '',
            description: '',
            questions: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            settings: {
                shuffleQuestions: false,
                showExplanations: true,
                timeLimit: null
            }
        };
    }

    /**
     * Initialize the quiz creator
     * @param {HTMLElement} container - Container element
     * @param {Object} existingQuiz - Existing quiz to edit (optional)
     */
    async init(container, existingQuiz = null) {
        this.container = container;
        
        if (existingQuiz) {
            this.currentQuiz = { ...existingQuiz };
            this.isEditing = true;
        }

        await this.storageManager.initialize();
        this.render();
        this.attachEventListeners();
    }

    /**
     * Render the quiz creator interface
     */
    render() {
        this.container.innerHTML = `
            <div class="quiz-creator">
                <div class="quiz-creator-header">
                    <h2>${this.isEditing ? 'Edit Quiz' : 'Create New Quiz'}</h2>
                    <div class="quiz-creator-actions">
                        <button id="save-quiz" class="btn btn-primary">
                            ${this.isEditing ? 'Update Quiz' : 'Save Quiz'}
                        </button>
                        <button id="cancel-quiz" class="btn btn-secondary">Cancel</button>
                    </div>
                </div>

                <div class="quiz-creator-content">
                    <!-- Quiz Metadata Section -->
                    <div class="quiz-metadata-section">
                        <h3>Quiz Information</h3>
                        <div id="metadata-form" class="metadata-form">
                            <!-- Metadata form will be rendered here -->
                        </div>
                    </div>

                    <!-- Quiz Settings Section -->
                    <div class="quiz-settings-section">
                        <h3>Quiz Settings</h3>
                        <div id="settings-form" class="settings-form">
                            <!-- Settings form will be rendered here -->
                        </div>
                    </div>

                    <!-- Questions Section -->
                    <div class="quiz-questions-section">
                        <div class="questions-header">
                            <h3>Questions (${this.currentQuiz.questions.length})</h3>
                            <button id="add-question" class="btn btn-success">Add Question</button>
                        </div>
                        <div id="questions-container" class="questions-container">
                            <!-- Questions will be rendered here -->
                        </div>
                    </div>
                </div>

                <!-- Alerts container -->
                <div id="alerts-container" class="alerts-container"></div>
            </div>
        `;

        this.renderMetadataForm();
        this.renderSettingsForm();
        this.renderQuestions();
    }

    /**
     * Render the metadata form
     */
    renderMetadataForm() {
        const metadataContainer = this.container.querySelector('#metadata-form');
        
        // Clear existing content
        metadataContainer.innerHTML = '';

        // Title field
        const titleGroup = createFormGroup({
            label: 'Quiz Title',
            type: 'text',
            id: 'quiz-title',
            placeholder: 'Enter quiz title...',
            required: true,
            value: this.currentQuiz.title
        });
        metadataContainer.appendChild(titleGroup);

        // Description field
        const descriptionGroup = document.createElement('div');
        descriptionGroup.className = 'form-group';
        descriptionGroup.innerHTML = `
            <label for="quiz-description" class="form-label">Description</label>
            <textarea 
                id="quiz-description" 
                name="quiz-description"
                class="form-textarea" 
                placeholder="Enter quiz description..."
                rows="4"
            >${this.currentQuiz.description}</textarea>
        `;
        metadataContainer.appendChild(descriptionGroup);
    }

    /**
     * Render the settings form
     */
    renderSettingsForm() {
        const settingsContainer = this.container.querySelector('#settings-form');
        
        // Clear existing content
        settingsContainer.innerHTML = '';

        // Shuffle questions checkbox
        const shuffleGroup = document.createElement('div');
        shuffleGroup.className = 'form-group form-checkbox-group';
        shuffleGroup.innerHTML = `
            <label class="form-checkbox-label">
                <input 
                    type="checkbox" 
                    id="shuffle-questions" 
                    name="shuffle-questions"
                    class="form-checkbox"
                    ${this.currentQuiz.settings.shuffleQuestions ? 'checked' : ''}
                />
                <span class="form-checkbox-text">Shuffle Questions</span>
            </label>
            <small class="form-help">Randomize the order of questions for each quiz attempt</small>
        `;
        settingsContainer.appendChild(shuffleGroup);

        // Show explanations checkbox
        const explanationsGroup = document.createElement('div');
        explanationsGroup.className = 'form-group form-checkbox-group';
        explanationsGroup.innerHTML = `
            <label class="form-checkbox-label">
                <input 
                    type="checkbox" 
                    id="show-explanations" 
                    name="show-explanations"
                    class="form-checkbox"
                    ${this.currentQuiz.settings.showExplanations ? 'checked' : ''}
                />
                <span class="form-checkbox-text">Show Explanations</span>
            </label>
            <small class="form-help">Display explanations for answers after quiz completion</small>
        `;
        settingsContainer.appendChild(explanationsGroup);

        // Time limit field
        const timeLimitGroup = document.createElement('div');
        timeLimitGroup.className = 'form-group';
        timeLimitGroup.innerHTML = `
            <label for="time-limit" class="form-label">Time Limit (minutes)</label>
            <input 
                type="number" 
                id="time-limit" 
                name="time-limit"
                class="form-input" 
                placeholder="No time limit"
                min="1"
                max="300"
                value="${this.currentQuiz.settings.timeLimit || ''}"
            />
            <small class="form-help">Leave empty for no time limit</small>
        `;
        settingsContainer.appendChild(timeLimitGroup);
    }

    /**
     * Render questions list
     */
    renderQuestions() {
        const questionsContainer = this.container.querySelector('#questions-container');
        
        // Clear existing content
        questionsContainer.innerHTML = '';

        if (this.currentQuiz.questions.length === 0) {
            questionsContainer.innerHTML = `
                <div class="empty-questions">
                    <p>No questions added yet. Click "Add Question" to get started.</p>
                </div>
            `;
            return;
        }

        // Render each question
        this.currentQuiz.questions.forEach((question, index) => {
            const questionElement = this.createQuestionElement(question, index);
            questionsContainer.appendChild(questionElement);
        });
    }

    /**
     * Create a question element for display
     * @param {Object} question - Question object
     * @param {number} index - Question index
     * @returns {HTMLElement} Question element
     */
    createQuestionElement(question, index) {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-item';
        questionDiv.dataset.questionIndex = index;

        const typeLabel = this.getQuestionTypeLabel(question.type);
        const preview = this.getQuestionPreview(question);

        questionDiv.innerHTML = `
            <div class="question-header">
                <div class="question-info">
                    <span class="question-number">${index + 1}</span>
                    <span class="question-type">${typeLabel}</span>
                </div>
                <div class="question-actions">
                    <button class="btn btn-small btn-secondary edit-question" data-index="${index}">
                        Edit
                    </button>
                    <button class="btn btn-small btn-error delete-question" data-index="${index}">
                        Delete
                    </button>
                </div>
            </div>
            <div class="question-preview">
                ${preview}
            </div>
        `;

        return questionDiv;
    }

    /**
     * Get human-readable question type label
     * @param {string} type - Question type
     * @returns {string} Type label
     */
    getQuestionTypeLabel(type) {
        const labels = {
            [QUESTION_TYPES.MCQ_SINGLE]: 'Multiple Choice (Single)',
            [QUESTION_TYPES.MCQ_MULTIPLE]: 'Multiple Choice (Multiple)',
            [QUESTION_TYPES.TEXT_INPUT]: 'Text Input'
        };
        return labels[type] || 'Unknown';
    }

    /**
     * Get question preview text
     * @param {Object} question - Question object
     * @returns {string} Preview HTML
     */
    getQuestionPreview(question) {
        let preview = `<strong>Q:</strong> ${question.question}`;
        
        if (question.type === QUESTION_TYPES.MCQ_SINGLE || question.type === QUESTION_TYPES.MCQ_MULTIPLE) {
            const optionsPreview = question.options.slice(0, 2).join(', ');
            const moreOptions = question.options.length > 2 ? ` (+${question.options.length - 2} more)` : '';
            preview += `<br><small><strong>Options:</strong> ${optionsPreview}${moreOptions}</small>`;
        } else if (question.type === QUESTION_TYPES.TEXT_INPUT) {
            preview += `<br><small><strong>Answer:</strong> ${question.correctAnswer}</small>`;
        }

        return preview;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Save quiz button
        const saveButton = this.container.querySelector('#save-quiz');
        if (saveButton) {
            saveButton.addEventListener('click', () => this.saveQuiz());
        }

        // Cancel button
        const cancelButton = this.container.querySelector('#cancel-quiz');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => this.cancel());
        }

        // Add question button
        const addQuestionButton = this.container.querySelector('#add-question');
        if (addQuestionButton) {
            addQuestionButton.addEventListener('click', () => this.addQuestion());
        }

        // Question actions (edit/delete)
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-question')) {
                const index = parseInt(e.target.dataset.index);
                this.editQuestion(index);
            } else if (e.target.classList.contains('delete-question')) {
                const index = parseInt(e.target.dataset.index);
                this.deleteQuestion(index);
            }
        });

        // Form field changes
        this.container.addEventListener('input', (e) => {
            this.updateQuizFromForm();
        });

        this.container.addEventListener('change', (e) => {
            this.updateQuizFromForm();
        });
    }

    /**
     * Update quiz object from form values
     */
    updateQuizFromForm() {
        // Update title
        const titleInput = this.container.querySelector('#quiz-title');
        if (titleInput) {
            this.currentQuiz.title = titleInput.value.trim();
        }

        // Update description
        const descriptionInput = this.container.querySelector('#quiz-description');
        if (descriptionInput) {
            this.currentQuiz.description = descriptionInput.value.trim();
        }

        // Update settings
        const shuffleInput = this.container.querySelector('#shuffle-questions');
        if (shuffleInput) {
            this.currentQuiz.settings.shuffleQuestions = shuffleInput.checked;
        }

        const explanationsInput = this.container.querySelector('#show-explanations');
        if (explanationsInput) {
            this.currentQuiz.settings.showExplanations = explanationsInput.checked;
        }

        const timeLimitInput = this.container.querySelector('#time-limit');
        if (timeLimitInput) {
            const timeLimit = parseInt(timeLimitInput.value);
            this.currentQuiz.settings.timeLimit = isNaN(timeLimit) ? null : timeLimit;
        }

        // Update timestamp
        this.currentQuiz.updatedAt = new Date();
    }

    /**
     * Save the quiz
     */
    async saveQuiz() {
        try {
            // Update quiz from form
            this.updateQuizFromForm();

            // Validate quiz
            const validation = validateQuiz(this.currentQuiz);
            if (!validation.isValid) {
                this.showAlert(validation.errors.join(', '), 'error');
                return;
            }

            // Save to storage
            await this.storageManager.storeQuiz(this.currentQuiz);

            // Show success message
            this.showAlert(
                `Quiz "${this.currentQuiz.title}" ${this.isEditing ? 'updated' : 'created'} successfully!`,
                'success'
            );

            // Navigate back to dashboard after a short delay
            setTimeout(() => {
                this.navigateToDashboard();
            }, 1500);

        } catch (error) {
            console.error('Error saving quiz:', error);
            this.showAlert('Failed to save quiz: ' + error.message, 'error');
        }
    }

    /**
     * Cancel quiz creation/editing
     */
    cancel() {
        if (this.hasUnsavedChanges()) {
            if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
                this.navigateToDashboard();
            }
        } else {
            this.navigateToDashboard();
        }
    }

    /**
     * Check if there are unsaved changes
     * @returns {boolean} True if there are unsaved changes
     */
    hasUnsavedChanges() {
        // Simple check - in a real app, you might want more sophisticated change detection
        return this.currentQuiz.title.trim() !== '' || 
               this.currentQuiz.description.trim() !== '' || 
               this.currentQuiz.questions.length > 0;
    }

    /**
     * Add a new question
     */
    addQuestion() {
        this.openQuestionEditor();
    }

    /**
     * Edit an existing question
     * @param {number} index - Question index
     */
    editQuestion(index) {
        const question = this.currentQuiz.questions[index];
        if (question) {
            this.openQuestionEditor(question, index);
        }
    }

    /**
     * Open question editor modal
     * @param {Object} existingQuestion - Existing question to edit (optional)
     * @param {number} questionIndex - Question index for editing (optional)
     */
    openQuestionEditor(existingQuestion = null, questionIndex = null) {
        // Create modal container
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.innerHTML = `
            <div class="modal question-editor-modal">
                <div id="question-editor-container">
                    <!-- Question editor will be rendered here -->
                </div>
            </div>
        `;

        // Add to document
        document.body.appendChild(modalOverlay);

        // Initialize question editor
        const questionEditor = new QuestionEditor(this.storageManager);
        const editorContainer = modalOverlay.querySelector('#question-editor-container');
            
            questionEditor.init(
                editorContainer,
                existingQuestion,
                (question) => this.handleQuestionSave(question, questionIndex, modalOverlay),
                () => this.handleQuestionCancel(modalOverlay)
            );

        // Close on overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                this.handleQuestionCancel(modalOverlay);
            }
        });

        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.handleQuestionCancel(modalOverlay);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    /**
     * Handle question save
     * @param {Object} question - Saved question
     * @param {number} questionIndex - Question index (null for new question)
     * @param {HTMLElement} modalOverlay - Modal overlay element
     */
    handleQuestionSave(question, questionIndex, modalOverlay) {
        if (questionIndex !== null) {
            // Update existing question
            this.currentQuiz.questions[questionIndex] = question;
        } else {
            // Add new question
            this.currentQuiz.questions.push(question);
        }

        // Update timestamp
        this.currentQuiz.updatedAt = new Date();

        // Re-render questions
        this.renderQuestions();
        this.updateQuestionCount();

        // Close modal
        modalOverlay.remove();

        // Show success message
        this.showAlert(
            `Question ${questionIndex !== null ? 'updated' : 'added'} successfully!`,
            'success'
        );
    }

    /**
     * Handle question cancel
     * @param {HTMLElement} modalOverlay - Modal overlay element
     */
    handleQuestionCancel(modalOverlay) {
        modalOverlay.remove();
    }

    /**
     * Delete a question
     * @param {number} index - Question index
     */
    deleteQuestion(index) {
        if (confirm('Are you sure you want to delete this question?')) {
            this.currentQuiz.questions.splice(index, 1);
            this.currentQuiz.updatedAt = new Date();
            this.renderQuestions();
            this.updateQuestionCount();
        }
    }

    /**
     * Update question count in header
     */
    updateQuestionCount() {
        const header = this.container.querySelector('.questions-header h3');
        if (header) {
            header.textContent = `Questions (${this.currentQuiz.questions.length})`;
        }
    }

    /**
     * Show alert message
     * @param {string} message - Alert message
     * @param {string} type - Alert type (success, error, warning, info)
     */
    showAlert(message, type = 'info') {
        const alertsContainer = this.container.querySelector('#alerts-container');
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
     * Navigate back to dashboard
     */
    navigateToDashboard() {
        // Emit event to navigate back
        const event = new CustomEvent('navigate', {
            detail: { view: 'dashboard' }
        });
        window.dispatchEvent(event);
    }

    /**
     * Load an existing quiz for editing
     * @param {string} quizId - Quiz ID to load
     */
    async loadQuiz(quizId) {
        try {
            const quiz = await this.storageManager.getQuiz(quizId);
            if (quiz) {
                this.currentQuiz = quiz;
                this.isEditing = true;
                this.render();
                this.attachEventListeners();
            } else {
                throw new Error('Quiz not found');
            }
        } catch (error) {
            console.error('Error loading quiz:', error);
            this.showAlert('Failed to load quiz: ' + error.message, 'error');
        }
    }
}