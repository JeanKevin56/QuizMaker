/**
 * Unit tests for Quiz Platform data models and validation
 */

import { describe, it, expect } from 'vitest';
import {
    QUESTION_TYPES,
    THEMES,
    MEDIA_TYPES,
    isValidString,
    isValidId,
    isValidDate,
    isValidMedia,
    isValidMCQSingleQuestion,
    isValidMCQMultipleQuestion,
    isValidTextInputQuestion,
    isValidQuestion,
    isValidQuizSettings,
    isValidQuiz,
    isValidAnswerRecord,
    isValidResult,
    isValidAPIKeys,
    isValidPreferences,
    isValidUserPreferences,
    validateQuestionType,
    isAnswerCorrect,
    calculateScore,
    createDefaultQuizSettings,
    createDefaultUserPreferences,
    sanitizeText,
    sanitizeQuestion,
    generateId,
    shuffleArray,
    deepClone
} from '../models/index.js';

describe('Basic Validation Functions', () => {
    describe('isValidString', () => {
        it('should return true for valid non-empty strings', () => {
            expect(isValidString('hello')).toBe(true);
            expect(isValidString('test question')).toBe(true);
        });

        it('should return false for invalid strings', () => {
            expect(isValidString('')).toBe(false);
            expect(isValidString('   ')).toBe(false);
            expect(isValidString(null)).toBe(false);
            expect(isValidString(undefined)).toBe(false);
            expect(isValidString(123)).toBe(false);
        });
    });

    describe('isValidId', () => {
        it('should return true for valid UUIDs', () => {
            expect(isValidId('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
        });

        it('should return true for custom IDs with minimum length', () => {
            expect(isValidId('custom-id-123')).toBe(true);
            expect(isValidId('12345678')).toBe(true);
        });

        it('should return false for invalid IDs', () => {
            expect(isValidId('short')).toBe(false);
            expect(isValidId('')).toBe(false);
            expect(isValidId(null)).toBe(false);
            expect(isValidId(123)).toBe(false);
        });
    });

    describe('isValidDate', () => {
        it('should return true for valid Date objects', () => {
            expect(isValidDate(new Date())).toBe(true);
            expect(isValidDate(new Date('2023-01-01'))).toBe(true);
        });

        it('should return true for valid ISO date strings', () => {
            expect(isValidDate('2023-01-01T00:00:00.000Z')).toBe(true);
            expect(isValidDate('2023-12-31')).toBe(true);
        });

        it('should return false for invalid dates', () => {
            expect(isValidDate(new Date('invalid'))).toBe(false);
            expect(isValidDate('not-a-date')).toBe(false);
            expect(isValidDate(null)).toBe(false);
            expect(isValidDate(123)).toBe(false);
        });
    });

    describe('isValidMedia', () => {
        it('should return true for valid media objects', () => {
            expect(isValidMedia({ type: 'image', url: 'data:image/png;base64,abc123' })).toBe(true);
            expect(isValidMedia({ type: 'image', url: 'https://example.com/image.png' })).toBe(true);
        });

        it('should return true for undefined media (optional)', () => {
            expect(isValidMedia(undefined)).toBe(true);
            expect(isValidMedia(null)).toBe(true);
        });

        it('should return false for invalid media objects', () => {
            expect(isValidMedia({ type: 'invalid', url: 'test' })).toBe(false);
            expect(isValidMedia({ type: 'image' })).toBe(false);
            expect(isValidMedia({ url: 'test' })).toBe(false);
        });
    });
});

describe('Question Validation', () => {
    const baseQuestion = {
        id: 'question-123456',
        question: 'What is 2 + 2?',
        explanation: 'Basic arithmetic'
    };

    describe('isValidMCQSingleQuestion', () => {
        it('should validate correct MCQ single questions', () => {
            const question = {
                ...baseQuestion,
                type: QUESTION_TYPES.MCQ_SINGLE,
                options: ['2', '3', '4', '5'],
                correctAnswer: 2
            };
            expect(isValidMCQSingleQuestion(question)).toBe(true);
        });

        it('should reject invalid MCQ single questions', () => {
            // Missing options
            expect(isValidMCQSingleQuestion({
                ...baseQuestion,
                type: QUESTION_TYPES.MCQ_SINGLE,
                correctAnswer: 0
            })).toBe(false);

            // Invalid correct answer index
            expect(isValidMCQSingleQuestion({
                ...baseQuestion,
                type: QUESTION_TYPES.MCQ_SINGLE,
                options: ['A', 'B'],
                correctAnswer: 5
            })).toBe(false);

            // Too few options
            expect(isValidMCQSingleQuestion({
                ...baseQuestion,
                type: QUESTION_TYPES.MCQ_SINGLE,
                options: ['A'],
                correctAnswer: 0
            })).toBe(false);
        });
    });

    describe('isValidMCQMultipleQuestion', () => {
        it('should validate correct MCQ multiple questions', () => {
            const question = {
                ...baseQuestion,
                type: QUESTION_TYPES.MCQ_MULTIPLE,
                options: ['A', 'B', 'C', 'D'],
                correctAnswers: [0, 2]
            };
            expect(isValidMCQMultipleQuestion(question)).toBe(true);
        });

        it('should reject invalid MCQ multiple questions', () => {
            // Empty correct answers
            expect(isValidMCQMultipleQuestion({
                ...baseQuestion,
                type: QUESTION_TYPES.MCQ_MULTIPLE,
                options: ['A', 'B'],
                correctAnswers: []
            })).toBe(false);

            // Duplicate correct answers
            expect(isValidMCQMultipleQuestion({
                ...baseQuestion,
                type: QUESTION_TYPES.MCQ_MULTIPLE,
                options: ['A', 'B', 'C'],
                correctAnswers: [0, 0, 1]
            })).toBe(false);

            // Invalid answer index
            expect(isValidMCQMultipleQuestion({
                ...baseQuestion,
                type: QUESTION_TYPES.MCQ_MULTIPLE,
                options: ['A', 'B'],
                correctAnswers: [0, 5]
            })).toBe(false);
        });
    });

    describe('isValidTextInputQuestion', () => {
        it('should validate correct text input questions', () => {
            const question = {
                ...baseQuestion,
                type: QUESTION_TYPES.TEXT_INPUT,
                correctAnswer: 'Paris',
                caseSensitive: false
            };
            expect(isValidTextInputQuestion(question)).toBe(true);
        });

        it('should reject invalid text input questions', () => {
            // Missing correctAnswer
            expect(isValidTextInputQuestion({
                ...baseQuestion,
                type: QUESTION_TYPES.TEXT_INPUT,
                caseSensitive: true
            })).toBe(false);

            // Missing caseSensitive
            expect(isValidTextInputQuestion({
                ...baseQuestion,
                type: QUESTION_TYPES.TEXT_INPUT,
                correctAnswer: 'test'
            })).toBe(false);

            // Invalid caseSensitive type
            expect(isValidTextInputQuestion({
                ...baseQuestion,
                type: QUESTION_TYPES.TEXT_INPUT,
                correctAnswer: 'test',
                caseSensitive: 'false'
            })).toBe(false);
        });
    });

    describe('isValidQuestion', () => {
        it('should validate questions of all types', () => {
            const mcqSingle = {
                ...baseQuestion,
                type: QUESTION_TYPES.MCQ_SINGLE,
                options: ['A', 'B'],
                correctAnswer: 0
            };
            expect(isValidQuestion(mcqSingle)).toBe(true);

            const mcqMultiple = {
                ...baseQuestion,
                type: QUESTION_TYPES.MCQ_MULTIPLE,
                options: ['A', 'B', 'C'],
                correctAnswers: [0, 2]
            };
            expect(isValidQuestion(mcqMultiple)).toBe(true);

            const textInput = {
                ...baseQuestion,
                type: QUESTION_TYPES.TEXT_INPUT,
                correctAnswer: 'answer',
                caseSensitive: false
            };
            expect(isValidQuestion(textInput)).toBe(true);
        });

        it('should reject invalid questions', () => {
            expect(isValidQuestion(null)).toBe(false);
            expect(isValidQuestion({ type: 'invalid' })).toBe(false);
            expect(isValidQuestion({})).toBe(false);
        });
    });
});

describe('Quiz and Settings Validation', () => {
    describe('isValidQuizSettings', () => {
        it('should validate correct quiz settings', () => {
            const settings = {
                shuffleQuestions: true,
                showExplanations: false,
                timeLimit: 30
            };
            expect(isValidQuizSettings(settings)).toBe(true);

            // Without timeLimit
            const settingsNoTime = {
                shuffleQuestions: false,
                showExplanations: true
            };
            expect(isValidQuizSettings(settingsNoTime)).toBe(true);
        });

        it('should reject invalid quiz settings', () => {
            expect(isValidQuizSettings(null)).toBe(false);
            expect(isValidQuizSettings({})).toBe(false);
            expect(isValidQuizSettings({
                shuffleQuestions: 'true',
                showExplanations: false
            })).toBe(false);
            expect(isValidQuizSettings({
                shuffleQuestions: true,
                showExplanations: false,
                timeLimit: -5
            })).toBe(false);
        });
    });

    describe('isValidQuiz', () => {
        const validQuestion = {
            id: 'question-12345',
            type: QUESTION_TYPES.MCQ_SINGLE,
            question: 'Test?',
            explanation: 'Test explanation',
            options: ['A', 'B'],
            correctAnswer: 0
        };

        it('should validate correct quiz objects', () => {
            const quiz = {
                id: 'quiz-123456',
                title: 'Test Quiz',
                description: 'A test quiz',
                questions: [validQuestion],
                createdAt: new Date(),
                updatedAt: new Date(),
                settings: {
                    shuffleQuestions: false,
                    showExplanations: true
                }
            };
            expect(isValidQuiz(quiz)).toBe(true);
        });

        it('should reject invalid quiz objects', () => {
            // Empty questions array
            expect(isValidQuiz({
                id: 'quiz-123456',
                title: 'Test',
                description: 'Test',
                questions: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                settings: { shuffleQuestions: false, showExplanations: true }
            })).toBe(false);

            // Invalid question
            expect(isValidQuiz({
                id: 'quiz-123456',
                title: 'Test',
                description: 'Test',
                questions: [{ invalid: 'question' }],
                createdAt: new Date(),
                updatedAt: new Date(),
                settings: { shuffleQuestions: false, showExplanations: true }
            })).toBe(false);
        });
    });
});

describe('Result Validation', () => {
    describe('isValidAnswerRecord', () => {
        it('should validate correct answer records', () => {
            const answer = {
                questionId: 'question-12345',
                userAnswer: 0,
                isCorrect: true,
                explanation: 'Correct!'
            };
            expect(isValidAnswerRecord(answer)).toBe(true);
        });

        it('should reject invalid answer records', () => {
            expect(isValidAnswerRecord(null)).toBe(false);
            expect(isValidAnswerRecord({
                questionId: 'q1',
                isCorrect: true,
                explanation: 'test'
                // missing userAnswer
            })).toBe(false);
        });
    });

    describe('isValidResult', () => {
        const validAnswers = [{
            questionId: 'question-12345',
            userAnswer: 0,
            isCorrect: true,
            explanation: 'Correct'
        }];

        it('should validate correct result objects', () => {
            const result = {
                id: 'result-123456',
                quizId: 'quiz-123456',
                userId: 'user-123456',
                score: 100,
                totalQuestions: 1,
                answers: validAnswers,
                completedAt: new Date(),
                timeSpent: 120
            };
            expect(isValidResult(result)).toBe(true);
        });

        it('should reject invalid result objects', () => {
            // Score out of range
            expect(isValidResult({
                id: 'result-123456',
                quizId: 'quiz-123456',
                userId: 'user-123456',
                score: 150,
                totalQuestions: 1,
                answers: validAnswers,
                completedAt: new Date(),
                timeSpent: 120
            })).toBe(false);

            // Mismatched answers length
            expect(isValidResult({
                id: 'result-123456',
                quizId: 'quiz-123456',
                userId: 'user-123456',
                score: 100,
                totalQuestions: 2,
                answers: validAnswers, // only 1 answer
                completedAt: new Date(),
                timeSpent: 120
            })).toBe(false);
        });
    });
});

describe('User Preferences Validation', () => {
    describe('isValidAPIKeys', () => {
        it('should validate correct API keys objects', () => {
            expect(isValidAPIKeys({})).toBe(true);
            expect(isValidAPIKeys({ gemini: 'api-key-123456' })).toBe(true);
        });

        it('should reject invalid API keys', () => {
            expect(isValidAPIKeys(null)).toBe(false);
            expect(isValidAPIKeys({ gemini: '' })).toBe(false);
            expect(isValidAPIKeys({ gemini: 123 })).toBe(false);
        });
    });

    describe('isValidUserPreferences', () => {
        it('should validate correct user preferences', () => {
            const prefs = {
                apiKeys: { gemini: 'key-123456' },
                preferences: {
                    theme: THEMES.LIGHT,
                    defaultQuizSettings: {
                        shuffleQuestions: false,
                        showExplanations: true
                    }
                }
            };
            expect(isValidUserPreferences(prefs)).toBe(true);
        });

        it('should reject invalid user preferences', () => {
            expect(isValidUserPreferences(null)).toBe(false);
            expect(isValidUserPreferences({
                apiKeys: {},
                preferences: {
                    theme: 'invalid-theme',
                    defaultQuizSettings: { shuffleQuestions: false, showExplanations: true }
                }
            })).toBe(false);
        });
    });
});

describe('Utility Functions', () => {
    describe('validateQuestionType', () => {
        it('should return validation results for different question types', () => {
            const mcqSingle = {
                id: 'question-12345',
                type: QUESTION_TYPES.MCQ_SINGLE,
                question: 'Test?',
                explanation: 'Test',
                options: ['A', 'B'],
                correctAnswer: 0
            };

            const result = validateQuestionType(mcqSingle);
            expect(result.isValid).toBe(true);
            expect(result.type).toBe(QUESTION_TYPES.MCQ_SINGLE);
            expect(result.error).toBeNull();
        });

        it('should return error for invalid questions', () => {
            const result = validateQuestionType({ type: 'invalid' });
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('Unknown question type');
        });
    });

    describe('isAnswerCorrect', () => {
        it('should correctly validate MCQ single answers', () => {
            const question = {
                id: 'question-12345',
                type: QUESTION_TYPES.MCQ_SINGLE,
                question: 'Test?',
                explanation: 'Test',
                options: ['A', 'B', 'C'],
                correctAnswer: 1
            };

            expect(isAnswerCorrect(question, 1)).toBe(true);
            expect(isAnswerCorrect(question, 0)).toBe(false);
            expect(isAnswerCorrect(question, 'B')).toBe(false); // Wrong type
        });

        it('should correctly validate MCQ multiple answers', () => {
            const question = {
                id: 'question-12345',
                type: QUESTION_TYPES.MCQ_MULTIPLE,
                question: 'Test?',
                explanation: 'Test',
                options: ['A', 'B', 'C', 'D'],
                correctAnswers: [0, 2]
            };

            expect(isAnswerCorrect(question, [0, 2])).toBe(true);
            expect(isAnswerCorrect(question, [2, 0])).toBe(true); // Order doesn't matter
            expect(isAnswerCorrect(question, [0, 1])).toBe(false);
            expect(isAnswerCorrect(question, [0])).toBe(false); // Incomplete
        });

        it('should correctly validate text input answers', () => {
            const question = {
                id: 'question-12345',
                type: QUESTION_TYPES.TEXT_INPUT,
                question: 'Capital of France?',
                explanation: 'Test',
                correctAnswer: 'Paris',
                caseSensitive: false
            };

            expect(isAnswerCorrect(question, 'Paris')).toBe(true);
            expect(isAnswerCorrect(question, 'paris')).toBe(true); // Case insensitive
            expect(isAnswerCorrect(question, ' Paris ')).toBe(true); // Trimmed
            expect(isAnswerCorrect(question, 'London')).toBe(false);

            // Case sensitive version
            const caseSensitiveQuestion = { ...question, caseSensitive: true };
            expect(isAnswerCorrect(caseSensitiveQuestion, 'Paris')).toBe(true);
            expect(isAnswerCorrect(caseSensitiveQuestion, 'paris')).toBe(false);
        });
    });

    describe('calculateScore', () => {
        it('should calculate correct percentages', () => {
            expect(calculateScore(5, 10)).toBe(50);
            expect(calculateScore(10, 10)).toBe(100);
            expect(calculateScore(0, 10)).toBe(0);
            expect(calculateScore(3, 4)).toBe(75);
        });

        it('should handle edge cases', () => {
            expect(calculateScore(0, 0)).toBe(0);
            expect(calculateScore(1, 3)).toBe(33); // Rounded
        });
    });

    describe('sanitizeText', () => {
        it('should sanitize HTML characters', () => {
            expect(sanitizeText('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
            expect(sanitizeText('Hello & "World"')).toBe('Hello &amp; &quot;World&quot;');
        });

        it('should handle non-string inputs', () => {
            expect(sanitizeText(null)).toBe('');
            expect(sanitizeText(undefined)).toBe('');
            expect(sanitizeText(123)).toBe('');
        });
    });

    describe('generateId', () => {
        it('should generate unique IDs', () => {
            const id1 = generateId();
            const id2 = generateId();
            expect(id1).not.toBe(id2);
            expect(typeof id1).toBe('string');
            expect(id1.length).toBeGreaterThan(8);
        });
    });

    describe('shuffleArray', () => {
        it('should return array with same elements', () => {
            const original = [1, 2, 3, 4, 5];
            const shuffled = shuffleArray(original);

            expect(shuffled).toHaveLength(original.length);
            expect(shuffled.sort()).toEqual(original.sort());
            expect(shuffled).not.toBe(original); // Different reference
        });
    });

    describe('deepClone', () => {
        it('should create deep copies of objects', () => {
            const original = {
                a: 1,
                b: { c: 2, d: [3, 4] },
                e: new Date('2023-01-01')
            };

            const cloned = deepClone(original);

            expect(cloned).toEqual(original);
            expect(cloned).not.toBe(original);
            expect(cloned.b).not.toBe(original.b);
            expect(cloned.b.d).not.toBe(original.b.d);
            expect(cloned.e).not.toBe(original.e);
        });

        it('should handle primitive values', () => {
            expect(deepClone(null)).toBe(null);
            expect(deepClone(undefined)).toBe(undefined);
            expect(deepClone(42)).toBe(42);
            expect(deepClone('string')).toBe('string');
        });
    });

    describe('createDefaultQuizSettings', () => {
        it('should create valid default settings', () => {
            const settings = createDefaultQuizSettings();
            expect(isValidQuizSettings(settings)).toBe(true);
            expect(settings.shuffleQuestions).toBe(false);
            expect(settings.showExplanations).toBe(true);
            expect(settings.timeLimit).toBeUndefined();
        });
    });

    describe('createDefaultUserPreferences', () => {
        it('should create valid default preferences', () => {
            const prefs = createDefaultUserPreferences();
            expect(isValidUserPreferences(prefs)).toBe(true);
            expect(prefs.preferences.theme).toBe(THEMES.LIGHT);
        });
    });
});