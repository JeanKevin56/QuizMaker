/**
 * Answer Collection and Validation System
 * Handles answer storage, validation, and submission logic during quiz taking
 */

import { QUESTION_TYPES } from '../models/types.js';

export class AnswerCollector {
    constructor(quiz, storageManager) {
        this.quiz = quiz;
        this.storageManager = storageManager;
        
        // Answer storage
        this.answers = new Map(); // questionId -> answer
        this.validationResults = new Map(); // questionId -> validation result
        this.submissionTimestamps = new Map(); // questionId -> timestamp
        
        // Progress tracking
        this.startTime = new Date();
        this.lastSaveTime = null;
        
        // Validation rules
        this.validationRules = this.initializeValidationRules();
    }
    
    /**
     * Initialize validation rules for different question types
     * @returns {Map} Validation rules map
     */
    initializeValidationRules() {
        const rules = new Map();
        
        rules.set(QUESTION_TYPES.MCQ_SINGLE, {
            validate: (answer, question) => {
                if (typeof answer !== 'number') return { isValid: false, error: 'Answer must be a number' };
                if (answer < 0 || answer >= question.options.length) {
                    return { isValid: false, error: 'Answer index out of range' };
                }
                return { isValid: true };
            },
            isCorrect: (answer, question) => answer === question.correctAnswer
        });
        
        rules.set(QUESTION_TYPES.MCQ_MULTIPLE, {
            validate: (answer, question) => {
                if (!Array.isArray(answer)) return { isValid: false, error: 'Answer must be an array' };
                if (answer.length === 0) return { isValid: false, error: 'At least one option must be selected' };
                
                for (const option of answer) {
                    if (typeof option !== 'number' || option < 0 || option >= question.options.length) {
                        return { isValid: false, error: 'Invalid option index' };
                    }
                }
                
                // Check for duplicates
                if (new Set(answer).size !== answer.length) {
                    return { isValid: false, error: 'Duplicate options selected' };
                }
                
                return { isValid: true };
            },
            isCorrect: (answer, question) => {
                if (!Array.isArray(answer) || !Array.isArray(question.correctAnswers)) return false;
                if (answer.length !== question.correctAnswers.length) return false;
                
                const sortedAnswer = [...answer].sort((a, b) => a - b);
                const sortedCorrect = [...question.correctAnswers].sort((a, b) => a - b);
                
                return sortedAnswer.every((ans, index) => ans === sortedCorrect[index]);
            }
        });
        
        rules.set(QUESTION_TYPES.TEXT_INPUT, {
            validate: (answer, question) => {
                if (typeof answer !== 'string') return { isValid: false, error: 'Answer must be a string' };
                if (answer.trim().length === 0) return { isValid: false, error: 'Answer cannot be empty' };
                return { isValid: true };
            },
            isCorrect: (answer, question) => {
                if (typeof answer !== 'string') return false;
                
                const userAnswer = answer.trim();
                const correctAnswer = question.correctAnswer.trim();
                
                return question.caseSensitive ? 
                    userAnswer === correctAnswer : 
                    userAnswer.toLowerCase() === correctAnswer.toLowerCase();
            }
        });
        
        return rules;
    }
    
    /**
     * Submit an answer for a question
     * @param {string} questionId - Question ID
     * @param {any} answer - User's answer
     * @returns {Object} Submission result
     */
    submitAnswer(questionId, answer) {
        const question = this.getQuestionById(questionId);
        if (!question) {
            return {
                success: false,
                error: 'Question not found',
                questionId
            };
        }
        
        // Validate the answer
        const validation = this.validateAnswer(questionId, answer);
        if (!validation.isValid) {
            return {
                success: false,
                error: validation.error,
                questionId,
                validation
            };
        }
        
        // Store the answer
        this.answers.set(questionId, answer);
        this.validationResults.set(questionId, validation);
        this.submissionTimestamps.set(questionId, new Date());
        
        return {
            success: true,
            questionId,
            answer,
            validation,
            timestamp: this.submissionTimestamps.get(questionId)
        };
    }
    
    /**
     * Validate an answer for a specific question
     * @param {string} questionId - Question ID
     * @param {any} answer - Answer to validate
     * @returns {Object} Validation result
     */
    validateAnswer(questionId, answer) {
        const question = this.getQuestionById(questionId);
        if (!question) {
            return { isValid: false, error: 'Question not found' };
        }
        
        const rule = this.validationRules.get(question.type);
        if (!rule) {
            return { isValid: false, error: `No validation rule for question type: ${question.type}` };
        }
        
        const validation = rule.validate(answer, question);
        if (validation.isValid) {
            validation.isCorrect = rule.isCorrect(answer, question);
        }
        
        return validation;
    }
    
    /**
     * Get answer for a specific question
     * @param {string} questionId - Question ID
     * @returns {any} User's answer or undefined
     */
    getAnswer(questionId) {
        return this.answers.get(questionId);
    }
    
    /**
     * Get all answers
     * @returns {Map} All answers
     */
    getAllAnswers() {
        return new Map(this.answers);
    }
    
    /**
     * Check if a question has been answered
     * @param {string} questionId - Question ID
     * @returns {boolean} Whether question is answered
     */
    isAnswered(questionId) {
        return this.answers.has(questionId);
    }
    
    /**
     * Get the number of answered questions
     * @returns {number} Count of answered questions
     */
    getAnsweredCount() {
        return this.answers.size;
    }
    
    /**
     * Check if all questions have been answered
     * @returns {boolean} Whether all questions are answered
     */
    areAllQuestionsAnswered() {
        return this.answers.size === this.quiz.questions.length;
    }
    
    /**
     * Get validation result for a question
     * @param {string} questionId - Question ID
     * @returns {Object|undefined} Validation result
     */
    getValidationResult(questionId) {
        return this.validationResults.get(questionId);
    }
    
    /**
     * Get all validation results
     * @returns {Map} All validation results
     */
    getAllValidationResults() {
        return new Map(this.validationResults);
    }
    
    /**
     * Calculate current score based on answered questions
     * @returns {Object} Score information
     */
    calculateCurrentScore() {
        let correctCount = 0;
        let totalAnswered = 0;
        
        for (const [questionId, answer] of this.answers) {
            const question = this.getQuestionById(questionId);
            if (question) {
                totalAnswered++;
                const rule = this.validationRules.get(question.type);
                if (rule && rule.isCorrect(answer, question)) {
                    correctCount++;
                }
            }
        }
        
        return {
            correctCount,
            totalAnswered,
            totalQuestions: this.quiz.questions.length,
            currentScore: totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0,
            projectedScore: Math.round((correctCount / this.quiz.questions.length) * 100),
            completionPercentage: Math.round((totalAnswered / this.quiz.questions.length) * 100)
        };
    }
    
    /**
     * Generate final results for quiz completion
     * @returns {Object} Final quiz results
     */
    generateFinalResults() {
        const endTime = new Date();
        const timeSpent = Math.round((endTime - this.startTime) / 1000);
        
        const answerRecords = [];
        let correctCount = 0;
        
        for (const question of this.quiz.questions) {
            const userAnswer = this.answers.get(question.id);
            const validation = this.validationResults.get(question.id);
            const isCorrect = validation ? validation.isCorrect : false;
            
            if (isCorrect) correctCount++;
            
            answerRecords.push({
                questionId: question.id,
                userAnswer: userAnswer !== undefined ? userAnswer : null,
                isCorrect,
                explanation: question.explanation || 'No explanation available',
                submittedAt: this.submissionTimestamps.get(question.id) || null
            });
        }
        
        const score = Math.round((correctCount / this.quiz.questions.length) * 100);
        
        return {
            id: `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            quizId: this.quiz.id,
            userId: this.storageManager.getUserId(),
            score,
            correctCount,
            totalQuestions: this.quiz.questions.length,
            answers: answerRecords,
            completedAt: endTime,
            startedAt: this.startTime,
            timeSpent,
            metadata: {
                answeredCount: this.answers.size,
                validAnswers: answerRecords.filter(a => a.userAnswer !== null).length,
                averageTimePerQuestion: this.answers.size > 0 ? Math.round(timeSpent / this.answers.size) : 0
            }
        };
    }
    
    /**
     * Save current progress to storage
     * @returns {Promise<boolean>} Success status
     */
    async saveProgress() {
        try {
            const progressData = {
                quizId: this.quiz.id,
                answers: Object.fromEntries(this.answers),
                validationResults: Object.fromEntries(this.validationResults),
                submissionTimestamps: Object.fromEntries(
                    Array.from(this.submissionTimestamps.entries()).map(([k, v]) => [k, v.toISOString()])
                ),
                startTime: this.startTime.toISOString(),
                lastSaveTime: new Date().toISOString()
            };
            
            localStorage.setItem(`quiz-progress-${this.quiz.id}`, JSON.stringify(progressData));
            this.lastSaveTime = new Date();
            
            return true;
        } catch (error) {
            console.error('Failed to save progress:', error);
            return false;
        }
    }
    
    /**
     * Load progress from storage
     * @returns {Promise<boolean>} Success status
     */
    async loadProgress() {
        try {
            const savedData = localStorage.getItem(`quiz-progress-${this.quiz.id}`);
            if (!savedData) return false;
            
            const progressData = JSON.parse(savedData);
            
            // Restore answers
            if (progressData.answers) {
                this.answers = new Map(Object.entries(progressData.answers));
            }
            
            // Restore validation results
            if (progressData.validationResults) {
                this.validationResults = new Map(Object.entries(progressData.validationResults));
            }
            
            // Restore timestamps
            if (progressData.submissionTimestamps) {
                this.submissionTimestamps = new Map(
                    Object.entries(progressData.submissionTimestamps).map(([k, v]) => [k, new Date(v)])
                );
            }
            
            // Restore start time
            if (progressData.startTime) {
                this.startTime = new Date(progressData.startTime);
            }
            
            if (progressData.lastSaveTime) {
                this.lastSaveTime = new Date(progressData.lastSaveTime);
            }
            
            return true;
        } catch (error) {
            console.error('Failed to load progress:', error);
            return false;
        }
    }
    
    /**
     * Clear saved progress
     * @returns {Promise<boolean>} Success status
     */
    async clearProgress() {
        try {
            localStorage.removeItem(`quiz-progress-${this.quiz.id}`);
            return true;
        } catch (error) {
            console.error('Failed to clear progress:', error);
            return false;
        }
    }
    
    /**
     * Get progress statistics
     * @returns {Object} Progress statistics
     */
    getProgressStats() {
        const currentTime = new Date();
        const elapsedTime = Math.round((currentTime - this.startTime) / 1000);
        
        return {
            totalQuestions: this.quiz.questions.length,
            answeredQuestions: this.answers.size,
            remainingQuestions: this.quiz.questions.length - this.answers.size,
            completionPercentage: Math.round((this.answers.size / this.quiz.questions.length) * 100),
            elapsedTime,
            averageTimePerQuestion: this.answers.size > 0 ? Math.round(elapsedTime / this.answers.size) : 0,
            lastSaveTime: this.lastSaveTime,
            hasUnsavedChanges: this.lastSaveTime ? this.submissionTimestamps.size > 0 && 
                Math.max(...Array.from(this.submissionTimestamps.values())) > this.lastSaveTime : true
        };
    }
    
    /**
     * Validate all current answers
     * @returns {Object} Validation summary
     */
    validateAllAnswers() {
        const results = {
            valid: 0,
            invalid: 0,
            missing: 0,
            errors: []
        };
        
        for (const question of this.quiz.questions) {
            if (this.answers.has(question.id)) {
                const validation = this.validateAnswer(question.id, this.answers.get(question.id));
                if (validation.isValid) {
                    results.valid++;
                } else {
                    results.invalid++;
                    results.errors.push({
                        questionId: question.id,
                        error: validation.error
                    });
                }
            } else {
                results.missing++;
            }
        }
        
        return results;
    }
    
    /**
     * Get question by ID
     * @param {string} questionId - Question ID
     * @returns {Object|null} Question object
     * @private
     */
    getQuestionById(questionId) {
        return this.quiz.questions.find(q => q.id === questionId) || null;
    }
    
    /**
     * Reset all answers and progress
     */
    reset() {
        this.answers.clear();
        this.validationResults.clear();
        this.submissionTimestamps.clear();
        this.startTime = new Date();
        this.lastSaveTime = null;
    }
    
    /**
     * Export answers for external processing
     * @returns {Object} Exported answer data
     */
    exportAnswers() {
        return {
            quizId: this.quiz.id,
            quizTitle: this.quiz.title,
            startTime: this.startTime.toISOString(),
            answers: Object.fromEntries(this.answers),
            validationResults: Object.fromEntries(this.validationResults),
            submissionTimestamps: Object.fromEntries(
                Array.from(this.submissionTimestamps.entries()).map(([k, v]) => [k, v.toISOString()])
            ),
            stats: this.getProgressStats(),
            score: this.calculateCurrentScore()
        };
    }
}