/**
 * Question rendering components for the Quiz Platform
 * Handles rendering and interaction for different question types
 */

import { QUESTION_TYPES } from '../models/types.js';

/**
 * Base question renderer class
 */
export class QuestionRenderer {
    constructor(question, onAnswerChange) {
        this.question = question;
        this.onAnswerChange = onAnswerChange;
        this.userAnswer = null;
        this.element = null;
    }

    /**
     * Render the question component
     * @returns {HTMLElement} The rendered question element
     */
    render() {
        this.element = document.createElement('div');
        this.element.className = 'question-container';
        this.element.innerHTML = this.getHTML();
        this.attachEventListeners();
        return this.element;
    }

    /**
     * Get the HTML structure for the question
     * @returns {string} HTML string
     */
    getHTML() {
        return `
            <div class="question-header">
                <h3 class="question-text">${this.question.question}</h3>
                ${this.question.media ? this.renderMedia() : ''}
            </div>
            <div class="question-body">
                ${this.renderAnswerInput()}
            </div>
        `;
    }

    /**
     * Render media content if present
     * @returns {string} Media HTML
     */
    renderMedia() {
        if (this.question.media && this.question.media.type === 'image') {
            return `
                <div class="question-media">
                    <img src="${this.question.media.url}" alt="Question image" class="question-image" />
                </div>
            `;
        }
        return '';
    }

    /**
     * Abstract method to render answer input - must be implemented by subclasses
     * @returns {string} Answer input HTML
     */
    renderAnswerInput() {
        throw new Error('renderAnswerInput must be implemented by subclass');
    }

    /**
     * Abstract method to attach event listeners - must be implemented by subclasses
     */
    attachEventListeners() {
        throw new Error('attachEventListeners must be implemented by subclass');
    }

    /**
     * Get the current user answer
     * @returns {any} Current answer
     */
    getUserAnswer() {
        return this.userAnswer;
    }

    /**
     * Set the user answer
     * @param {any} answer - The answer to set
     */
    setUserAnswer(answer) {
        this.userAnswer = answer;
        if (this.onAnswerChange) {
            this.onAnswerChange(this.question.id, answer);
        }
    }

    /**
     * Validate the current answer
     * @returns {boolean} Whether the answer is valid
     */
    validateAnswer() {
        return this.userAnswer !== null && this.userAnswer !== undefined;
    }
}

/**
 * Multiple Choice Single Question Renderer
 */
export class MCQSingleRenderer extends QuestionRenderer {
    renderAnswerInput() {
        return `
            <div class="mcq-options">
                ${this.question.options.map((option, index) => `
                    <div class="mcq-option">
                        <label class="mcq-label">
                            <input 
                                type="radio" 
                                name="question-${this.question.id}" 
                                value="${index}"
                                class="mcq-radio"
                            />
                            <span class="mcq-option-text">${option}</span>
                        </label>
                    </div>
                `).join('')}
            </div>
        `;
    }

    attachEventListeners() {
        const radioButtons = this.element.querySelectorAll('.mcq-radio');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.setUserAnswer(parseInt(e.target.value));
                }
            });
        });
    }

    validateAnswer() {
        return typeof this.userAnswer === 'number' && 
               this.userAnswer >= 0 && 
               this.userAnswer < this.question.options.length;
    }
}

/**
 * Multiple Choice Multiple Question Renderer
 */
export class MCQMultipleRenderer extends QuestionRenderer {
    constructor(question, onAnswerChange) {
        super(question, onAnswerChange);
        this.userAnswer = [];
    }

    renderAnswerInput() {
        return `
            <div class="mcq-options mcq-multiple">
                ${this.question.options.map((option, index) => `
                    <div class="mcq-option">
                        <label class="mcq-label">
                            <input 
                                type="checkbox" 
                                name="question-${this.question.id}" 
                                value="${index}"
                                class="mcq-checkbox"
                            />
                            <span class="mcq-option-text">${option}</span>
                        </label>
                    </div>
                `).join('')}
            </div>
        `;
    }

    attachEventListeners() {
        const checkboxes = this.element.querySelectorAll('.mcq-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const value = parseInt(e.target.value);
                if (e.target.checked) {
                    if (!this.userAnswer.includes(value)) {
                        this.userAnswer.push(value);
                    }
                } else {
                    this.userAnswer = this.userAnswer.filter(answer => answer !== value);
                }
                this.setUserAnswer([...this.userAnswer]);
            });
        });
    }

    validateAnswer() {
        return Array.isArray(this.userAnswer) && this.userAnswer.length > 0;
    }
}

/**
 * Text Input Question Renderer
 */
export class TextInputRenderer extends QuestionRenderer {
    renderAnswerInput() {
        return `
            <div class="text-input-container">
                <input 
                    type="text" 
                    class="text-input-field"
                    placeholder="Enter your answer..."
                    autocomplete="off"
                />
                ${this.question.caseSensitive ? 
                    '<p class="text-input-hint">Note: This answer is case-sensitive</p>' : 
                    '<p class="text-input-hint">Note: This answer is not case-sensitive</p>'
                }
            </div>
        `;
    }

    attachEventListeners() {
        const textInput = this.element.querySelector('.text-input-field');
        textInput.addEventListener('input', (e) => {
            this.setUserAnswer(e.target.value.trim());
        });

        // Also listen for blur to ensure answer is captured
        textInput.addEventListener('blur', (e) => {
            this.setUserAnswer(e.target.value.trim());
        });
    }

    validateAnswer() {
        return typeof this.userAnswer === 'string' && this.userAnswer.trim().length > 0;
    }

    /**
     * Check if the user's answer is correct
     * @returns {boolean} Whether the answer is correct
     */
    isCorrect() {
        if (!this.validateAnswer()) return false;
        
        const userAnswer = this.userAnswer;
        const correctAnswer = this.question.correctAnswer;
        
        if (this.question.caseSensitive) {
            return userAnswer === correctAnswer;
        } else {
            return userAnswer.toLowerCase() === correctAnswer.toLowerCase();
        }
    }
}

/**
 * Factory function to create appropriate question renderer
 * @param {Object} question - Question data
 * @param {Function} onAnswerChange - Callback for answer changes
 * @returns {QuestionRenderer} Appropriate renderer instance
 */
export function createQuestionRenderer(question, onAnswerChange) {
    switch (question.type) {
        case QUESTION_TYPES.MCQ_SINGLE:
            return new MCQSingleRenderer(question, onAnswerChange);
        case QUESTION_TYPES.MCQ_MULTIPLE:
            return new MCQMultipleRenderer(question, onAnswerChange);
        case QUESTION_TYPES.TEXT_INPUT:
            return new TextInputRenderer(question, onAnswerChange);
        default:
            throw new Error(`Unsupported question type: ${question.type}`);
    }
}