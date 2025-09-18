/**
 * Tests for Question Rendering Components
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { 
    QuestionRenderer, 
    MCQSingleRenderer, 
    MCQMultipleRenderer, 
    TextInputRenderer,
    createQuestionRenderer 
} from '../components/QuestionRenderer.js';
import { QUESTION_TYPES } from '../models/types.js';

// Mock DOM environment for testing
function setupDOM() {
    if (typeof document === 'undefined') {
        global.document = {
            createElement: (tag) => ({
                tagName: tag.toUpperCase(),
                className: '',
                innerHTML: '',
                addEventListener: () => {},
                querySelector: () => null,
                querySelectorAll: () => []
            })
        };
    }
}

describe('QuestionRenderer Components', () => {
    let mockOnAnswerChange;
    
    beforeEach(() => {
        setupDOM();
        mockOnAnswerChange = vi.fn();
    });

    describe('MCQSingleRenderer', () => {
        const sampleQuestion = {
            id: 'q1',
            type: QUESTION_TYPES.MCQ_SINGLE,
            question: 'What is the capital of France?',
            options: ['London', 'Berlin', 'Paris', 'Madrid'],
            correctAnswer: 2,
            explanation: 'Paris is the capital of France.'
        };

        test('should create MCQ single renderer', () => {
            const renderer = new MCQSingleRenderer(sampleQuestion, mockOnAnswerChange);
            expect(renderer).toBeInstanceOf(MCQSingleRenderer);
            expect(renderer.question).toBe(sampleQuestion);
            expect(renderer.onAnswerChange).toBe(mockOnAnswerChange);
        });

        test('should render HTML structure for MCQ single', () => {
            const renderer = new MCQSingleRenderer(sampleQuestion, mockOnAnswerChange);
            const html = renderer.getHTML();
            
            expect(html).toContain('question-header');
            expect(html).toContain('question-text');
            expect(html).toContain(sampleQuestion.question);
            expect(html).toContain('mcq-options');
            expect(html).toContain('type="radio"');
            
            // Should contain all options
            sampleQuestion.options.forEach(option => {
                expect(html).toContain(option);
            });
        });

        test('should validate answer correctly', () => {
            const renderer = new MCQSingleRenderer(sampleQuestion, mockOnAnswerChange);
            
            // Invalid answers
            expect(renderer.validateAnswer()).toBe(false);
            
            renderer.setUserAnswer(-1);
            expect(renderer.validateAnswer()).toBe(false);
            
            renderer.setUserAnswer(4);
            expect(renderer.validateAnswer()).toBe(false);
            
            // Valid answers
            renderer.setUserAnswer(0);
            expect(renderer.validateAnswer()).toBe(true);
            
            renderer.setUserAnswer(2);
            expect(renderer.validateAnswer()).toBe(true);
        });

        test('should handle answer changes', () => {
            const renderer = new MCQSingleRenderer(sampleQuestion, mockOnAnswerChange);
            
            renderer.setUserAnswer(2);
            
            expect(mockOnAnswerChange).toHaveBeenCalledWith('q1', 2);
            expect(renderer.getUserAnswer()).toBe(2);
        });
    });

    describe('MCQMultipleRenderer', () => {
        const sampleQuestion = {
            id: 'q2',
            type: QUESTION_TYPES.MCQ_MULTIPLE,
            question: 'Which of the following are programming languages?',
            options: ['JavaScript', 'HTML', 'Python', 'CSS'],
            correctAnswers: [0, 2],
            explanation: 'JavaScript and Python are programming languages.'
        };

        test('should create MCQ multiple renderer', () => {
            const renderer = new MCQMultipleRenderer(sampleQuestion, mockOnAnswerChange);
            expect(renderer).toBeInstanceOf(MCQMultipleRenderer);
            expect(renderer.userAnswer).toEqual([]);
        });

        test('should render HTML structure for MCQ multiple', () => {
            const renderer = new MCQMultipleRenderer(sampleQuestion, mockOnAnswerChange);
            const html = renderer.getHTML();
            
            expect(html).toContain('mcq-options mcq-multiple');
            expect(html).toContain('type="checkbox"');
            
            // Should contain all options
            sampleQuestion.options.forEach(option => {
                expect(html).toContain(option);
            });
        });

        test('should validate answer correctly', () => {
            const renderer = new MCQMultipleRenderer(sampleQuestion, mockOnAnswerChange);
            
            // Invalid answers
            expect(renderer.validateAnswer()).toBe(false);
            
            // Valid answers
            renderer.setUserAnswer([0]);
            expect(renderer.validateAnswer()).toBe(true);
            
            renderer.setUserAnswer([0, 2]);
            expect(renderer.validateAnswer()).toBe(true);
        });

        test('should handle multiple answer selection', () => {
            const renderer = new MCQMultipleRenderer(sampleQuestion, mockOnAnswerChange);
            
            // Simulate selecting multiple answers
            renderer.userAnswer = [0];
            renderer.userAnswer.push(2);
            renderer.setUserAnswer([...renderer.userAnswer]);
            
            expect(mockOnAnswerChange).toHaveBeenCalledWith('q2', [0, 2]);
            expect(renderer.getUserAnswer()).toEqual([0, 2]);
        });
    });

    describe('TextInputRenderer', () => {
        const sampleQuestion = {
            id: 'q3',
            type: QUESTION_TYPES.TEXT_INPUT,
            question: 'What is 2 + 2?',
            correctAnswer: '4',
            caseSensitive: false,
            explanation: '2 + 2 equals 4.'
        };

        test('should create text input renderer', () => {
            const renderer = new TextInputRenderer(sampleQuestion, mockOnAnswerChange);
            expect(renderer).toBeInstanceOf(TextInputRenderer);
        });

        test('should render HTML structure for text input', () => {
            const renderer = new TextInputRenderer(sampleQuestion, mockOnAnswerChange);
            const html = renderer.getHTML();
            
            expect(html).toContain('text-input-container');
            expect(html).toContain('text-input-field');
            expect(html).toContain('type="text"');
            expect(html).toContain('not case-sensitive');
        });

        test('should render case-sensitive hint when applicable', () => {
            const caseSensitiveQuestion = {
                ...sampleQuestion,
                caseSensitive: true
            };
            
            const renderer = new TextInputRenderer(caseSensitiveQuestion, mockOnAnswerChange);
            const html = renderer.getHTML();
            
            expect(html).toContain('case-sensitive');
        });

        test('should validate answer correctly', () => {
            const renderer = new TextInputRenderer(sampleQuestion, mockOnAnswerChange);
            
            // Invalid answers
            expect(renderer.validateAnswer()).toBe(false);
            
            renderer.setUserAnswer('');
            expect(renderer.validateAnswer()).toBe(false);
            
            renderer.setUserAnswer('   ');
            expect(renderer.validateAnswer()).toBe(false);
            
            // Valid answers
            renderer.setUserAnswer('4');
            expect(renderer.validateAnswer()).toBe(true);
            
            renderer.setUserAnswer('some answer');
            expect(renderer.validateAnswer()).toBe(true);
        });

        test('should check correctness with case sensitivity', () => {
            const renderer = new TextInputRenderer(sampleQuestion, mockOnAnswerChange);
            
            renderer.setUserAnswer('4');
            expect(renderer.isCorrect()).toBe(true);
            
            renderer.setUserAnswer('4.0');
            expect(renderer.isCorrect()).toBe(false);
        });

        test('should check correctness without case sensitivity', () => {
            const caseSensitiveQuestion = {
                ...sampleQuestion,
                correctAnswer: 'Paris',
                caseSensitive: false
            };
            
            const renderer = new TextInputRenderer(caseSensitiveQuestion, mockOnAnswerChange);
            
            renderer.setUserAnswer('paris');
            expect(renderer.isCorrect()).toBe(true);
            
            renderer.setUserAnswer('PARIS');
            expect(renderer.isCorrect()).toBe(true);
            
            renderer.setUserAnswer('Paris');
            expect(renderer.isCorrect()).toBe(true);
        });

        test('should check correctness with case sensitivity', () => {
            const caseSensitiveQuestion = {
                ...sampleQuestion,
                correctAnswer: 'Paris',
                caseSensitive: true
            };
            
            const renderer = new TextInputRenderer(caseSensitiveQuestion, mockOnAnswerChange);
            
            renderer.setUserAnswer('Paris');
            expect(renderer.isCorrect()).toBe(true);
            
            renderer.setUserAnswer('paris');
            expect(renderer.isCorrect()).toBe(false);
            
            renderer.setUserAnswer('PARIS');
            expect(renderer.isCorrect()).toBe(false);
        });
    });

    describe('createQuestionRenderer factory', () => {
        test('should create MCQ single renderer', () => {
            const question = {
                id: 'q1',
                type: QUESTION_TYPES.MCQ_SINGLE,
                question: 'Test question',
                options: ['A', 'B'],
                correctAnswer: 0
            };
            
            const renderer = createQuestionRenderer(question, mockOnAnswerChange);
            expect(renderer).toBeInstanceOf(MCQSingleRenderer);
        });

        test('should create MCQ multiple renderer', () => {
            const question = {
                id: 'q2',
                type: QUESTION_TYPES.MCQ_MULTIPLE,
                question: 'Test question',
                options: ['A', 'B'],
                correctAnswers: [0]
            };
            
            const renderer = createQuestionRenderer(question, mockOnAnswerChange);
            expect(renderer).toBeInstanceOf(MCQMultipleRenderer);
        });

        test('should create text input renderer', () => {
            const question = {
                id: 'q3',
                type: QUESTION_TYPES.TEXT_INPUT,
                question: 'Test question',
                correctAnswer: 'answer',
                caseSensitive: false
            };
            
            const renderer = createQuestionRenderer(question, mockOnAnswerChange);
            expect(renderer).toBeInstanceOf(TextInputRenderer);
        });

        test('should throw error for unsupported question type', () => {
            const question = {
                id: 'q4',
                type: 'unsupported-type',
                question: 'Test question'
            };
            
            expect(() => {
                createQuestionRenderer(question, mockOnAnswerChange);
            }).toThrow('Unsupported question type: unsupported-type');
        });
    });

    describe('Question with media', () => {
        test('should render image media', () => {
            const questionWithImage = {
                id: 'q1',
                type: QUESTION_TYPES.MCQ_SINGLE,
                question: 'What do you see in this image?',
                options: ['Cat', 'Dog', 'Bird'],
                correctAnswer: 0,
                media: {
                    type: 'image',
                    url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
                }
            };
            
            const renderer = new MCQSingleRenderer(questionWithImage, mockOnAnswerChange);
            const html = renderer.getHTML();
            
            expect(html).toContain('question-media');
            expect(html).toContain('question-image');
            expect(html).toContain(questionWithImage.media.url);
        });

        test('should not render media when not present', () => {
            const questionWithoutMedia = {
                id: 'q1',
                type: QUESTION_TYPES.MCQ_SINGLE,
                question: 'Simple question',
                options: ['A', 'B'],
                correctAnswer: 0
            };
            
            const renderer = new MCQSingleRenderer(questionWithoutMedia, mockOnAnswerChange);
            const html = renderer.getHTML();
            
            expect(html).not.toContain('question-media');
            expect(html).not.toContain('question-image');
        });
    });
});