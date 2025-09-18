/**
 * Results Display Component
 * Handles the display of quiz results including summary and detailed breakdown
 */

import { QUESTION_TYPES } from '../models/types.js';
import { AIExplanationService } from '../services/AIExplanationService.js';

export class ResultsDisplay {
    constructor(container, storageManager) {
        this.container = container;
        this.storageManager = storageManager;
        this.currentResult = null;
        this.currentQuiz = null;
        this.aiExplanationService = new AIExplanationService();
        
        // Event handlers
        this.onRetakeQuiz = null;
        this.onBackToDashboard = null;
        this.onViewExplanation = null;
    }

    /**
     * Display quiz results
     * @param {Object} result - Result object from ScoringService
     * @param {Object} quiz - Quiz object
     */
    async displayResults(result, quiz) {
        this.currentResult = result;
        this.currentQuiz = quiz;

        if (!result || !quiz) {
            this.displayError('Invalid result or quiz data');
            return;
        }

        try {
            const html = this.generateResultsHTML(result, quiz);
            this.container.innerHTML = html;
            this.attachEventListeners();
        } catch (error) {
            console.error('Error displaying results:', error);
            this.displayError('Failed to display results');
        }
    }

    /**
     * Generate HTML for results display
     * @param {Object} result - Result object
     * @param {Object} quiz - Quiz object
     * @returns {string} HTML string
     */
    generateResultsHTML(result, quiz) {
        const summaryHTML = this.generateSummaryHTML(result, quiz);
        const detailsHTML = this.generateDetailsHTML(result, quiz);
        const actionsHTML = this.generateActionsHTML();

        return `
            <div class="results-container">
                <div class="results-header">
                    <h1>Quiz Results</h1>
                    <h2>${quiz.title}</h2>
                </div>
                
                ${summaryHTML}
                ${detailsHTML}
                ${actionsHTML}
            </div>
        `;
    }

    /**
     * Generate summary section HTML
     * @param {Object} result - Result object
     * @param {Object} quiz - Quiz object
     * @returns {string} HTML string
     */
    generateSummaryHTML(result, quiz) {
        const scoreClass = this.getScoreClass(result.score);
        const timeFormatted = this.formatTime(result.timeSpent);
        const completionDate = new Date(result.completedAt).toLocaleString();

        return `
            <div class="results-summary">
                <div class="score-display">
                    <div class="score-circle ${scoreClass}">
                        <span class="score-percentage">${result.score}%</span>
                        <span class="score-grade">${result.grade || this.calculateGrade(result.score)}</span>
                    </div>
                </div>
                
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-label">Questions Correct</span>
                        <span class="stat-value">${result.correctCount} / ${result.totalQuestions}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Time Taken</span>
                        <span class="stat-value">${timeFormatted}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Completed</span>
                        <span class="stat-value">${completionDate}</span>
                    </div>
                    ${result.metadata ? this.generateMetadataStats(result.metadata) : ''}
                </div>
            </div>
        `;
    }

    /**
     * Generate metadata statistics HTML
     * @param {Object} metadata - Result metadata
     * @returns {string} HTML string
     */
    generateMetadataStats(metadata) {
        let html = '';
        
        if (metadata.averageTimePerQuestion) {
            html += `
                <div class="stat-item">
                    <span class="stat-label">Avg. Time per Question</span>
                    <span class="stat-value">${this.formatTime(metadata.averageTimePerQuestion)}</span>
                </div>
            `;
        }

        if (metadata.accuracy !== undefined) {
            html += `
                <div class="stat-item">
                    <span class="stat-label">Accuracy</span>
                    <span class="stat-value">${metadata.accuracy}%</span>
                </div>
            `;
        }

        return html;
    }

    /**
     * Generate detailed results HTML
     * @param {Object} result - Result object
     * @param {Object} quiz - Quiz object
     * @returns {string} HTML string
     */
    generateDetailsHTML(result, quiz) {
        const questionsHTML = result.answers.map((answer, index) => {
            const question = quiz.questions.find(q => q.id === answer.questionId);
            if (!question) return '';
            
            return this.generateQuestionResultHTML(question, answer, index + 1);
        }).join('');

        return `
            <div class="results-details">
                <h3>Question-by-Question Results</h3>
                <div class="questions-results">
                    ${questionsHTML}
                </div>
            </div>
        `;
    }

    /**
     * Generate HTML for individual question result
     * @param {Object} question - Question object
     * @param {Object} answer - Answer record
     * @param {number} questionNumber - Question number for display
     * @returns {string} HTML string
     */
    generateQuestionResultHTML(question, answer, questionNumber) {
        const statusClass = answer.isCorrect ? 'correct' : 'incorrect';
        const statusIcon = answer.isCorrect ? '✓' : '✗';
        
        const userAnswerHTML = this.formatUserAnswer(question, answer.userAnswer);
        const correctAnswerHTML = this.formatCorrectAnswer(question);
        
        return `
            <div class="question-result ${statusClass}">
                <div class="question-header">
                    <span class="question-number">Question ${questionNumber}</span>
                    <span class="question-status ${statusClass}">
                        <span class="status-icon">${statusIcon}</span>
                        <span class="status-text">${answer.isCorrect ? 'Correct' : 'Incorrect'}</span>
                    </span>
                </div>
                
                <div class="question-content">
                    <div class="question-text">${question.question}</div>
                    ${question.media ? this.generateMediaHTML(question.media) : ''}
                </div>
                
                <div class="answer-comparison">
                    <div class="user-answer">
                        <h4>Your Answer:</h4>
                        <div class="answer-content ${answer.userAnswer === null ? 'no-answer' : ''}">
                            ${answer.userAnswer === null ? 'No answer provided' : userAnswerHTML}
                        </div>
                    </div>
                    
                    ${!answer.isCorrect ? `
                        <div class="correct-answer">
                            <h4>Correct Answer:</h4>
                            <div class="answer-content correct">
                                ${correctAnswerHTML}
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="explanation-section">
                    <h4>Explanation:</h4>
                    <div class="explanation-content">
                        ${answer.explanation || 'No explanation available'}
                        <div class="ai-explanation-placeholder" data-question-id="${question.id}" data-user-answer='${JSON.stringify(answer.userAnswer)}' data-is-correct="${answer.isCorrect}">
                            <button class="get-ai-explanation-btn" data-question-id="${question.id}">
                                Get AI Explanation
                            </button>
                            <div class="ai-explanation-content" style="display: none;"></div>
                            <div class="ai-explanation-loading" style="display: none;">
                                <div class="loading-spinner"></div>
                                <span>Generating explanation...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Format user answer for display
     * @param {Object} question - Question object
     * @param {any} userAnswer - User's answer
     * @returns {string} Formatted answer HTML
     */
    formatUserAnswer(question, userAnswer) {
        if (userAnswer === null || userAnswer === undefined) {
            return '<em>No answer provided</em>';
        }

        switch (question.type) {
            case QUESTION_TYPES.MCQ_SINGLE:
                if (typeof userAnswer === 'number' && question.options[userAnswer]) {
                    return `<span class="option-text">${question.options[userAnswer]}</span>`;
                }
                return '<em>Invalid answer</em>';

            case QUESTION_TYPES.MCQ_MULTIPLE:
                if (Array.isArray(userAnswer)) {
                    const selectedOptions = userAnswer
                        .filter(index => question.options[index])
                        .map(index => `<span class="option-text">${question.options[index]}</span>`)
                        .join(', ');
                    return selectedOptions || '<em>No options selected</em>';
                }
                return '<em>Invalid answer</em>';

            case QUESTION_TYPES.TEXT_INPUT:
                return `<span class="text-answer">"${userAnswer}"</span>`;

            default:
                return '<em>Unknown answer type</em>';
        }
    }

    /**
     * Format correct answer for display
     * @param {Object} question - Question object
     * @returns {string} Formatted correct answer HTML
     */
    formatCorrectAnswer(question) {
        switch (question.type) {
            case QUESTION_TYPES.MCQ_SINGLE:
                if (question.options[question.correctAnswer]) {
                    return `<span class="option-text">${question.options[question.correctAnswer]}</span>`;
                }
                return '<em>Invalid correct answer</em>';

            case QUESTION_TYPES.MCQ_MULTIPLE:
                if (Array.isArray(question.correctAnswers)) {
                    const correctOptions = question.correctAnswers
                        .filter(index => question.options[index])
                        .map(index => `<span class="option-text">${question.options[index]}</span>`)
                        .join(', ');
                    return correctOptions || '<em>No correct options</em>';
                }
                return '<em>Invalid correct answers</em>';

            case QUESTION_TYPES.TEXT_INPUT:
                return `<span class="text-answer">"${question.correctAnswer}"</span>`;

            default:
                return '<em>Unknown question type</em>';
        }
    }

    /**
     * Generate media HTML
     * @param {Object} media - Media object
     * @returns {string} Media HTML
     */
    generateMediaHTML(media) {
        if (media.type === 'image') {
            return `<div class="question-media"><img src="${media.url}" alt="Question image" /></div>`;
        }
        return '';
    }

    /**
     * Generate actions section HTML
     * @returns {string} HTML string
     */
    generateActionsHTML() {
        return `
            <div class="results-actions">
                <button class="btn btn-primary retake-quiz-btn">
                    Retake Quiz
                </button>
                <button class="btn btn-secondary back-to-dashboard-btn">
                    Back to Dashboard
                </button>
                <button class="btn btn-outline export-results-btn">
                    Export Results
                </button>
            </div>
        `;
    }

    /**
     * Attach event listeners to interactive elements
     */
    attachEventListeners() {
        // Retake quiz button
        const retakeBtn = this.container.querySelector('.retake-quiz-btn');
        if (retakeBtn && this.onRetakeQuiz) {
            retakeBtn.addEventListener('click', () => {
                this.onRetakeQuiz(this.currentQuiz.id);
            });
        }

        // Back to dashboard button
        const backBtn = this.container.querySelector('.back-to-dashboard-btn');
        if (backBtn && this.onBackToDashboard) {
            backBtn.addEventListener('click', () => {
                this.onBackToDashboard();
            });
        }

        // Export results button
        const exportBtn = this.container.querySelector('.export-results-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportResults();
            });
        }

        // AI explanation buttons
        const aiExplanationBtns = this.container.querySelectorAll('.get-ai-explanation-btn');
        aiExplanationBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const questionId = e.target.dataset.questionId;
                this.handleAIExplanationRequest(questionId);
            });
        });
    }

    /**
     * Handle AI explanation request
     * @param {string} questionId - Question ID
     */
    async handleAIExplanationRequest(questionId) {
        const placeholder = this.container.querySelector(`[data-question-id="${questionId}"]`);
        const button = placeholder?.querySelector('.get-ai-explanation-btn');
        const contentDiv = placeholder?.querySelector('.ai-explanation-content');
        const loadingDiv = placeholder?.querySelector('.ai-explanation-loading');
        
        if (!placeholder || !button || !contentDiv || !loadingDiv) return;

        try {
            // Get question and answer data
            const question = this.currentQuiz.questions.find(q => q.id === questionId);
            const answerRecord = this.currentResult.answers.find(a => a.questionId === questionId);
            
            if (!question || !answerRecord) {
                throw new Error('Question or answer data not found');
            }

            // Show loading state
            button.style.display = 'none';
            loadingDiv.style.display = 'flex';

            // Generate AI explanation
            const result = await this.aiExplanationService.generateExplanation(
                question,
                answerRecord.userAnswer,
                answerRecord.isCorrect
            );

            if (result.success) {
                contentDiv.innerHTML = `
                    <div class="ai-explanation ${result.fromCache ? 'from-cache' : ''}">
                        <h5>
                            <span class="ai-icon">🤖</span>
                            AI Explanation
                            ${result.fromCache ? '<span class="cache-indicator">(cached)</span>' : ''}
                        </h5>
                        <div class="explanation-text">${this.formatExplanationText(result.explanation)}</div>
                        <div class="explanation-meta">
                            <small>Generated: ${new Date(result.generatedAt).toLocaleString()}</small>
                        </div>
                    </div>
                `;
                contentDiv.style.display = 'block';
                loadingDiv.style.display = 'none';
            } else {
                throw new Error(result.error || 'Failed to generate explanation');
            }

        } catch (error) {
            console.error('Error getting AI explanation:', error);
            
            // Show error state
            loadingDiv.style.display = 'none';
            contentDiv.innerHTML = `
                <div class="ai-explanation-error">
                    <h5>
                        <span class="error-icon">⚠️</span>
                        Explanation Unavailable
                    </h5>
                    <p>Unable to generate AI explanation: ${error.message}</p>
                    <button class="retry-explanation-btn" data-question-id="${questionId}">
                        Try Again
                    </button>
                </div>
            `;
            contentDiv.style.display = 'block';
            
            // Add retry functionality
            const retryBtn = contentDiv.querySelector('.retry-explanation-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => {
                    contentDiv.style.display = 'none';
                    button.style.display = 'inline-block';
                });
            }
        }
    }

    /**
     * Format explanation text for display
     * @param {string} text - Raw explanation text
     * @returns {string} Formatted HTML
     */
    formatExplanationText(text) {
        if (!text) return 'No explanation available.';
        
        // Convert line breaks to paragraphs
        const paragraphs = text.split('\n\n').filter(p => p.trim());
        
        return paragraphs.map(paragraph => {
            // Handle numbered lists
            if (/^\d+\./.test(paragraph.trim())) {
                const lines = paragraph.split('\n').filter(line => line.trim());
                const listItems = lines.map(line => {
                    const match = line.match(/^(\d+\.\s*)(.*)/);
                    if (match) {
                        return `<li>${match[2]}</li>`;
                    }
                    return `<li>${line}</li>`;
                }).join('');
                return `<ol>${listItems}</ol>`;
            }
            
            // Handle bullet points
            if (/^[-•*]/.test(paragraph.trim())) {
                const lines = paragraph.split('\n').filter(line => line.trim());
                const listItems = lines.map(line => {
                    const match = line.match(/^[-•*]\s*(.*)/);
                    if (match) {
                        return `<li>${match[1]}</li>`;
                    }
                    return `<li>${line}</li>`;
                }).join('');
                return `<ul>${listItems}</ul>`;
            }
            
            // Regular paragraph
            return `<p>${paragraph.replace(/\n/g, '<br>')}</p>`;
        }).join('');
    }

    /**
     * Export results to JSON
     */
    exportResults() {
        if (!this.currentResult || !this.currentQuiz) return;

        const exportData = {
            quiz: {
                id: this.currentQuiz.id,
                title: this.currentQuiz.title,
                description: this.currentQuiz.description
            },
            result: this.currentResult,
            exportedAt: new Date().toISOString()
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `quiz-results-${this.currentQuiz.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${Date.now()}.json`;
        link.click();
        
        URL.revokeObjectURL(link.href);
    }

    /**
     * Get CSS class for score display
     * @param {number} score - Score percentage
     * @returns {string} CSS class name
     */
    getScoreClass(score) {
        if (score >= 90) return 'excellent';
        if (score >= 80) return 'good';
        if (score >= 70) return 'average';
        if (score >= 60) return 'below-average';
        return 'poor';
    }

    /**
     * Calculate grade from score (fallback if not provided)
     * @param {number} score - Score percentage
     * @returns {string} Letter grade
     */
    calculateGrade(score) {
        if (score >= 97) return 'A+';
        if (score >= 93) return 'A';
        if (score >= 90) return 'A-';
        if (score >= 87) return 'B+';
        if (score >= 83) return 'B';
        if (score >= 80) return 'B-';
        if (score >= 77) return 'C+';
        if (score >= 73) return 'C';
        if (score >= 70) return 'C-';
        if (score >= 67) return 'D+';
        if (score >= 63) return 'D';
        if (score >= 60) return 'D-';
        return 'F';
    }

    /**
     * Format time in seconds to readable format
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time string
     */
    formatTime(seconds) {
        if (seconds < 60) {
            return `${seconds}s`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        }
    }

    /**
     * Display error message
     * @param {string} message - Error message
     */
    displayError(message) {
        this.container.innerHTML = `
            <div class="results-error">
                <h2>Error</h2>
                <p>${message}</p>
                <button class="btn btn-primary back-to-dashboard-btn">
                    Back to Dashboard
                </button>
            </div>
        `;

        const backBtn = this.container.querySelector('.back-to-dashboard-btn');
        if (backBtn && this.onBackToDashboard) {
            backBtn.addEventListener('click', () => {
                this.onBackToDashboard();
            });
        }
    }

    /**
     * Clear the results display
     */
    clear() {
        this.container.innerHTML = '';
        this.currentResult = null;
        this.currentQuiz = null;
    }

    /**
     * Set event handlers
     * @param {Object} handlers - Event handler functions
     */
    setEventHandlers(handlers) {
        this.onRetakeQuiz = handlers.onRetakeQuiz || null;
        this.onBackToDashboard = handlers.onBackToDashboard || null;
        this.onViewExplanation = handlers.onViewExplanation || null;
    }
}