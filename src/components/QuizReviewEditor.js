/**
 * Quiz Review and Edit Interface
 * Allows users to review, edit, and manage AI-generated questions before saving
 */

import { createButton, createAlert } from './Layout.js';
import { QUESTION_TYPES } from '../models/types.js';
import { validateQuestion } from '../models/validation.js';
import { QuestionEditor } from './QuestionEditor.js';

export class QuizReviewEditor {
    constructor() {
        this.questions = [];
        this.selectedQuestions = new Set();
        this.container = null;
        this.onSave = null;
        this.onCancel = null;
        this.hasUnsavedChanges = false;
    }

    /**
     * Initialize the quiz review editor
     * @param {HTMLElement} container - Container element
     * @param {Array} questions - Generated questions to review
     * @param {Function} onSave - Callback when questions are saved
     * @param {Function} onCancel - Callback when review is cancelled
     */
    init(container, questions, onSave, onCancel) {
        this.container = container;
        this.questions = [...questions]; // Create a copy to avoid mutating original
        this.onSave = onSave;
        this.onCancel = onCancel;
        this.selectedQuestions.clear();
        this.hasUnsavedChanges = false;

        this.render();
        this.attachEventListeners();
    }

    /**
     * Render the quiz review interface
     */
    render() {
        this.container.innerHTML = `
            <div class="quiz-review-editor">
                <div class="review-header">
                    <div class="review-title-section">
                        <h3>Review Generated Questions</h3>
                        <p class="review-subtitle">
                            Review and edit the AI-generated questions below. You can modify questions, 
                            delete unwanted ones, or regenerate specific questions.
                        </p>
                    </div>
                    <div class="review-stats">
                        <span class="question-count">${this.questions.length} questions</span>
                        <span class="selected-count" style="display: none;">
                            <span id="selected-count">0</span> selected
                        </span>
                    </div>
                </div>

                <div class="review-toolbar">
                    <div class="bulk-actions">
                        <button id="select-all" class="btn btn-secondary btn-small">
                            Select All
                        </button>
                        <button id="deselect-all" class="btn btn-secondary btn-small" style="display: none;">
                            Deselect All
                        </button>
                        <button id="delete-selected" class="btn btn-error btn-small" disabled>
                            Delete Selected
                        </button>
                        <button id="regenerate-selected" class="btn btn-primary btn-small" disabled>
                            Regenerate Selected
                        </button>
                    </div>
                    <div class="view-options">
                        <label class="view-toggle">
                            <input type="checkbox" id="show-explanations" checked>
                            <span>Show Explanations</span>
                        </label>
                    </div>
                </div>

                <div class="questions-list" id="questions-list">
                    <!-- Questions will be rendered here -->
                </div>

                <div class="review-actions">
                    <button id="cancel-review" class="btn btn-secondary">
                        Cancel
                    </button>
                    <button id="save-questions" class="btn btn-primary">
                        Save Questions (${this.questions.length})
                    </button>
                </div>

                <!-- Alerts container -->
                <div id="review-alerts" class="alerts-container"></div>
            </div>
        `;

        this.renderQuestions();
    }

    /**
     * Render the questions list
     */
    renderQuestions() {
        const questionsContainer = this.container.querySelector('#questions-list');
        
        if (this.questions.length === 0) {
            questionsContainer.innerHTML = `
                <div class="empty-questions">
                    <div class="empty-icon">📝</div>
                    <h4>No Questions to Review</h4>
                    <p>All questions have been removed. You can regenerate questions or cancel to go back.</p>
                </div>
            `;
            return;
        }

        questionsContainer.innerHTML = '';
        
        this.questions.forEach((question, index) => {
            const questionElement = this.createQuestionElement(question, index);
            questionsContainer.appendChild(questionElement);
        });
    }

    /**
     * Create a question element for review
     * @param {Object} question - Question object
     * @param {number} index - Question index
     * @returns {HTMLElement} Question element
     */
    createQuestionElement(question, index) {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'review-question-item';
        questionDiv.dataset.questionIndex = index;

        const isSelected = this.selectedQuestions.has(index);
        const showExplanations = this.container.querySelector('#show-explanations')?.checked ?? true;

        questionDiv.innerHTML = `
            <div class="question-header">
                <div class="question-selection">
                    <label class="checkbox-label">
                        <input type="checkbox" class="question-checkbox" 
                               data-index="${index}" ${isSelected ? 'checked' : ''}>
                        <span class="question-number">Q${index + 1}</span>
                    </label>
                </div>
                <div class="question-type-badge">
                    ${this.getQuestionTypeLabel(question.type)}
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

            <div class="question-content">
                <div class="question-text">
                    ${this.escapeHtml(question.question)}
                </div>

                <div class="question-details">
                    ${this.renderQuestionDetails(question)}
                </div>

                ${showExplanations && question.explanation ? `
                    <div class="question-explanation">
                        <strong>Explanation:</strong> ${this.escapeHtml(question.explanation)}
                    </div>
                ` : ''}
            </div>
        `;

        // Add selection styling
        if (isSelected) {
            questionDiv.classList.add('selected');
        }

        return questionDiv;
    }

    /**
     * Render question-specific details based on type
     * @param {Object} question - Question object
     * @returns {string} HTML for question details
     */
    renderQuestionDetails(question) {
        switch (question.type) {
            case QUESTION_TYPES.MCQ_SINGLE:
                return this.renderMCQDetails(question, false);
            case QUESTION_TYPES.MCQ_MULTIPLE:
                return this.renderMCQDetails(question, true);
            case QUESTION_TYPES.TEXT_INPUT:
                return this.renderTextInputDetails(question);
            default:
                return '<p class="text-muted">Unknown question type</p>';
        }
    }

    /**
     * Render multiple choice question details
     * @param {Object} question - Question object
     * @param {boolean} isMultiple - Whether multiple answers are allowed
     * @returns {string} HTML for MCQ details
     */
    renderMCQDetails(question, isMultiple) {
        const correctAnswers = isMultiple ? question.correctAnswers : [question.correctAnswer];
        
        return `
            <div class="mcq-options-preview">
                ${question.options.map((option, index) => {
                    const isCorrect = correctAnswers.includes(index);
                    return `
                        <div class="option-preview ${isCorrect ? 'correct-option' : ''}">
                            <span class="option-letter">${String.fromCharCode(65 + index)}</span>
                            <span class="option-text">${this.escapeHtml(option)}</span>
                            ${isCorrect ? '<span class="correct-indicator">✓</span>' : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    /**
     * Render text input question details
     * @param {Object} question - Question object
     * @returns {string} HTML for text input details
     */
    renderTextInputDetails(question) {
        return `
            <div class="text-input-preview">
                <div class="correct-answer">
                    <strong>Expected Answer:</strong> 
                    <span class="answer-text">${this.escapeHtml(question.correctAnswer)}</span>
                </div>
                <div class="answer-settings">
                    <span class="case-sensitivity">
                        Case ${question.caseSensitive ? 'sensitive' : 'insensitive'}
                    </span>
                </div>
            </div>
        `;
    }

    /**
     * Get human-readable question type label
     * @param {string} type - Question type
     * @returns {string} Type label
     */
    getQuestionTypeLabel(type) {
        const labels = {
            [QUESTION_TYPES.MCQ_SINGLE]: 'Multiple Choice',
            [QUESTION_TYPES.MCQ_MULTIPLE]: 'Multiple Select',
            [QUESTION_TYPES.TEXT_INPUT]: 'Text Input'
        };
        return labels[type] || 'Unknown';
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Bulk action buttons
        const selectAllBtn = this.container.querySelector('#select-all');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                this.selectAllQuestions();
            });
        }

        const deselectAllBtn = this.container.querySelector('#deselect-all');
        if (deselectAllBtn) {
            deselectAllBtn.addEventListener('click', () => {
                this.deselectAllQuestions();
            });
        }

        const deleteSelectedBtn = this.container.querySelector('#delete-selected');
        if (deleteSelectedBtn) {
            deleteSelectedBtn.addEventListener('click', () => {
                this.deleteSelectedQuestions();
            });
        }

        const regenerateSelectedBtn = this.container.querySelector('#regenerate-selected');
        if (regenerateSelectedBtn) {
            regenerateSelectedBtn.addEventListener('click', () => {
                this.regenerateSelectedQuestions();
            });
        }

        // View options
        const showExplanationsCheckbox = this.container.querySelector('#show-explanations');
        if (showExplanationsCheckbox) {
            showExplanationsCheckbox.addEventListener('change', () => {
                this.renderQuestions();
            });
        }

        // Action buttons
        const saveBtn = this.container.querySelector('#save-questions');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveQuestions();
            });
        }

        const cancelBtn = this.container.querySelector('#cancel-review');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.cancelReview();
            });
        }

        // Question-specific actions
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-question')) {
                const index = parseInt(e.target.dataset.index);
                this.editQuestion(index);
            } else if (e.target.classList.contains('delete-question')) {
                const index = parseInt(e.target.dataset.index);
                this.deleteQuestion(index);
            }
        });

        // Question selection
        this.container.addEventListener('change', (e) => {
            if (e.target.classList.contains('question-checkbox')) {
                const index = parseInt(e.target.dataset.index);
                this.toggleQuestionSelection(index);
            }
        });
    }

    /**
     * Select all questions
     */
    selectAllQuestions() {
        this.selectedQuestions.clear();
        for (let i = 0; i < this.questions.length; i++) {
            this.selectedQuestions.add(i);
        }
        this.updateSelectionUI();
        this.renderQuestions();
    }

    /**
     * Deselect all questions
     */
    deselectAllQuestions() {
        this.selectedQuestions.clear();
        this.updateSelectionUI();
        this.renderQuestions();
    }

    /**
     * Toggle question selection
     * @param {number} index - Question index
     */
    toggleQuestionSelection(index) {
        if (this.selectedQuestions.has(index)) {
            this.selectedQuestions.delete(index);
        } else {
            this.selectedQuestions.add(index);
        }
        
        this.updateSelectionUI();
        this.updateQuestionSelectionUI(index);
    }

    /**
     * Update selection-related UI elements
     */
    updateSelectionUI() {
        const selectedCount = this.selectedQuestions.size;
        const totalCount = this.questions.length;
        
        // Update selected count display
        const selectedCountElement = this.container.querySelector('#selected-count');
        const selectedCountContainer = this.container.querySelector('.selected-count');
        
        if (selectedCount > 0) {
            selectedCountElement.textContent = selectedCount;
            selectedCountContainer.style.display = 'inline';
        } else {
            selectedCountContainer.style.display = 'none';
        }

        // Update bulk action buttons
        const selectAllBtn = this.container.querySelector('#select-all');
        const deselectAllBtn = this.container.querySelector('#deselect-all');
        const deleteSelectedBtn = this.container.querySelector('#delete-selected');
        const regenerateSelectedBtn = this.container.querySelector('#regenerate-selected');

        if (selectedCount === 0) {
            selectAllBtn.style.display = 'inline-block';
            deselectAllBtn.style.display = 'none';
            deleteSelectedBtn.disabled = true;
            regenerateSelectedBtn.disabled = true;
        } else if (selectedCount === totalCount) {
            selectAllBtn.style.display = 'none';
            deselectAllBtn.style.display = 'inline-block';
            deleteSelectedBtn.disabled = false;
            regenerateSelectedBtn.disabled = false;
        } else {
            selectAllBtn.style.display = 'inline-block';
            deselectAllBtn.style.display = 'inline-block';
            deleteSelectedBtn.disabled = false;
            regenerateSelectedBtn.disabled = false;
        }
    }

    /**
     * Update UI for a specific question's selection state
     * @param {number} index - Question index
     */
    updateQuestionSelectionUI(index) {
        const questionElement = this.container.querySelector(`[data-question-index="${index}"]`);
        if (questionElement) {
            if (this.selectedQuestions.has(index)) {
                questionElement.classList.add('selected');
            } else {
                questionElement.classList.remove('selected');
            }
        }
    }

    /**
     * Delete selected questions
     */
    deleteSelectedQuestions() {
        if (this.selectedQuestions.size === 0) return;

        const selectedCount = this.selectedQuestions.size;
        const confirmMessage = selectedCount === 1 
            ? 'Are you sure you want to delete the selected question?'
            : `Are you sure you want to delete ${selectedCount} selected questions?`;

        if (!confirm(confirmMessage)) return;

        // Sort indices in descending order to avoid index shifting issues
        const sortedIndices = Array.from(this.selectedQuestions).sort((a, b) => b - a);
        
        // Remove questions
        sortedIndices.forEach(index => {
            this.questions.splice(index, 1);
        });

        // Clear selection
        this.selectedQuestions.clear();
        this.hasUnsavedChanges = true;

        // Update UI
        this.updateQuestionCount();
        this.renderQuestions();
        this.updateSelectionUI();

        this.showAlert(`Deleted ${selectedCount} question${selectedCount === 1 ? '' : 's'}`, 'success');
    }

    /**
     * Regenerate selected questions (placeholder for future implementation)
     */
    regenerateSelectedQuestions() {
        if (this.selectedQuestions.size === 0) return;

        const selectedCount = this.selectedQuestions.size;
        this.showAlert(
            `Regeneration of ${selectedCount} question${selectedCount === 1 ? '' : 's'} is not yet implemented. ` +
            'You can delete unwanted questions and generate new ones from the main interface.',
            'info'
        );
    }

    /**
     * Edit a specific question
     * @param {number} index - Question index
     */
    editQuestion(index) {
        const question = this.questions[index];
        if (!question) return;

        this.openQuestionEditor(question, index);
    }

    /**
     * Delete a specific question
     * @param {number} index - Question index
     */
    deleteQuestion(index) {
        if (!confirm('Are you sure you want to delete this question?')) return;

        this.questions.splice(index, 1);
        this.selectedQuestions.delete(index);
        
        // Adjust selected indices for questions that shifted
        const newSelectedQuestions = new Set();
        this.selectedQuestions.forEach(selectedIndex => {
            if (selectedIndex > index) {
                newSelectedQuestions.add(selectedIndex - 1);
            } else if (selectedIndex < index) {
                newSelectedQuestions.add(selectedIndex);
            }
        });
        this.selectedQuestions = newSelectedQuestions;

        this.hasUnsavedChanges = true;
        this.updateQuestionCount();
        this.renderQuestions();
        this.updateSelectionUI();

        this.showAlert('Question deleted', 'success');
    }

    /**
     * Open question editor modal
     * @param {Object} question - Question to edit
     * @param {number} index - Question index
     */
    openQuestionEditor(question, index) {
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
        const questionEditor = new QuestionEditor();
        const editorContainer = modalOverlay.querySelector('#question-editor-container');
        
        questionEditor.init(
            editorContainer,
            question,
            (editedQuestion) => this.handleQuestionEdit(editedQuestion, index, modalOverlay),
            () => this.handleQuestionEditCancel(modalOverlay)
        );

        // Close on overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                this.handleQuestionEditCancel(modalOverlay);
            }
        });

        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.handleQuestionEditCancel(modalOverlay);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    /**
     * Handle question edit save
     * @param {Object} editedQuestion - Edited question
     * @param {number} index - Question index
     * @param {HTMLElement} modalOverlay - Modal overlay element
     */
    handleQuestionEdit(editedQuestion, index, modalOverlay) {
        this.questions[index] = editedQuestion;
        this.hasUnsavedChanges = true;
        
        // Re-render questions
        this.renderQuestions();
        
        // Close modal
        modalOverlay.remove();
        
        this.showAlert('Question updated successfully', 'success');
    }

    /**
     * Handle question edit cancel
     * @param {HTMLElement} modalOverlay - Modal overlay element
     */
    handleQuestionEditCancel(modalOverlay) {
        modalOverlay.remove();
    }

    /**
     * Save questions
     */
    saveQuestions() {
        if (this.questions.length === 0) {
            this.showAlert('No questions to save. Please generate some questions first.', 'warning');
            return;
        }

        // Validate all questions
        const invalidQuestions = [];
        this.questions.forEach((question, index) => {
            const validation = validateQuestion(question);
            if (!validation.isValid) {
                invalidQuestions.push({
                    index: index + 1,
                    errors: validation.errors
                });
            }
        });

        if (invalidQuestions.length > 0) {
            const errorMessage = `Found ${invalidQuestions.length} invalid question${invalidQuestions.length === 1 ? '' : 's'}. Please fix the following issues:\n\n` +
                invalidQuestions.map(q => `Question ${q.index}: ${q.errors.join(', ')}`).join('\n');
            
            this.showAlert(errorMessage, 'error');
            return;
        }

        // Confirm save if there are unsaved changes
        if (this.hasUnsavedChanges) {
            const message = `Save ${this.questions.length} question${this.questions.length === 1 ? '' : 's'} to your quiz?`;
            if (!confirm(message)) return;
        }

        // Call save callback
        if (this.onSave) {
            this.onSave(this.questions);
        }
    }

    /**
     * Cancel review
     */
    cancelReview() {
        if (this.hasUnsavedChanges) {
            const confirmMessage = 'You have unsaved changes. Are you sure you want to cancel? All changes will be lost.';
            if (!confirm(confirmMessage)) return;
        }

        if (this.onCancel) {
            this.onCancel();
        }
    }

    /**
     * Update question count in UI
     */
    updateQuestionCount() {
        const questionCountElement = this.container.querySelector('.question-count');
        const saveButton = this.container.querySelector('#save-questions');
        
        if (questionCountElement) {
            questionCountElement.textContent = `${this.questions.length} questions`;
        }
        
        if (saveButton) {
            saveButton.textContent = `Save Questions (${this.questions.length})`;
        }
    }

    /**
     * Show alert message
     * @param {string} message - Alert message
     * @param {string} type - Alert type (success, error, warning, info)
     */
    showAlert(message, type = 'info') {
        const alertsContainer = this.container.querySelector('#review-alerts');
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
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}