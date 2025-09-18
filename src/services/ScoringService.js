/**
 * Scoring Service for Quiz Platform
 * Handles score calculation, grade assignment, and result data structure creation
 */

import { QUESTION_TYPES } from '../models/types.js';
import { isValidResult } from '../models/validation.js';

export class ScoringService {
    constructor() {
        // Grade thresholds (can be customized)
        this.gradeThresholds = {
            'A+': 97,
            'A': 93,
            'A-': 90,
            'B+': 87,
            'B': 83,
            'B-': 80,
            'C+': 77,
            'C': 73,
            'C-': 70,
            'D+': 67,
            'D': 63,
            'D-': 60,
            'F': 0
        };
    }

    /**
     * Calculate score for a completed quiz
     * @param {Object} quiz - Quiz object
     * @param {Map} answers - Map of questionId -> userAnswer
     * @param {Map} validationResults - Map of questionId -> validation result
     * @param {Map} submissionTimestamps - Map of questionId -> timestamp
     * @param {Date} startTime - Quiz start time
     * @param {Date} endTime - Quiz completion time
     * @param {string} userId - User ID
     * @returns {Object} Complete result object
     */
    calculateQuizResult(quiz, answers, validationResults, submissionTimestamps, startTime, endTime, userId) {
        if (!quiz || !quiz.questions || quiz.questions.length === 0) {
            throw new Error('Invalid quiz data for scoring');
        }

        const answerRecords = [];
        let correctCount = 0;
        let totalPoints = 0;
        let earnedPoints = 0;

        // Process each question
        for (const question of quiz.questions) {
            const userAnswer = answers.get(question.id);
            const validation = validationResults.get(question.id);
            const submittedAt = submissionTimestamps.get(question.id);
            
            // Determine if answer is correct
            const isCorrect = validation ? validation.isCorrect : false;
            if (isCorrect) correctCount++;

            // Calculate points for this question (all questions worth 1 point by default)
            const questionPoints = this.getQuestionPoints(question);
            totalPoints += questionPoints;
            
            if (isCorrect) {
                earnedPoints += questionPoints;
            }

            // Create answer record
            answerRecords.push({
                questionId: question.id,
                userAnswer: userAnswer !== undefined ? userAnswer : null,
                isCorrect,
                explanation: question.explanation || 'No explanation available'
            });
        }

        // Calculate percentage score
        const percentageScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
        
        // Calculate time spent
        const timeSpent = Math.round((endTime - startTime) / 1000);

        // Generate result ID
        const resultId = this.generateResultId();

        // Create result object
        const result = {
            id: resultId,
            quizId: quiz.id,
            userId: userId,
            score: percentageScore,
            totalQuestions: quiz.questions.length,
            answers: answerRecords,
            completedAt: endTime,
            timeSpent,
            // Additional fields for extended functionality
            correctCount,
            earnedPoints,
            totalPoints,
            startedAt: startTime,
            grade: this.calculateGrade(percentageScore),
            metadata: this.calculateMetadata(answerRecords, timeSpent, quiz)
        };

        // Validate result before returning
        if (!isValidResult(result)) {
            throw new Error('Generated result failed validation');
        }

        return result;
    }

    /**
     * Calculate score from AnswerCollector data
     * @param {AnswerCollector} answerCollector - Answer collector instance
     * @param {string} userId - User ID
     * @returns {Object} Complete result object
     */
    calculateFromAnswerCollector(answerCollector, userId) {
        const endTime = new Date();
        
        return this.calculateQuizResult(
            answerCollector.quiz,
            answerCollector.getAllAnswers(),
            answerCollector.getAllValidationResults(),
            answerCollector.submissionTimestamps,
            answerCollector.startTime,
            endTime,
            userId
        );
    }

    /**
     * Get points value for a question (can be customized per question type)
     * @param {Object} question - Question object
     * @returns {number} Points for this question
     */
    getQuestionPoints(question) {
        // Default: all questions worth 1 point
        // Can be extended to support weighted questions
        switch (question.type) {
            case QUESTION_TYPES.MCQ_SINGLE:
                return 1;
            case QUESTION_TYPES.MCQ_MULTIPLE:
                return 1; // Could be worth more due to complexity
            case QUESTION_TYPES.TEXT_INPUT:
                return 1;
            default:
                return 1;
        }
    }

    /**
     * Calculate letter grade from percentage score
     * @param {number} percentageScore - Score as percentage (0-100)
     * @returns {string} Letter grade
     */
    calculateGrade(percentageScore) {
        for (const [grade, threshold] of Object.entries(this.gradeThresholds)) {
            if (percentageScore >= threshold) {
                return grade;
            }
        }
        return 'F';
    }

    /**
     * Calculate detailed metadata for the result
     * @param {Array} answerRecords - Array of answer records
     * @param {number} timeSpent - Time spent in seconds
     * @param {Object} quiz - Quiz object
     * @returns {Object} Metadata object
     */
    calculateMetadata(answerRecords, timeSpent, quiz) {
        const answeredCount = answerRecords.filter(a => a.userAnswer !== null).length;
        const skippedCount = answerRecords.filter(a => a.userAnswer === null).length;
        
        // Calculate performance by question type
        const performanceByType = {};
        for (const question of quiz.questions) {
            const type = question.type;
            if (!performanceByType[type]) {
                performanceByType[type] = { correct: 0, total: 0 };
            }
            performanceByType[type].total++;
            
            const answerRecord = answerRecords.find(a => a.questionId === question.id);
            if (answerRecord && answerRecord.isCorrect) {
                performanceByType[type].correct++;
            }
        }

        // Calculate performance percentages
        for (const type in performanceByType) {
            const perf = performanceByType[type];
            perf.percentage = perf.total > 0 ? Math.round((perf.correct / perf.total) * 100) : 0;
        }

        return {
            answeredCount,
            skippedCount,
            averageTimePerQuestion: answeredCount > 0 ? Math.round(timeSpent / answeredCount) : 0,
            performanceByType,
            completionRate: Math.round((answeredCount / quiz.questions.length) * 100),
            accuracy: answeredCount > 0 ? Math.round((answerRecords.filter(a => a.isCorrect).length / answeredCount) * 100) : 0
        };
    }

    /**
     * Recalculate score for an existing result (useful for re-grading)
     * @param {Object} result - Existing result object
     * @param {Object} quiz - Quiz object (in case questions changed)
     * @returns {Object} Updated result object
     */
    recalculateResult(result, quiz) {
        if (!result || !quiz) {
            throw new Error('Invalid result or quiz data for recalculation');
        }

        let correctCount = 0;
        let totalPoints = 0;
        let earnedPoints = 0;

        // Recalculate based on current quiz data
        const updatedAnswers = result.answers.map(answerRecord => {
            const question = quiz.questions.find(q => q.id === answerRecord.questionId);
            if (!question) {
                // Question no longer exists, mark as incorrect
                return {
                    ...answerRecord,
                    isCorrect: false,
                    points: 0,
                    explanation: 'Question no longer exists in quiz'
                };
            }

            // Re-validate the answer
            const isCorrect = this.validateAnswerForQuestion(answerRecord.userAnswer, question);
            if (isCorrect) correctCount++;

            const questionPoints = this.getQuestionPoints(question);
            totalPoints += questionPoints;
            
            if (isCorrect) {
                earnedPoints += questionPoints;
            }

            return {
                ...answerRecord,
                isCorrect,
                points: isCorrect ? questionPoints : 0,
                maxPoints: questionPoints,
                explanation: question.explanation || 'No explanation available'
            };
        });

        // Calculate new percentage score
        const percentageScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

        // Update result
        const updatedResult = {
            ...result,
            score: percentageScore,
            correctCount,
            earnedPoints,
            totalPoints,
            answers: updatedAnswers,
            grade: this.calculateGrade(percentageScore),
            metadata: this.calculateMetadata(updatedAnswers, result.timeSpent, quiz),
            recalculatedAt: new Date()
        };

        return updatedResult;
    }

    /**
     * Validate an answer for a specific question (simplified version)
     * @param {any} userAnswer - User's answer
     * @param {Object} question - Question object
     * @returns {boolean} Whether answer is correct
     */
    validateAnswerForQuestion(userAnswer, question) {
        if (userAnswer === null || userAnswer === undefined) return false;

        switch (question.type) {
            case QUESTION_TYPES.MCQ_SINGLE:
                return userAnswer === question.correctAnswer;
                
            case QUESTION_TYPES.MCQ_MULTIPLE:
                if (!Array.isArray(userAnswer) || !Array.isArray(question.correctAnswers)) return false;
                if (userAnswer.length !== question.correctAnswers.length) return false;
                
                const sortedAnswer = [...userAnswer].sort((a, b) => a - b);
                const sortedCorrect = [...question.correctAnswers].sort((a, b) => a - b);
                
                return sortedAnswer.every((ans, index) => ans === sortedCorrect[index]);
                
            case QUESTION_TYPES.TEXT_INPUT:
                if (typeof userAnswer !== 'string') return false;
                
                const userText = userAnswer.trim();
                const correctText = question.correctAnswer.trim();
                
                return question.caseSensitive ? 
                    userText === correctText : 
                    userText.toLowerCase() === correctText.toLowerCase();
                    
            default:
                return false;
        }
    }

    /**
     * Generate a unique result ID
     * @returns {string} Unique result ID
     */
    generateResultId() {
        return `result_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    /**
     * Calculate statistics for multiple results
     * @param {Array} results - Array of result objects
     * @returns {Object} Statistics summary
     */
    calculateResultStatistics(results) {
        if (!results || results.length === 0) {
            return {
                totalAttempts: 0,
                averageScore: 0,
                highestScore: 0,
                lowestScore: 0,
                averageTime: 0,
                gradeDistribution: {},
                improvementTrend: null
            };
        }

        const scores = results.map(r => r.score);
        const times = results.map(r => r.timeSpent);
        
        // Calculate grade distribution
        const gradeDistribution = {};
        for (const result of results) {
            const grade = result.grade || this.calculateGrade(result.score);
            gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
        }

        // Calculate improvement trend (if results are chronologically ordered)
        let improvementTrend = null;
        if (results.length >= 2) {
            const firstScore = results[0].score;
            const lastScore = results[results.length - 1].score;
            improvementTrend = lastScore - firstScore;
        }

        return {
            totalAttempts: results.length,
            averageScore: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
            highestScore: Math.max(...scores),
            lowestScore: Math.min(...scores),
            averageTime: Math.round(times.reduce((sum, time) => sum + time, 0) / times.length),
            gradeDistribution,
            improvementTrend
        };
    }

    /**
     * Set custom grade thresholds
     * @param {Object} thresholds - Grade threshold object
     */
    setGradeThresholds(thresholds) {
        if (typeof thresholds === 'object' && thresholds !== null) {
            this.gradeThresholds = { ...thresholds };
        }
    }

    /**
     * Get current grade thresholds
     * @returns {Object} Current grade thresholds
     */
    getGradeThresholds() {
        return { ...this.gradeThresholds };
    }
}