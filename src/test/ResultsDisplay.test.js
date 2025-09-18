/**
 * Unit tests for ResultsDisplay component
 */

import { ResultsDisplay } from '../components/ResultsDisplay.js';
import { QUESTION_TYPES } from '../models/types.js';

// Mock DOM environment
const mockContainer = {
    innerHTML: '',
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => [])
};

// Mock storage manager
const mockStorageManager = {
    getUserId: vi.fn(() => 'user-123')
};

describe('ResultsDisplay', () => {
    let resultsDisplay;
    let mockResult;
    let mockQuiz;

    beforeEach(() => {
        resultsDisplay = new ResultsDisplay(mockContainer, mockStorageManager);
        
        // Reset mocks
        mockContainer.innerHTML = '';
        mockContainer.querySelector.mockClear();
        mockContainer.querySelectorAll.mockClear();

        // Create mock quiz
        mockQuiz = {
            id: 'quiz-12345678',
            title: 'Sample Quiz',
            description: 'A sample quiz for testing',
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

        // Create mock result
        mockResult = {
            id: 'result-12345678',
            quizId: 'quiz-12345678',
            userId: 'user-123',
            score: 67,
            totalQuestions: 3,
            correctCount: 2,
            answers: [
                {
                    questionId: 'question-1',
                    userAnswer: 1,
                    isCorrect: true,
                    explanation: '2+2 equals 4'
                },
                {
                    questionId: 'question-2',
                    userAnswer: [1, 2],
                    isCorrect: false,
                    explanation: '2 and 4 are even numbers'
                },
                {
                    questionId: 'question-3',
                    userAnswer: 'paris',
                    isCorrect: true,
                    explanation: 'Paris is the capital of France'
                }
            ],
            completedAt: new Date('2023-01-01T12:00:00Z'),
            timeSpent: 180,
            grade: 'D+',
            metadata: {
                answeredCount: 3,
                skippedCount: 0,
                averageTimePerQuestion: 60,
                accuracy: 67,
                completionRate: 100
            }
        };
    });

    describe('constructor', () => {
        it('should initialize with container and storage manager', () => {
            expect(resultsDisplay.container).toBe(mockContainer);
            expect(resultsDisplay.storageManager).toBe(mockStorageManager);
            expect(resultsDisplay.currentResult).toBeNull();
            expect(resultsDisplay.currentQuiz).toBeNull();
        });
    });

    describe('displayResults', () => {
        it('should display results when valid data is provided', async () => {
            await resultsDisplay.displayResults(mockResult, mockQuiz);
            
            expect(mockContainer.innerHTML).toContain('Quiz Results');
            expect(mockContainer.innerHTML).toContain('Sample Quiz');
            expect(mockContainer.innerHTML).toContain('67%');
            expect(mockContainer.innerHTML).toContain('D+');
            expect(resultsDisplay.currentResult).toBe(mockResult);
            expect(resultsDisplay.currentQuiz).toBe(mockQuiz);
        });

        it('should display error when invalid data is provided', async () => {
            await resultsDisplay.displayResults(null, mockQuiz);
            
            expect(mockContainer.innerHTML).toContain('Invalid result or quiz data');
        });
    });

    describe('generateSummaryHTML', () => {
        it('should generate correct summary HTML', () => {
            const html = resultsDisplay.generateSummaryHTML(mockResult, mockQuiz);
            
            expect(html).toContain('67%');
            expect(html).toContain('D+');
            expect(html).toContain('2 / 3');
            expect(html).toContain('3m');
            expect(html).toContain('below-average');
        });
    });

    describe('generateDetailsHTML', () => {
        it('should generate detailed results HTML', () => {
            const html = resultsDisplay.generateDetailsHTML(mockResult, mockQuiz);
            
            expect(html).toContain('Question-by-Question Results');
            expect(html).toContain('What is 2+2?');
            expect(html).toContain('Which are even numbers?');
            expect(html).toContain('What is the capital of France?');
        });
    });

    describe('generateQuestionResultHTML', () => {
        it('should generate correct HTML for correct answer', () => {
            const question = mockQuiz.questions[0];
            const answer = mockResult.answers[0];
            
            const html = resultsDisplay.generateQuestionResultHTML(question, answer, 1);
            
            expect(html).toContain('Question 1');
            expect(html).toContain('correct');
            expect(html).toContain('✓');
            expect(html).toContain('What is 2+2?');
            expect(html).toContain('4'); // User's correct answer
        });

        it('should generate correct HTML for incorrect answer', () => {
            const question = mockQuiz.questions[1];
            const answer = mockResult.answers[1];
            
            const html = resultsDisplay.generateQuestionResultHTML(question, answer, 2);
            
            expect(html).toContain('Question 2');
            expect(html).toContain('incorrect');
            expect(html).toContain('✗');
            expect(html).toContain('Which are even numbers?');
            expect(html).toContain('Correct Answer:');
        });
    });

    describe('formatUserAnswer', () => {
        it('should format MCQ single answer correctly', () => {
            const question = mockQuiz.questions[0];
            const html = resultsDisplay.formatUserAnswer(question, 1);
            
            expect(html).toContain('4');
            expect(html).toContain('option-text');
        });

        it('should format MCQ multiple answer correctly', () => {
            const question = mockQuiz.questions[1];
            const html = resultsDisplay.formatUserAnswer(question, [1, 3]);
            
            expect(html).toContain('2');
            expect(html).toContain('4');
            expect(html).toContain('option-text');
        });

        it('should format text input answer correctly', () => {
            const question = mockQuiz.questions[2];
            const html = resultsDisplay.formatUserAnswer(question, 'Paris');
            
            expect(html).toContain('Paris');
            expect(html).toContain('text-answer');
        });

        it('should handle null answer', () => {
            const question = mockQuiz.questions[0];
            const html = resultsDisplay.formatUserAnswer(question, null);
            
            expect(html).toContain('No answer provided');
        });
    });

    describe('formatCorrectAnswer', () => {
        it('should format MCQ single correct answer', () => {
            const question = mockQuiz.questions[0];
            const html = resultsDisplay.formatCorrectAnswer(question);
            
            expect(html).toContain('4');
            expect(html).toContain('option-text');
        });

        it('should format MCQ multiple correct answers', () => {
            const question = mockQuiz.questions[1];
            const html = resultsDisplay.formatCorrectAnswer(question);
            
            expect(html).toContain('2');
            expect(html).toContain('4');
            expect(html).toContain('option-text');
        });

        it('should format text input correct answer', () => {
            const question = mockQuiz.questions[2];
            const html = resultsDisplay.formatCorrectAnswer(question);
            
            expect(html).toContain('Paris');
            expect(html).toContain('text-answer');
        });
    });

    describe('getScoreClass', () => {
        it('should return correct CSS classes for different scores', () => {
            expect(resultsDisplay.getScoreClass(95)).toBe('excellent');
            expect(resultsDisplay.getScoreClass(85)).toBe('good');
            expect(resultsDisplay.getScoreClass(75)).toBe('average');
            expect(resultsDisplay.getScoreClass(65)).toBe('below-average');
            expect(resultsDisplay.getScoreClass(45)).toBe('poor');
        });
    });

    describe('calculateGrade', () => {
        it('should calculate correct letter grades', () => {
            expect(resultsDisplay.calculateGrade(98)).toBe('A+');
            expect(resultsDisplay.calculateGrade(95)).toBe('A');
            expect(resultsDisplay.calculateGrade(91)).toBe('A-');
            expect(resultsDisplay.calculateGrade(87)).toBe('B+');
            expect(resultsDisplay.calculateGrade(85)).toBe('B');
            expect(resultsDisplay.calculateGrade(80)).toBe('B-');
            expect(resultsDisplay.calculateGrade(50)).toBe('F');
        });
    });

    describe('formatTime', () => {
        it('should format time correctly', () => {
            expect(resultsDisplay.formatTime(30)).toBe('30s');
            expect(resultsDisplay.formatTime(90)).toBe('1m 30s');
            expect(resultsDisplay.formatTime(120)).toBe('2m');
            expect(resultsDisplay.formatTime(3600)).toBe('1h');
            expect(resultsDisplay.formatTime(3720)).toBe('1h 2m');
        });
    });

    describe('generateMediaHTML', () => {
        it('should generate image HTML for image media', () => {
            const media = { type: 'image', url: 'test.jpg' };
            const html = resultsDisplay.generateMediaHTML(media);
            
            expect(html).toContain('<img');
            expect(html).toContain('test.jpg');
            expect(html).toContain('question-media');
        });

        it('should return empty string for unknown media type', () => {
            const media = { type: 'video', url: 'test.mp4' };
            const html = resultsDisplay.generateMediaHTML(media);
            
            expect(html).toBe('');
        });
    });

    describe('setEventHandlers', () => {
        it('should set event handlers correctly', () => {
            const handlers = {
                onRetakeQuiz: vi.fn(),
                onBackToDashboard: vi.fn(),
                onViewExplanation: vi.fn()
            };

            resultsDisplay.setEventHandlers(handlers);

            expect(resultsDisplay.onRetakeQuiz).toBe(handlers.onRetakeQuiz);
            expect(resultsDisplay.onBackToDashboard).toBe(handlers.onBackToDashboard);
            expect(resultsDisplay.onViewExplanation).toBe(handlers.onViewExplanation);
        });
    });

    describe('clear', () => {
        it('should clear the display and reset state', () => {
            resultsDisplay.currentResult = mockResult;
            resultsDisplay.currentQuiz = mockQuiz;
            
            resultsDisplay.clear();
            
            expect(mockContainer.innerHTML).toBe('');
            expect(resultsDisplay.currentResult).toBeNull();
            expect(resultsDisplay.currentQuiz).toBeNull();
        });
    });

    describe('displayError', () => {
        it('should display error message', () => {
            resultsDisplay.displayError('Test error message');
            
            expect(mockContainer.innerHTML).toContain('Error');
            expect(mockContainer.innerHTML).toContain('Test error message');
            expect(mockContainer.innerHTML).toContain('Back to Dashboard');
        });
    });

    describe('formatExplanationText', () => {
        it('should format simple text', () => {
            const text = 'This is a simple explanation.';
            const formatted = resultsDisplay.formatExplanationText(text);
            
            expect(formatted).toBe('<p>This is a simple explanation.</p>');
        });

        it('should format numbered lists', () => {
            const text = '1. First point\n2. Second point\n3. Third point';
            const formatted = resultsDisplay.formatExplanationText(text);
            
            expect(formatted).toContain('<ol>');
            expect(formatted).toContain('<li>First point</li>');
            expect(formatted).toContain('<li>Second point</li>');
        });

        it('should format bullet points', () => {
            const text = '• First bullet\n• Second bullet\n- Third bullet';
            const formatted = resultsDisplay.formatExplanationText(text);
            
            expect(formatted).toContain('<ul>');
            expect(formatted).toContain('<li>First bullet</li>');
        });

        it('should handle empty text', () => {
            const formatted = resultsDisplay.formatExplanationText('');
            expect(formatted).toBe('No explanation available.');
        });
    });
});