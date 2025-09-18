/**
 * Quiz Creator Component
 * Handles the creation and editing of quizzes with metadata and questions
 */

import { createFormGroup, createButton, createAlert } from './Layout.js';
import { QUESTION_TYPES } from '../models/types.js';
import { validateQuiz } from '../models/validation.js';
import { StorageManager } from '../services/StorageManager.js';
import { QuestionEditor } from './QuestionEditor.js';
import { AIQuizGenerator } from '../services/AIQuizGenerator.js';
import { PDFProcessor } from '../services/PDFProcessor.js';
import { QuizReviewEditor } from './QuizReviewEditor.js';

export class QuizCreator {
    constructor(storageManager = null) {
        this.storageManager = storageManager || new StorageManager();
        this.aiQuizGenerator = new AIQuizGenerator();
        this.pdfProcessor = new PDFProcessor();
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
                            <div class="questions-actions">
                                <div class="ai-generation-buttons">
                                    <button id="generate-from-text" class="btn btn-primary ai-generate-btn">
                                        <span class="btn-icon">🤖</span>
                                        Generate from Text
                                    </button>
                                    <button id="generate-from-pdf" class="btn btn-primary ai-generate-btn">
                                        <span class="btn-icon">📄</span>
                                        Generate from PDF
                                    </button>
                                </div>
                                <button id="add-question" class="btn btn-success">Add Question</button>
                            </div>
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

        // AI generation buttons
        const generateFromTextButton = this.container.querySelector('#generate-from-text');
        if (generateFromTextButton) {
            generateFromTextButton.addEventListener('click', () => this.openTextGenerationModal());
        }

        const generateFromPdfButton = this.container.querySelector('#generate-from-pdf');
        if (generateFromPdfButton) {
            generateFromPdfButton.addEventListener('click', () => this.openPdfGenerationModal());
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
     * Open text-based AI generation modal
     */
    openTextGenerationModal() {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.innerHTML = `
            <div class="modal ai-generation-modal">
                <div class="modal-header">
                    <h3 class="modal-title">Generate Quiz from Text</h3>
                    <button class="modal-close" type="button">&times;</button>
                </div>
                <div class="modal-content">
                    <div class="form-group">
                        <label for="source-text" class="form-label">Source Text</label>
                        <div class="text-input-container">
                            <textarea 
                                id="source-text" 
                                class="form-input text-input-area" 
                                placeholder="Paste your text content here..."
                                rows="8"
                                required
                            ></textarea>
                            <div class="text-input-stats">
                                <span class="character-count">0 characters</span>
                                <span class="word-count">0 words</span>
                            </div>
                        </div>
                        <small class="form-help">Paste the text content you want to generate quiz questions from. Minimum 50 characters required.</small>
                    </div>
                    
                    <div class="text-preview-section" style="display: none;">
                        <h4>Content Preview</h4>
                        <div class="text-preview">
                            <div class="preview-content"></div>
                            <div class="preview-stats">
                                <span class="estimated-questions">Estimated questions: 0</span>
                            </div>
                        </div>
                    </div>
                    
                    ${this.renderGenerationOptions()}
                    
                    <!-- Progress Section -->
                    <div class="generation-progress" style="display: none;">
                        <div class="progress-header">
                            <h4>Generating Quiz...</h4>
                            <div class="progress-spinner"></div>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                        <div class="progress-status">Analyzing content...</div>
                    </div>
                    
                    <!-- Error Display -->
                    <div class="generation-error" style="display: none;">
                        <div class="error-content">
                            <div class="error-icon">⚠️</div>
                            <div class="error-message"></div>
                            <div class="error-suggestions"></div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="cancel-text-generation" class="btn btn-secondary">Cancel</button>
                    <button id="generate-text-quiz" class="btn btn-primary" disabled>Generate Quiz</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);
        this.attachTextGenerationListeners(modalOverlay);
    }

    /**
     * Open PDF-based AI generation modal
     */
    openPdfGenerationModal() {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.innerHTML = `
            <div class="modal ai-generation-modal">
                <div class="modal-header">
                    <h3 class="modal-title">Generate Quiz from PDF</h3>
                    <button class="modal-close" type="button">&times;</button>
                </div>
                <div class="modal-content">
                    <div class="form-group">
                        <label for="pdf-file" class="form-label">PDF File</label>
                        <div class="file-upload-area" id="pdf-upload-area">
                            <input 
                                type="file" 
                                id="pdf-file" 
                                class="file-input" 
                                accept=".pdf"
                                hidden
                            />
                            <div class="file-upload-content">
                                <div class="file-upload-icon">📄</div>
                                <div class="file-upload-text">
                                    <p><strong>Click to select a PDF file</strong> or drag and drop</p>
                                    <p class="file-upload-hint">Maximum file size: 10MB</p>
                                </div>
                            </div>
                            <div class="file-upload-selected" style="display: none;">
                                <div class="selected-file-info">
                                    <span class="selected-file-name"></span>
                                    <button type="button" class="remove-file-btn">&times;</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    ${this.renderGenerationOptions()}
                </div>
                <div class="modal-footer">
                    <button id="cancel-pdf-generation" class="btn btn-secondary">Cancel</button>
                    <button id="generate-pdf-quiz" class="btn btn-primary" disabled>Generate Quiz</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);
        this.attachPdfGenerationListeners(modalOverlay);
    }

    /**
     * Render generation options form
     * @returns {string} HTML for generation options
     */
    renderGenerationOptions() {
        return `
            <div class="generation-options">
                <h4>Generation Options</h4>
                
                <div class="form-group">
                    <label for="question-count" class="form-label">Number of Questions</label>
                    <input 
                        type="number" 
                        id="question-count" 
                        class="form-input" 
                        min="1" 
                        max="20" 
                        value="5"
                        required
                    />
                    <small class="form-help">Generate between 1 and 20 questions</small>
                </div>

                <div class="form-group">
                    <label for="difficulty-level" class="form-label">Difficulty Level</label>
                    <select id="difficulty-level" class="form-input">
                        <option value="mixed">Mixed Difficulty</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Question Types</label>
                    <div class="checkbox-group">
                        <label class="checkbox-label">
                            <input type="checkbox" name="question-types" value="mcq-single" checked>
                            <span class="checkbox-text">Multiple Choice (Single Answer)</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="question-types" value="mcq-multiple">
                            <span class="checkbox-text">Multiple Choice (Multiple Answers)</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="question-types" value="text-input">
                            <span class="checkbox-text">Text Input</span>
                        </label>
                    </div>
                    <small class="form-help">Select at least one question type</small>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners for text generation modal
     * @param {HTMLElement} modalOverlay - Modal overlay element
     */
    attachTextGenerationListeners(modalOverlay) {
        const closeBtn = modalOverlay.querySelector('.modal-close');
        const cancelBtn = modalOverlay.querySelector('#cancel-text-generation');
        const generateBtn = modalOverlay.querySelector('#generate-text-quiz');
        const textArea = modalOverlay.querySelector('#source-text');
        const characterCount = modalOverlay.querySelector('.character-count');
        const wordCount = modalOverlay.querySelector('.word-count');
        const previewSection = modalOverlay.querySelector('.text-preview-section');
        const previewContent = modalOverlay.querySelector('.preview-content');
        const estimatedQuestions = modalOverlay.querySelector('.estimated-questions');

        // Close modal handlers
        const closeModal = () => modalOverlay.remove();
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });

        // Generate quiz handler
        generateBtn.addEventListener('click', () => {
            this.handleTextGeneration(modalOverlay);
        });

        // Text input handler with preview and validation
        textArea.addEventListener('input', () => {
            this.updateTextInputStats(textArea, characterCount, wordCount, generateBtn);
            this.updateTextPreview(textArea, previewSection, previewContent, estimatedQuestions);
        });

        // Question count change handler
        const questionCountInput = modalOverlay.querySelector('#question-count');
        questionCountInput.addEventListener('input', () => {
            this.updateEstimatedQuestions(textArea, estimatedQuestions);
        });

        // Initial state
        generateBtn.disabled = true;
        
        // Focus on text area
        setTimeout(() => textArea.focus(), 100);
    }

    /**
     * Attach event listeners for PDF generation modal
     * @param {HTMLElement} modalOverlay - Modal overlay element
     */
    attachPdfGenerationListeners(modalOverlay) {
        const closeBtn = modalOverlay.querySelector('.modal-close');
        const cancelBtn = modalOverlay.querySelector('#cancel-pdf-generation');
        const generateBtn = modalOverlay.querySelector('#generate-pdf-quiz');
        const fileInput = modalOverlay.querySelector('#pdf-file');
        const uploadArea = modalOverlay.querySelector('#pdf-upload-area');
        const uploadContent = modalOverlay.querySelector('.file-upload-content');
        const selectedContent = modalOverlay.querySelector('.file-upload-selected');
        const selectedFileName = modalOverlay.querySelector('.selected-file-name');
        const removeFileBtn = modalOverlay.querySelector('.remove-file-btn');

        // Close modal handlers
        const closeModal = () => modalOverlay.remove();
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });

        // File upload handlers
        uploadArea.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFileSelection(file, uploadContent, selectedContent, selectedFileName, generateBtn);
            }
        });

        // Drag and drop handlers
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type === 'application/pdf') {
                fileInput.files = e.dataTransfer.files;
                this.handleFileSelection(file, uploadContent, selectedContent, selectedFileName, generateBtn);
            }
        });

        // Remove file handler
        removeFileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.value = '';
            uploadContent.style.display = 'block';
            selectedContent.style.display = 'none';
            generateBtn.disabled = true;
        });

        // Generate quiz handler
        generateBtn.addEventListener('click', () => {
            this.handlePdfGeneration(modalOverlay);
        });
    }

    /**
     * Handle file selection for PDF upload
     * @param {File} file - Selected file
     * @param {HTMLElement} uploadContent - Upload content element
     * @param {HTMLElement} selectedContent - Selected content element
     * @param {HTMLElement} selectedFileName - File name element
     * @param {HTMLElement} generateBtn - Generate button
     */
    handleFileSelection(file, uploadContent, selectedContent, selectedFileName, generateBtn) {
        const validation = this.pdfProcessor.validateFile(file);
        
        if (!validation.success) {
            this.showAlert(validation.message, 'error');
            return;
        }

        uploadContent.style.display = 'none';
        selectedContent.style.display = 'block';
        selectedFileName.textContent = `${file.name} (${this.formatFileSize(file.size)})`;
        generateBtn.disabled = false;
    }

    /**
     * Format file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Handle text-based quiz generation
     * @param {HTMLElement} modalOverlay - Modal overlay element
     */
    async handleTextGeneration(modalOverlay) {
        const textArea = modalOverlay.querySelector('#source-text');
        const generateBtn = modalOverlay.querySelector('#generate-text-quiz');
        const progressSection = modalOverlay.querySelector('.generation-progress');
        const errorSection = modalOverlay.querySelector('.generation-error');
        const modalContent = modalOverlay.querySelector('.modal-content');
        
        const text = textArea.value.trim();
        if (text.length < 50) {
            this.showGenerationError(modalOverlay, 'Content too short', 
                'Please provide at least 50 characters of text content.',
                ['Try adding more detailed content', 'Include examples or explanations']);
            return;
        }

        const options = this.getGenerationOptions(modalOverlay);
        if (!options) return;

        try {
            // Hide error section and show progress
            errorSection.style.display = 'none';
            progressSection.style.display = 'block';
            generateBtn.disabled = true;
            
            // Disable form inputs during generation
            this.toggleFormInputs(modalOverlay, false);
            
            // Start progress animation
            this.startGenerationProgress(modalOverlay);

            const result = await this.aiQuizGenerator.generateQuestions(text, options);
            
            if (result.success && result.questions.length > 0) {
                this.completeGenerationProgress(modalOverlay);
                setTimeout(() => {
                    this.handleGenerationSuccess(result, modalOverlay);
                }, 500); // Brief delay to show completion
            } else {
                throw new Error(result.error || 'No questions were generated');
            }
        } catch (error) {
            console.error('Text generation error:', error);
            this.handleGenerationError(modalOverlay, error);
        }
    }

    /**
     * Handle PDF-based quiz generation
     * @param {HTMLElement} modalOverlay - Modal overlay element
     */
    async handlePdfGeneration(modalOverlay) {
        const fileInput = modalOverlay.querySelector('#pdf-file');
        const generateBtn = modalOverlay.querySelector('#generate-pdf-quiz');
        const progressSection = modalOverlay.querySelector('.generation-progress');
        const errorSection = modalOverlay.querySelector('.generation-error');
        
        const file = fileInput.files[0];
        if (!file) {
            this.showGenerationError(modalOverlay, 'No File Selected', 
                'Please select a PDF file to generate quiz from.',
                ['Click the upload area to select a file', 'Drag and drop a PDF file']);
            return;
        }

        const options = this.getGenerationOptions(modalOverlay);
        if (!options) return;

        try {
            // Hide error section and show progress
            errorSection.style.display = 'none';
            progressSection.style.display = 'block';
            generateBtn.disabled = true;
            
            // Disable form inputs during generation
            this.toggleFormInputs(modalOverlay, false);
            
            // Start progress animation for PDF processing
            this.startPdfGenerationProgress(modalOverlay);

            // Extract text from PDF with progress updates
            const extractionResult = await this.extractPdfWithProgress(file, modalOverlay);
            
            if (!extractionResult.success) {
                throw new Error(extractionResult.error);
            }

            // Validate extracted text
            if (!extractionResult.text || extractionResult.text.trim().length < 50) {
                throw new Error('PDF does not contain enough readable text. Please try a different PDF with more text content.');
            }

            // Update progress for AI generation phase
            this.updatePdfProgressStatus(modalOverlay, 'Generating questions with AI...');

            // Generate questions from extracted text
            const result = await this.aiQuizGenerator.generateQuestions(extractionResult.text, options);
            
            if (result.success && result.questions.length > 0) {
                this.completePdfGenerationProgress(modalOverlay);
                setTimeout(() => {
                    this.handleGenerationSuccess(result, modalOverlay);
                }, 500); // Brief delay to show completion
            } else {
                throw new Error(result.error || 'No questions were generated from the PDF content');
            }
        } catch (error) {
            console.error('PDF generation error:', error);
            this.handlePdfGenerationError(modalOverlay, error);
        }
    }

    /**
     * Get generation options from modal form
     * @param {HTMLElement} modalOverlay - Modal overlay element
     * @returns {Object|null} Generation options or null if invalid
     */
    getGenerationOptions(modalOverlay) {
        const questionCount = parseInt(modalOverlay.querySelector('#question-count').value);
        const difficulty = modalOverlay.querySelector('#difficulty-level').value;
        const questionTypeCheckboxes = modalOverlay.querySelectorAll('input[name="question-types"]:checked');
        
        if (questionCount < 1 || questionCount > 20) {
            this.showAlert('Question count must be between 1 and 20.', 'error');
            return null;
        }

        if (questionTypeCheckboxes.length === 0) {
            this.showAlert('Please select at least one question type.', 'error');
            return null;
        }

        const questionTypes = Array.from(questionTypeCheckboxes).map(cb => cb.value);

        return {
            questionCount,
            difficulty,
            questionTypes
        };
    }

    /**
     * Handle successful quiz generation
     * @param {Object} result - Generation result
     * @param {HTMLElement} modalOverlay - Modal overlay element
     */
    handleGenerationSuccess(result, modalOverlay) {
        // Close generation modal
        modalOverlay.remove();

        // Open quiz review interface
        this.openQuizReviewInterface(result.questions);
    }

    /**
     * Update text input statistics and validation
     * @param {HTMLElement} textArea - Text area element
     * @param {HTMLElement} characterCount - Character count element
     * @param {HTMLElement} wordCount - Word count element
     * @param {HTMLElement} generateBtn - Generate button element
     */
    updateTextInputStats(textArea, characterCount, wordCount, generateBtn) {
        const text = textArea.value;
        const charCount = text.length;
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        const wordCountNum = text.trim() === '' ? 0 : words.length;
        
        // Update display
        characterCount.textContent = `${charCount} characters`;
        wordCount.textContent = `${wordCountNum} words`;
        
        // Update button state and styling
        const isValid = charCount >= 50;
        generateBtn.disabled = !isValid;
        
        // Add visual feedback
        textArea.classList.toggle('input-valid', isValid && charCount > 0);
        textArea.classList.toggle('input-invalid', charCount > 0 && !isValid);
        
        // Update character count styling
        characterCount.classList.toggle('count-valid', isValid);
        characterCount.classList.toggle('count-invalid', charCount > 0 && !isValid);
    }

    /**
     * Update text preview and estimated questions
     * @param {HTMLElement} textArea - Text area element
     * @param {HTMLElement} previewSection - Preview section element
     * @param {HTMLElement} previewContent - Preview content element
     * @param {HTMLElement} estimatedQuestions - Estimated questions element
     */
    updateTextPreview(textArea, previewSection, previewContent, estimatedQuestions) {
        const text = textArea.value.trim();
        
        if (text.length >= 50) {
            previewSection.style.display = 'block';
            
            // Show preview (first 200 characters)
            const preview = text.length > 200 ? text.substring(0, 200) + '...' : text;
            previewContent.textContent = preview;
            
            this.updateEstimatedQuestions(textArea, estimatedQuestions);
        } else {
            previewSection.style.display = 'none';
        }
    }

    /**
     * Update estimated questions count
     * @param {HTMLElement} textArea - Text area element
     * @param {HTMLElement} estimatedQuestions - Estimated questions element
     */
    updateEstimatedQuestions(textArea, estimatedQuestions) {
        const text = textArea.value.trim();
        const questionCountInput = document.querySelector('#question-count');
        const requestedCount = parseInt(questionCountInput?.value || 5);
        
        // Simple estimation based on text length and complexity
        const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
        
        // Estimate based on content density
        let estimatedMax = Math.floor(wordCount / 50); // Rough estimate: 1 question per 50 words
        estimatedMax = Math.max(1, Math.min(20, estimatedMax));
        
        const actualEstimate = Math.min(requestedCount, estimatedMax);
        
        estimatedQuestions.textContent = `Estimated questions: ${actualEstimate} (max possible: ${estimatedMax})`;
        estimatedQuestions.classList.toggle('estimate-warning', requestedCount > estimatedMax);
    }

    /**
     * Start generation progress animation
     * @param {HTMLElement} modalOverlay - Modal overlay element
     */
    startGenerationProgress(modalOverlay) {
        const progressFill = modalOverlay.querySelector('.progress-fill');
        const progressStatus = modalOverlay.querySelector('.progress-status');
        
        const steps = [
            { progress: 20, status: 'Analyzing content...' },
            { progress: 40, status: 'Processing with AI...' },
            { progress: 60, status: 'Generating questions...' },
            { progress: 80, status: 'Validating questions...' },
            { progress: 95, status: 'Finalizing...' }
        ];
        
        let currentStep = 0;
        
        const updateProgress = () => {
            if (currentStep < steps.length) {
                const step = steps[currentStep];
                progressFill.style.width = `${step.progress}%`;
                progressStatus.textContent = step.status;
                currentStep++;
                
                // Random delay between steps to simulate real processing
                setTimeout(updateProgress, 800 + Math.random() * 400);
            }
        };
        
        updateProgress();
    }

    /**
     * Complete generation progress animation
     * @param {HTMLElement} modalOverlay - Modal overlay element
     */
    completeGenerationProgress(modalOverlay) {
        const progressFill = modalOverlay.querySelector('.progress-fill');
        const progressStatus = modalOverlay.querySelector('.progress-status');
        
        progressFill.style.width = '100%';
        progressStatus.textContent = 'Complete!';
        
        // Add success styling
        progressFill.classList.add('progress-success');
    }

    /**
     * Handle generation errors with detailed feedback
     * @param {HTMLElement} modalOverlay - Modal overlay element
     * @param {Error} error - Error object
     */
    handleGenerationError(modalOverlay, error) {
        const progressSection = modalOverlay.querySelector('.generation-progress');
        const generateBtn = modalOverlay.querySelector('#generate-text-quiz');
        
        // Hide progress
        progressSection.style.display = 'none';
        
        // Re-enable form
        this.toggleFormInputs(modalOverlay, true);
        generateBtn.disabled = false;
        
        // Show detailed error
        let errorTitle = 'Generation Failed';
        let errorMessage = error.message || 'An unexpected error occurred';
        let suggestions = [];
        
        // Provide specific error handling and suggestions
        if (error.message.includes('API key')) {
            errorTitle = 'API Key Issue';
            errorMessage = 'AI service is not properly configured';
            suggestions = [
                'Check your API key in settings',
                'Ensure you have sufficient API credits',
                'Try again in a few minutes'
            ];
        } else if (error.message.includes('quota') || error.message.includes('limit')) {
            errorTitle = 'Usage Limit Reached';
            errorMessage = 'You have reached your API usage limit';
            suggestions = [
                'Wait for your quota to reset',
                'Consider upgrading your API plan',
                'Try generating fewer questions'
            ];
        } else if (error.message.includes('content') || error.message.includes('text')) {
            errorTitle = 'Content Issue';
            errorMessage = 'The provided text could not be processed';
            suggestions = [
                'Try different content or add more detail',
                'Remove special characters or formatting',
                'Ensure the text is in a supported language'
            ];
        } else if (error.message.includes('network') || error.message.includes('connection')) {
            errorTitle = 'Connection Error';
            errorMessage = 'Unable to connect to AI service';
            suggestions = [
                'Check your internet connection',
                'Try again in a few moments',
                'Contact support if the issue persists'
            ];
        }
        
        this.showGenerationError(modalOverlay, errorTitle, errorMessage, suggestions);
    }

    /**
     * Show generation error with suggestions
     * @param {HTMLElement} modalOverlay - Modal overlay element
     * @param {string} title - Error title
     * @param {string} message - Error message
     * @param {Array} suggestions - Array of suggestion strings
     */
    showGenerationError(modalOverlay, title, message, suggestions = []) {
        const errorSection = modalOverlay.querySelector('.generation-error');
        const errorMessage = modalOverlay.querySelector('.error-message');
        const errorSuggestions = modalOverlay.querySelector('.error-suggestions');
        
        errorMessage.innerHTML = `<strong>${title}</strong><br>${message}`;
        
        if (suggestions.length > 0) {
            errorSuggestions.innerHTML = `
                <strong>Suggestions:</strong>
                <ul>
                    ${suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                </ul>
            `;
        } else {
            errorSuggestions.innerHTML = '';
        }
        
        errorSection.style.display = 'block';
    }

    /**
     * Toggle form inputs enabled/disabled state
     * @param {HTMLElement} modalOverlay - Modal overlay element
     * @param {boolean} enabled - Whether inputs should be enabled
     */
    toggleFormInputs(modalOverlay, enabled) {
        const inputs = modalOverlay.querySelectorAll('input, textarea, select, button:not(.modal-close)');
        inputs.forEach(input => {
            input.disabled = !enabled;
        });
    }

    /**
     * Extract PDF with progress tracking
     * @param {File} file - PDF file to extract
     * @param {HTMLElement} modalOverlay - Modal overlay element
     * @returns {Promise<Object>} - Extraction result
     */
    async extractPdfWithProgress(file, modalOverlay) {
        const progressStatus = modalOverlay.querySelector('.progress-status');
        const progressFill = modalOverlay.querySelector('.progress-fill');
        
        try {
            // Update progress: Starting extraction
            progressStatus.textContent = 'Reading PDF file...';
            progressFill.style.width = '10%';
            
            // Small delay to show progress update
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Update progress: Processing pages
            progressStatus.textContent = 'Processing PDF pages...';
            progressFill.style.width = '30%';
            
            // Extract text from PDF
            const result = await this.pdfProcessor.extractText(file);
            
            if (!result.success) {
                throw new Error(result.error);
            }
            
            // Update progress: Text extraction complete
            progressStatus.textContent = 'Text extraction complete...';
            progressFill.style.width = '50%';
            
            // Small delay to show completion
            await new Promise(resolve => setTimeout(resolve, 200));
            
            return result;
            
        } catch (error) {
            console.error('PDF extraction error:', error);
            return {
                success: false,
                error: error.message || 'Failed to extract text from PDF'
            };
        }
    }

    /**
     * Start PDF generation progress animation
     * @param {HTMLElement} modalOverlay - Modal overlay element
     */
    startPdfGenerationProgress(modalOverlay) {
        const progressFill = modalOverlay.querySelector('.progress-fill');
        const progressStatus = modalOverlay.querySelector('.progress-status');
        
        // Reset progress
        progressFill.style.width = '0%';
        progressStatus.textContent = 'Preparing PDF processing...';
        
        // Add PDF-specific styling
        progressFill.classList.remove('progress-success');
        progressFill.classList.add('progress-pdf');
    }

    /**
     * Update PDF progress status
     * @param {HTMLElement} modalOverlay - Modal overlay element
     * @param {string} status - Status message
     */
    updatePdfProgressStatus(modalOverlay, status) {
        const progressStatus = modalOverlay.querySelector('.progress-status');
        const progressFill = modalOverlay.querySelector('.progress-fill');
        
        progressStatus.textContent = status;
        progressFill.style.width = '70%';
    }

    /**
     * Complete PDF generation progress
     * @param {HTMLElement} modalOverlay - Modal overlay element
     */
    completePdfGenerationProgress(modalOverlay) {
        const progressFill = modalOverlay.querySelector('.progress-fill');
        const progressStatus = modalOverlay.querySelector('.progress-status');
        
        progressFill.style.width = '100%';
        progressStatus.textContent = 'PDF processing complete!';
        
        // Add success styling
        progressFill.classList.remove('progress-pdf');
        progressFill.classList.add('progress-success');
    }

    /**
     * Handle PDF generation errors
     * @param {HTMLElement} modalOverlay - Modal overlay element
     * @param {Error} error - Error object
     */
    handlePdfGenerationError(modalOverlay, error) {
        const progressSection = modalOverlay.querySelector('.generation-progress');
        const generateBtn = modalOverlay.querySelector('#generate-pdf-quiz');
        
        // Hide progress
        progressSection.style.display = 'none';
        
        // Re-enable form
        this.toggleFormInputs(modalOverlay, true);
        generateBtn.disabled = false;
        
        // Show detailed error
        let errorTitle = 'PDF Processing Failed';
        let errorMessage = error.message || 'An unexpected error occurred while processing the PDF';
        let suggestions = [];
        
        // Provide specific error handling and suggestions
        if (error.message.includes('File must be a PDF')) {
            errorTitle = 'Invalid File Type';
            errorMessage = 'Please select a valid PDF file';
            suggestions = [
                'Ensure the file has a .pdf extension',
                'Try converting your document to PDF format',
                'Check that the file is not corrupted'
            ];
        } else if (error.message.includes('File size must be less than')) {
            errorTitle = 'File Too Large';
            errorMessage = 'PDF file exceeds the 10MB size limit';
            suggestions = [
                'Try compressing the PDF file',
                'Split large documents into smaller files',
                'Remove unnecessary images or content'
            ];
        } else if (error.message.includes('not contain enough readable text')) {
            errorTitle = 'Insufficient Text Content';
            errorMessage = 'The PDF does not contain enough readable text to generate questions';
            suggestions = [
                'Ensure the PDF contains text (not just images)',
                'Try a PDF with more detailed content',
                'Check if the PDF is text-searchable'
            ];
        } else if (error.message.includes('Failed to extract text')) {
            errorTitle = 'Text Extraction Failed';
            errorMessage = 'Unable to extract text from the PDF file';
            suggestions = [
                'Try a different PDF file',
                'Ensure the PDF is not password-protected',
                'Check if the PDF contains selectable text'
            ];
        } else if (error.message.includes('API key')) {
            errorTitle = 'AI Service Configuration';
            errorMessage = 'AI service is not properly configured';
            suggestions = [
                'Check your API key in settings',
                'Ensure you have sufficient API credits',
                'Try again in a few minutes'
            ];
        } else if (error.message.includes('quota') || error.message.includes('limit')) {
            errorTitle = 'Usage Limit Reached';
            errorMessage = 'You have reached your API usage limit';
            suggestions = [
                'Wait for your quota to reset',
                'Consider upgrading your API plan',
                'Try with a shorter document'
            ];
        } else if (error.message.includes('network') || error.message.includes('connection')) {
            errorTitle = 'Connection Error';
            errorMessage = 'Unable to connect to AI service';
            suggestions = [
                'Check your internet connection',
                'Try again in a few moments',
                'Contact support if the issue persists'
            ];
        } else {
            suggestions = [
                'Try with a different PDF file',
                'Ensure the PDF contains readable text',
                'Check your internet connection',
                'Contact support if the issue persists'
            ];
        }
        
        this.showGenerationError(modalOverlay, errorTitle, errorMessage, suggestions);
    }

    /**
     * Open quiz review interface
     * @param {Array} generatedQuestions - Generated questions to review
     */
    openQuizReviewInterface(generatedQuestions) {
        // Create modal container for review interface
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay quiz-review-modal-overlay';
        modalOverlay.innerHTML = `
            <div class="modal quiz-review-modal">
                <div id="quiz-review-container">
                    <!-- Quiz review editor will be rendered here -->
                </div>
            </div>
        `;

        // Add to document
        document.body.appendChild(modalOverlay);

        // Initialize quiz review editor
        const quizReviewEditor = new QuizReviewEditor();
        const reviewContainer = modalOverlay.querySelector('#quiz-review-container');
        
        quizReviewEditor.init(
            reviewContainer,
            generatedQuestions,
            (approvedQuestions) => this.handleQuizReviewSave(approvedQuestions, modalOverlay),
            () => this.handleQuizReviewCancel(modalOverlay)
        );

        // Prevent closing on overlay click for review interface
        // Users should use the Cancel button to close
    }

    /**
     * Handle quiz review save
     * @param {Array} approvedQuestions - Questions approved by user
     * @param {HTMLElement} modalOverlay - Modal overlay element
     */
    handleQuizReviewSave(approvedQuestions, modalOverlay) {
        // Add approved questions to current quiz
        this.currentQuiz.questions.push(...approvedQuestions);
        this.currentQuiz.updatedAt = new Date();

        // Re-render questions
        this.renderQuestions();
        this.updateQuestionCount();

        // Close modal
        modalOverlay.remove();

        // Show success message
        this.showAlert(
            `Successfully added ${approvedQuestions.length} question${approvedQuestions.length === 1 ? '' : 's'} to your quiz!`,
            'success'
        );
    }

    /**
     * Handle quiz review cancel
     * @param {HTMLElement} modalOverlay - Modal overlay element
     */
    handleQuizReviewCancel(modalOverlay) {
        // Close modal without adding questions
        modalOverlay.remove();
        
        // Show info message
        this.showAlert('Quiz generation cancelled. No questions were added.', 'info');
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