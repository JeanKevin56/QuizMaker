/**
 * Unit tests for ScoringService
 */

import { ScoringService } from '../services/ScoringService.js';
import { QUESTION_TYPES } from '../models/types.js';

describe('ScoringService', () => {
    let scoringService;
    let mockQuiz;
    let mockAnswers;
    let mockValidationResults;
    let mockSubmissionTimestamps;

    beforeEach(() => {
        scoringService = new ScoringService();
        
        // Create mock quiz
        mockQuiz = {
            id: 'quiz-12345678',
            title: 'Test Quiz',
            description: 'A test quiz',
            questions: [
                {
                    id: 'question-1',
                    type: QUESTION_TYPES.MCQ_SINGLE,
                    question: 'What is 2+2?',
                    options: ['3', '4', '5', '6'],
                    correctAnswer: 1,
                    explanation: '2+2 equals 4'
                },
                {
                    id: 'question-2',
                    type: QUESTION_TYPES.MCQ_MULTIPLE,
                    question: 'Which are even numbers?',
                    options: ['1', '2', '3', '4'],
                    correctAnswers: [1, 3],
                    explanation: '2 and 4 are even numbers'
                },
                {
                    id: 'question-3',
                    type: QUESTION_TYPES.TEXT_INPUT,
                    question: 'What is the capital of France?',
                    correctAnswer: 'Paris',
                    caseSensitive: false,
                    explanation: 'Paris is the capital of France'
                }
            ]
        };

        // Create mock answers (all correct)
        mockAnswers = new Map([
            ['question-1', 1],
            ['question-2', [1, 3]],
            ['question-3', 'paris']
        ]);

        // Create mock validation results (all correct)
        mockValidationResults = new Map([
            ['question-1', { isValid: true, isCorrect: true }],
            ['question-2', { isValid: true, isCorrect: true }],
            ['question-3', { isValid: true, isCorrect: true }]
        ]);

        // Create mock timestamps
        const now = new Date();
        mockSubmissionTimestamps = new Map([
            ['question-1', new Date(now.getTime() - 60000)],
            ['question-2', new Date(now.getTime() - 30000)],
            ['question-3', now]
        ]);
    });

    describe('calculateQuizResult', () => {
        it('should calculate perfect score for all correct answers', () => {
            const startTime = new Date(Date.now() - 120000); // 2 minutes ago
            const endTime = new Date();
            const userId = 'user-123';

            const result = scoringService.calculateQuizResult(
                mockQuiz,
                mockAnswers,
                mockValidationResults,
                mockSubmissionTimestamps,
                startTime,
                endTime,
                userId
            );

            expect(result.score).toBe(100);
            expect(result.correctCount).toBe(3);
            expect(result.totalQuestions).toBe(3);
            expect(result.earnedPoints).toBe(3);
            expect(result.totalPoints).toBe(3);
            expect(result.grade).toBe('A+');
            expect(result.quizId).toBe('quiz-12345678');
            expect(result.userId).toBe('user-123');
            expect(result.answers).toHaveLength(3);
            expect(result.timeSpent).toBeGreaterThan(0);
        });

        it('should calculate partial score for mixed answers', () => {
            // Make one answer incorrect
            mockAnswers.set('question-1', 0); // Wrong answer
            mockValidationResults.set('question-1', { isValid: true, isCorrect: false });

            const startTime = new Date(Date.now() - 120000);
            const endTime = new Date();
            const userId = 'user-123';

            const result = scoringService.calculateQuizResult(
                mockQuiz,
                mockAnswers,
                mockValidationResults,
                mockSubmissionTimestamps,
                startTime,
                endTime,
                userId
            );

            expect(result.score).toBe(67); // 2/3 = 66.67, rounded to 67
            expect(result.correctCount).toBe(2);
            expect(result.earnedPoints).toBe(2);
            expect(result.grade).toBe('D+');
        });

        it('should handle missing answers', () => {
            // Remove one answer
            mockAnswers.delete('question-2');
            mockValidationResults.delete('question-2');
            mockSubmissionTimestamps.delete('question-2');

            const startTime = new Date(Date.now() - 120000);
            const endTime = new Date();
            const userId = 'user-123';

            const result = scoringService.calculateQuizResult(
                mockQuiz,
                mockAnswers,
                mockValidationResults,
                mockSubmissionTimestamps,
                startTime,
                endTime,
                userId
            );

            expect(result.score).toBe(67); // 2/3 correct
            expect(result.correctCount).toBe(2);
            expect(result.answers).toHaveLength(3);
            
            // Check that missing answer is recorded as null
            const missingAnswer = result.answers.find(a => a.questionId === 'question-2');
            expect(missingAnswer.userAnswer).toBeNull();
            expect(missingAnswer.isCorrect).toBe(false);
        });

        it('should throw error for invalid quiz data', () => {
            expect(() => {
                scoringService.calculateQuizResult(
                    null,
                    mockAnswers,
                    mockValidationResults,
                    mockSubmissionTimestamps,
                    new Date(),
                    new Date(),
                    'user-123'
                );
            }).toThrow('Invalid quiz data for scoring');
        });
    });

    describe('calculateGrade', () => {
        it('should assign correct letter grades', () => {
            expect(scoringService.calculateGrade(98)).toBe('A+');
            expect(scoringService.calculateGrade(95)).toBe('A');
            expect(scoringService.calculateGrade(91)).toBe('A-');
            expect(scoringService.calculateGrade(87)).toBe('B+');
            expect(scoringService.calculateGrade(85)).toBe('B');
            expect(scoringService.calculateGrade(80)).toBe('B-');
            expect(scoringService.calculateGrade(77)).toBe('C+');
            expect(scoringService.calculateGrade(75)).toBe('C');
            expect(scoringService.calculateGrade(70)).toBe('C-');
            expect(scoringService.calculateGrade(67)).toBe('D+');
            expect(scoringService.calculateGrade(65)).toBe('D');
            expect(scoringService.calculateGrade(60)).toBe('D-');
            expect(scoringService.calculateGrade(50)).toBe('F');
            expect(scoringService.calculateGrade(0)).toBe('F');
        });
    });

    describe('getQuestionPoints', () => {
        it('should return 1 point for all question types by default', () => {
            const mcqSingle = { type: QUESTION_TYPES.MCQ_SINGLE };
            const mcqMultiple = { type: QUESTION_TYPES.MCQ_MULTIPLE };
            const textInput = { type: QUESTION_TYPES.TEXT_INPUT };

            expect(scoringService.getQuestionPoints(mcqSingle)).toBe(1);
            expect(scoringService.getQuestionPoints(mcqMultiple)).toBe(1);
            expect(scoringService.getQuestionPoints(textInput)).toBe(1);
        });
    });

    describe('validateAnswerForQuestion', () => {
        it('should validate MCQ single answers correctly', () => {
            const question = mockQuiz.questions[0]; // MCQ single
            
            expect(scoringService.validateAnswerForQuestion(1, question)).toBe(true);
            expect(scoringService.validateAnswerForQuestion(0, question)).toBe(false);
            expect(scoringService.validateAnswerForQuestion(null, question)).toBe(false);
        });

        it('should validate MCQ multiple answers correctly', () => {
            const question = mockQuiz.questions[1]; // MCQ multiple
            
            expect(scoringService.validateAnswerForQuestion([1, 3], question)).toBe(true);
            expect(scoringService.validateAnswerForQuestion([3, 1], question)).toBe(true); // Order doesn't matter
            expect(scoringService.validateAnswerForQuestion([1], question)).toBe(false);
            expect(scoringService.validateAnswerForQuestion([1, 2, 3], question)).toBe(false);
            expect(scoringService.validateAnswerForQuestion(null, question)).toBe(false);
        });

        it('should validate text input answers correctly', () => {
            const question = mockQuiz.questions[2]; // Text input
            
            expect(scoringService.validateAnswerForQuestion('Paris', question)).toBe(true);
            expect(scoringService.validateAnswerForQuestion('paris', question)).toBe(true); // Case insensitive
            expect(scoringService.validateAnswerForQuestion('PARIS', question)).toBe(true);
            expect(scoringService.validateAnswerForQuestion('London', question)).toBe(false);
            expect(scoringService.validateAnswerForQuestion(null, question)).toBe(false);
        });

        it('should handle case sensitive text input', () => {
            const question = {
                ...mockQuiz.questions[2],
                caseSensitive: true
            };
            
            expect(scoringService.validateAnswerForQuestion('Paris', question)).toBe(true);
            expect(scoringService.validateAnswerForQuestion('paris', question)).toBe(false);
            expect(scoringService.validateAnswerForQuestion('PARIS', question)).toBe(false);
        });
    });

    describe('calculateMetadata', () => {
        it('should calculate correct metadata', () => {
            const answerRecords = [
                { questionId: 'question-1', userAnswer: 1, isCorrect: true },
                { questionId: 'question-2', userAnswer: [1, 3], isCorrect: true },
                { questionId: 'question-3', userAnswer: null, isCorrect: false }
            ];
            const timeSpent = 120; // 2 minutes

            const metadata = scoringService.calculateMetadata(answerRecords, timeSpent, mockQuiz);

            expect(metadata.answeredCount).toBe(2);
            expect(metadata.skippedCount).toBe(1);
            expect(metadata.averageTimePerQuestion).toBe(60); // 120/2
            expect(metadata.completionRate).toBe(67); // 2/3 * 100, rounded
            expect(metadata.accuracy).toBe(100); // 2/2 answered correctly
            expect(metadata.performanceByType).toBeDefined();
        });
    });

    describe('calculateResultStatistics', () => {
        it('should calculate statistics for multiple results', () => {
            const results = [
                { score: 80, timeSpent: 120, grade: 'B-' },
                { score: 90, timeSpent: 100, grade: 'A-' },
                { score: 70, timeSpent: 150, grade: 'C-' }
            ];

            const stats = scoringService.calculateResultStatistics(results);

            expect(stats.totalAttempts).toBe(3);
            expect(stats.averageScore).toBe(80);
            expect(stats.highestScore).toBe(90);
            expect(stats.lowestScore).toBe(70);
            expect(stats.averageTime).toBe(123); // (120+100+150)/3 rounded
            expect(stats.gradeDistribution['B-']).toBe(1);
            expect(stats.gradeDistribution['A-']).toBe(1);
            expect(stats.gradeDistribution['C-']).toBe(1);
            expect(stats.improvementTrend).toBe(-10); // 70 - 80
        });

        it('should handle empty results array', () => {
            const stats = scoringService.calculateResultStatistics([]);

            expect(stats.totalAttempts).toBe(0);
            expect(stats.averageScore).toBe(0);
            expect(stats.highestScore).toBe(0);
            expect(stats.lowestScore).toBe(0);
            expect(stats.improvementTrend).toBeNull();
        });
    });

    describe('recalculateResult', () => {
        it('should recalculate result with updated quiz', () => {
            // Create original result
            const originalResult = {
                id: 'result-12345678',
                quizId: 'quiz-12345678',
                userId: 'user-123',
                score: 100,
                correctCount: 3,
                totalQuestions: 3,
                timeSpent: 120,
                answers: [
                    { questionId: 'question-1', userAnswer: 1, isCorrect: true },
                    { questionId: 'question-2', userAnswer: [1, 3], isCorrect: true },
                    { questionId: 'question-3', userAnswer: 'paris', isCorrect: true }
                ]
            };

            // Update quiz to change correct answer for q1
            const updatedQuiz = {
                ...mockQuiz,
                questions: [
                    { ...mockQuiz.questions[0], correctAnswer: 0 }, // Changed from 1 to 0
                    mockQuiz.questions[1],
                    mockQuiz.questions[2]
                ]
            };

            const recalculatedResult = scoringService.recalculateResult(originalResult, updatedQuiz);

            expect(recalculatedResult.score).toBe(67); // Now 2/3 correct
            expect(recalculatedResult.correctCount).toBe(2);
            expect(recalculatedResult.answers[0].isCorrect).toBe(false); // question-1 now incorrect
            expect(recalculatedResult.recalculatedAt).toBeDefined();
        });
    });

    describe('grade thresholds', () => {
        it('should allow custom grade thresholds', () => {
            const customThresholds = {
                'A': 90,
                'B': 80,
                'C': 70,
                'D': 60,
                'F': 0
            };

            scoringService.setGradeThresholds(customThresholds);
            
            expect(scoringService.calculateGrade(95)).toBe('A');
            expect(scoringService.calculateGrade(85)).toBe('B');
            expect(scoringService.calculateGrade(75)).toBe('C');
            expect(scoringService.calculateGrade(65)).toBe('D');
            expect(scoringService.calculateGrade(55)).toBe('F');
        });

        it('should return current grade thresholds', () => {
            const thresholds = scoringService.getGradeThresholds();
            expect(thresholds).toHaveProperty('A+');
            expect(thresholds).toHaveProperty('F');
            expect(typeof thresholds['A+']).toBe('number');
        });
    });

    describe('generateResultId', () => {
        it('should generate unique result IDs', () => {
            const id1 = scoringService.generateResultId();
            const id2 = scoringService.generateResultId();
            
            expect(id1).toMatch(/^result_\d+_[a-z0-9]+$/);
            expect(id2).toMatch(/^result_\d+_[a-z0-9]+$/);
            expect(id1).not.toBe(id2);
        });
    });
});