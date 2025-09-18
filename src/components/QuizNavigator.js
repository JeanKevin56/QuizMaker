/**
 * Quiz Navigation System
 * Handles quiz progress tracking, navigation, completion detection, and timer functionality
 */

import { createQuestionRenderer } from './QuestionRenderer.js';
import { AnswerCollector } from './AnswerCollector.js';

export class QuizNavigator {
    constructor(quiz, storageManager, onQuizComplete) {
        this.quiz = quiz;
        this.storageManager = storageManager;
        this.onQuizComplete = onQuizComplete;
        
        // Initialize answer collector
        this.answerCollector = new AnswerCollector(quiz, storageManager);
        
        // Navigation state
        this.currentQuestionIndex = 0;
        this.questionRenderers = new Map(); // questionId -> renderer
        
        // Progress tracking
        this.startTime = null;
        this.endTime = null;
        this.isCompleted = false;
        
        // Timer functionality
        this.timer = null;
        this.timeRemaining = null;
        this.timerElement = null;
        
        // DOM elements
        this.container = null;
        this.questionContainer = null;
        this.navigationContainer = null;
        this.progressContainer = null;
        
        // Bind methods
        this.handleAnswerChange = this.handleAnswerChange.bind(this);
        this.nextQuestion = this.nextQuestion.bind(this);
        this.previousQuestion = this.previousQuestion.bind(this);
        this.completeQuiz = this.completeQuiz.bind(this);
        this.updateTimer = this.updateTimer.bind(this);
    }
    
    /**
     * Initialize the quiz navigator and render the interface
     * @param {HTMLElement} container - Container element to render into
     */
    async initialize(container) {
        this.container = container;
        this.startTime = new Date();
        
        // Initialize timer if quiz has time limit
        if (this.quiz.settings.timeLimit) {
            this.timeRemaining = this.quiz.settings.timeLimit * 60; // Convert minutes to seconds
            this.startTimer();
        }
        
        // Shuffle questions if enabled
        if (this.quiz.settings.shuffleQuestions) {
            this.shuffleQuestions();
        }
        
        // Render the quiz interface
        this.render();
        
        // Load any saved progress
        await this.answerCollector.loadProgress();
        
        // Show first question
        this.showCurrentQuestion();
    }
    
    /**
     * Render the quiz navigation interface
     */
    render() {
        this.container.innerHTML = `
            <div class="quiz-navigator">
                <!-- Quiz Header -->
                <div class="quiz-header">
                    <h2 class="quiz-title">${this.quiz.title}</h2>
                    <div class="quiz-meta">
                        ${this.quiz.description ? `<p class="quiz-description">${this.quiz.description}</p>` : ''}
                        <div class="quiz-info">
                            <span class="question-count">${this.quiz.questions.length} questions</span>
                            ${this.quiz.settings.timeLimit ? `<span class="time-limit" id="timer">Time: ${this.formatTime(this.timeRemaining)}</span>` : ''}
                        </div>
                    </div>
                </div>
                
                <!-- Progress Bar -->
                <div class="progress-container" id="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill"></div>
                    </div>
                    <div class="progress-text">
                        <span id="progress-text">Question 1 of ${this.quiz.questions.length}</span>
                    </div>
                </div>
                
                <!-- Question Container -->
                <div class="question-container" id="question-container">
                    <!-- Current question will be rendered here -->
                </div>
                
                <!-- Navigation Controls -->
                <div class="navigation-container" id="navigation-container">
                    <button id="prev-button" class="nav-button prev-button" disabled>
                        Previous
                    </button>
                    <div class="nav-center">
                        <button id="save-progress" class="save-button">
                            Save Progress
                        </button>
                    </div>
                    <button id="next-button" class="nav-button next-button">
                        Next
                    </button>
                    <button id="complete-button" class="nav-button complete-button" style="display: none;">
                        Complete Quiz
                    </button>
                </div>
            </div>
        `;
        
        // Store references to key elements
        this.questionContainer = this.container.querySelector('#question-container');
        this.navigationContainer = this.container.querySelector('#navigation-container');
        this.progressContainer = this.container.querySelector('#progress-container');
        this.timerElement = this.container.querySelector('#timer');
        
        // Attach event listeners
        this.attachEventListeners();
    }
    
    /**
     * Attach event listeners to navigation controls
     */
    attachEventListeners() {
        const prevButton = this.container.querySelector('#prev-button');
        const nextButton = this.container.querySelector('#next-button');
        const completeButton = this.container.querySelector('#complete-button');
        const saveButton = this.container.querySelector('#save-progress');
        
        prevButton.addEventListener('click', this.previousQuestion);
        nextButton.addEventListener('click', this.nextQuestion);
        completeButton.addEventListener('click', this.completeQuiz);
        saveButton.addEventListener('click', () => this.saveProgress());
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.isCompleted) return;
            
            switch (e.key) {
                case 'ArrowLeft':
                    if (!prevButton.disabled) {
                        e.preventDefault();
                        this.previousQuestion();
                    }
                    break;
                case 'ArrowRight':
                    if (!nextButton.disabled) {
                        e.preventDefault();
                        this.nextQuestion();
                    }
                    break;
                case 'Enter':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        if (this.isLastQuestion() && this.canCompleteQuiz()) {
                            this.completeQuiz();
                        } else if (this.canNavigateNext()) {
                            this.nextQuestion();
                        }
                    }
                    break;
            }
        });
    }
    
    /**
     * Show the current question
     */
    showCurrentQuestion() {
        const question = this.quiz.questions[this.currentQuestionIndex];
        
        // Create or get existing renderer for this question
        let renderer = this.questionRenderers.get(question.id);
        if (!renderer) {
            renderer = createQuestionRenderer(question, this.handleAnswerChange);
            this.questionRenderers.set(question.id, renderer);
        }
        
        // Only update DOM if container is available
        if (this.questionContainer) {
            // Clear question container and render current question
            this.questionContainer.innerHTML = '';
            this.questionContainer.appendChild(renderer.render());
            
            // Restore user's previous answer if exists
            const savedAnswer = this.answerCollector.getAnswer(question.id);
            if (savedAnswer !== undefined) {
                renderer.setUserAnswer(savedAnswer);
                this.restoreAnswerInDOM(renderer, savedAnswer);
            }
        }
        
        // Update navigation state
        this.updateNavigationState();
        this.updateProgress();
    }
    
    /**
     * Restore the user's answer in the DOM elements
     * @param {QuestionRenderer} renderer - Question renderer
     * @param {any} answer - User's answer
     */
    restoreAnswerInDOM(renderer, answer) {
        const question = renderer.question;
        
        switch (question.type) {
            case 'mcq-single':
                const radio = renderer.element.querySelector(`input[value="${answer}"]`);
                if (radio) radio.checked = true;
                break;
                
            case 'mcq-multiple':
                if (Array.isArray(answer)) {
                    answer.forEach(value => {
                        const checkbox = renderer.element.querySelector(`input[value="${value}"]`);
                        if (checkbox) checkbox.checked = true;
                    });
                }
                break;
                
            case 'text-input':
                const textInput = renderer.element.querySelector('.text-input-field');
                if (textInput) textInput.value = answer;
                break;
        }
    }
    
    /**
     * Handle answer changes from question renderers
     * @param {string} questionId - Question ID
     * @param {any} answer - User's answer
     */
    handleAnswerChange(questionId, answer) {
        const result = this.answerCollector.submitAnswer(questionId, answer);
        if (!result.success) {
            console.warn(`Answer submission failed for question ${questionId}:`, result.error);
        }
        this.updateNavigationState();
    }
    
    /**
     * Navigate to the next question
     */
    nextQuestion() {
        if (!this.canNavigateNext()) return;
        
        if (this.currentQuestionIndex < this.quiz.questions.length - 1) {
            this.currentQuestionIndex++;
            this.showCurrentQuestion();
        }
    }
    
    /**
     * Navigate to the previous question
     */
    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.showCurrentQuestion();
        }
    }
    
    /**
     * Complete the quiz
     */
    async completeQuiz() {
        if (!this.canCompleteQuiz()) {
            alert('Please answer all questions before completing the quiz.');
            return;
        }
        
        this.isCompleted = true;
        this.endTime = new Date();
        
        // Stop timer
        if (this.timer) {
            clearInterval(this.timer);
        }
        
        // Calculate results
        const results = await this.calculateResults();
        
        // Clear saved progress
        await this.clearProgress();
        
        // Call completion callback
        if (this.onQuizComplete) {
            this.onQuizComplete(results);
        }
    }
    
    /**
     * Calculate quiz results
     * @returns {Object} Quiz results
     */
    async calculateResults() {
        // Generate final results using the answer collector
        const result = this.answerCollector.generateFinalResults();
        
        // Update with navigation-specific data
        result.completedAt = this.endTime;
        result.timeSpent = this.endTime ? Math.round((this.endTime - this.startTime) / 1000) : result.timeSpent;
        
        // Store result
        await this.storageManager.storeResult(result);
        
        return result;
    }
    

    
    /**
     * Update navigation button states
     */
    updateNavigationState() {
        if (!this.container) return; // Skip if not initialized with DOM
        
        const prevButton = this.container.querySelector('#prev-button');
        const nextButton = this.container.querySelector('#next-button');
        const completeButton = this.container.querySelector('#complete-button');
        
        if (!prevButton || !nextButton || !completeButton) return;
        
        // Previous button
        prevButton.disabled = this.currentQuestionIndex === 0;
        
        // Next/Complete button logic
        if (this.isLastQuestion()) {
            nextButton.style.display = 'none';
            completeButton.style.display = 'inline-block';
            completeButton.disabled = !this.canCompleteQuiz();
        } else {
            nextButton.style.display = 'inline-block';
            completeButton.style.display = 'none';
            nextButton.disabled = !this.canNavigateNext();
        }
    }
    
    /**
     * Update progress display
     */
    updateProgress() {
        if (!this.container) return; // Skip if not initialized with DOM
        
        const progressFill = this.container.querySelector('#progress-fill');
        const progressText = this.container.querySelector('#progress-text');
        
        if (!progressFill || !progressText) return;
        
        const progress = ((this.currentQuestionIndex + 1) / this.quiz.questions.length) * 100;
        const answeredCount = this.answerCollector.getAnsweredCount();
        
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `Question ${this.currentQuestionIndex + 1} of ${this.quiz.questions.length} (${answeredCount} answered)`;
    }
    
    /**
     * Check if user can navigate to next question
     * @returns {boolean}
     */
    canNavigateNext() {
        return this.currentQuestionIndex < this.quiz.questions.length - 1;
    }
    
    /**
     * Check if current question is the last one
     * @returns {boolean}
     */
    isLastQuestion() {
        return this.currentQuestionIndex === this.quiz.questions.length - 1;
    }
    
    /**
     * Check if quiz can be completed (all questions answered)
     * @returns {boolean}
     */
    canCompleteQuiz() {
        return this.answerCollector.areAllQuestionsAnswered();
    }
    
    /**
     * Shuffle questions if enabled in settings
     */
    shuffleQuestions() {
        for (let i = this.quiz.questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.quiz.questions[i], this.quiz.questions[j]] = [this.quiz.questions[j], this.quiz.questions[i]];
        }
    }
    
    /**
     * Start the quiz timer
     */
    startTimer() {
        this.timer = setInterval(this.updateTimer, 1000);
    }
    
    /**
     * Update timer display and handle time expiration
     */
    updateTimer() {
        if (this.timeRemaining <= 0) {
            this.handleTimeExpired();
            return;
        }
        
        this.timeRemaining--;
        
        if (this.timerElement) {
            this.timerElement.textContent = `Time: ${this.formatTime(this.timeRemaining)}`;
            
            // Add warning class when time is running low
            if (this.timeRemaining <= 60) { // Last minute
                this.timerElement.classList.add('time-warning');
            }
            if (this.timeRemaining <= 10) { // Last 10 seconds
                this.timerElement.classList.add('time-critical');
            }
        }
    }
    
    /**
     * Handle timer expiration
     */
    async handleTimeExpired() {
        if (this.timer) {
            clearInterval(this.timer);
        }
        
        alert('Time\'s up! The quiz will be submitted automatically.');
        await this.completeQuiz();
    }
    
    /**
     * Format time in MM:SS format
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time string
     */
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    /**
     * Save current progress to storage
     */
    async saveProgress() {
        try {
            // Save answer collector progress
            const answerSuccess = await this.answerCollector.saveProgress();
            
            // Save navigation-specific progress
            const navigationData = {
                quizId: this.quiz.id,
                currentQuestionIndex: this.currentQuestionIndex,
                startTime: this.startTime.toISOString(),
                timeRemaining: this.timeRemaining
            };
            
            localStorage.setItem(`quiz-navigation-${this.quiz.id}`, JSON.stringify(navigationData));
            
            if (answerSuccess) {
                // Show feedback
                const saveButton = this.container?.querySelector('#save-progress');
                if (saveButton) {
                    const originalText = saveButton.textContent;
                    saveButton.textContent = 'Saved!';
                    saveButton.disabled = true;
                    
                    setTimeout(() => {
                        saveButton.textContent = originalText;
                        saveButton.disabled = false;
                    }, 2000);
                }
            } else {
                throw new Error('Failed to save answer progress');
            }
        } catch (error) {
            console.error('Failed to save progress:', error);
            if (typeof alert !== 'undefined') {
                alert('Failed to save progress. Please try again.');
            }
        }
    }
    
    /**
     * Load saved progress from storage
     */
    async loadProgress() {
        try {
            // Load navigation-specific progress
            const savedData = localStorage.getItem(`quiz-navigation-${this.quiz.id}`);
            if (savedData) {
                const progressData = JSON.parse(savedData);
                
                // Restore navigation progress
                this.currentQuestionIndex = progressData.currentQuestionIndex || 0;
                
                if (progressData.startTime) {
                    this.startTime = new Date(progressData.startTime);
                }
                
                if (progressData.timeRemaining && this.quiz.settings.timeLimit) {
                    this.timeRemaining = progressData.timeRemaining;
                }
            }
            
        } catch (error) {
            console.error('Failed to load navigation progress:', error);
        }
    }
    
    /**
     * Clear saved progress from storage
     */
    async clearProgress() {
        try {
            await this.answerCollector.clearProgress();
            localStorage.removeItem(`quiz-navigation-${this.quiz.id}`);
        } catch (error) {
            console.error('Failed to clear progress:', error);
        }
    }
    
    /**
     * Get current quiz state
     * @returns {Object} Current state information
     */
    getState() {
        const answerStats = this.answerCollector.calculateCurrentScore();
        
        return {
            currentQuestionIndex: this.currentQuestionIndex,
            totalQuestions: this.quiz.questions.length,
            answeredCount: this.answerCollector.getAnsweredCount(),
            isCompleted: this.isCompleted,
            timeRemaining: this.timeRemaining,
            canComplete: this.canCompleteQuiz(),
            currentScore: answerStats.currentScore,
            projectedScore: answerStats.projectedScore,
            completionPercentage: answerStats.completionPercentage
        };
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        if (this.timer) {
            clearInterval(this.timer);
        }
        
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeydown);
        
        // Clear DOM references
        this.container = null;
        this.questionContainer = null;
        this.navigationContainer = null;
        this.progressContainer = null;
        this.timerElement = null;
    }
}