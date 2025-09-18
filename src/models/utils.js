/**
 * Utility functions for question type validation and data model operations
 */

import { QUESTION_TYPES } from './types.js';
import { 
  isValidMCQSingleQuestion, 
  isValidMCQMultipleQuestion, 
  isValidTextInputQuestion 
} from './validation.js';

/**
 * Generates a unique ID for data models
 * @returns {string} Unique identifier
 */
export function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : 
    'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

/**
 * Validates question type and returns specific validation result
 * @param {any} question - Question object to validate
 * @returns {Object} Validation result with type and validity
 */
export function validateQuestionType(question) {
  if (!question || typeof question !== 'object') {
    return { isValid: false, type: null, error: 'Invalid question object' };
  }

  const { type } = question;
  
  switch (type) {
    case QUESTION_TYPES.MCQ_SINGLE:
      return {
        isValid: isValidMCQSingleQuestion(question),
        type: QUESTION_TYPES.MCQ_SINGLE,
        error: isValidMCQSingleQuestion(question) ? null : 'Invalid MCQ single question format'
      };
      
    case QUESTION_TYPES.MCQ_MULTIPLE:
      return {
        isValid: isValidMCQMultipleQuestion(question),
        type: QUESTION_TYPES.MCQ_MULTIPLE,
        error: isValidMCQMultipleQuestion(question) ? null : 'Invalid MCQ multiple question format'
      };
      
    case QUESTION_TYPES.TEXT_INPUT:
      return {
        isValid: isValidTextInputQuestion(question),
        type: QUESTION_TYPES.TEXT_INPUT,
        error: isValidTextInputQuestion(question) ? null : 'Invalid text input question format'
      };
      
    default:
      return {
        isValid: false,
        type: null,
        error: `Unknown question type: ${type}`
      };
  }
}

/**
 * Checks if a user answer is correct for a given question
 * @param {Object} question - Question object
 * @param {any} userAnswer - User's answer
 * @returns {boolean} True if answer is correct
 */
export function isAnswerCorrect(question, userAnswer) {
  const validation = validateQuestionType(question);
  if (!validation.isValid) return false;

  switch (question.type) {
    case QUESTION_TYPES.MCQ_SINGLE:
      return typeof userAnswer === 'number' && userAnswer === question.correctAnswer;
      
    case QUESTION_TYPES.MCQ_MULTIPLE:
      if (!Array.isArray(userAnswer)) return false;
      const sortedUserAnswer = [...userAnswer].sort((a, b) => a - b);
      const sortedCorrectAnswers = [...question.correctAnswers].sort((a, b) => a - b);
      return JSON.stringify(sortedUserAnswer) === JSON.stringify(sortedCorrectAnswers);
      
    case QUESTION_TYPES.TEXT_INPUT:
      if (typeof userAnswer !== 'string') return false;
      const userText = question.caseSensitive ? userAnswer : userAnswer.toLowerCase();
      const correctText = question.caseSensitive ? question.correctAnswer : question.correctAnswer.toLowerCase();
      return userText.trim() === correctText.trim();
      
    default:
      return false;
  }
}

/**
 * Calculates score percentage for quiz results
 * @param {number} correctAnswers - Number of correct answers
 * @param {number} totalQuestions - Total number of questions
 * @returns {number} Score as percentage (0-100)
 */
export function calculateScore(correctAnswers, totalQuestions) {
  if (totalQuestions === 0) return 0;
  return Math.round((correctAnswers / totalQuestions) * 100);
}

/**
 * Creates a default quiz settings object
 * @returns {Object} Default quiz settings
 */
export function createDefaultQuizSettings() {
  return {
    shuffleQuestions: false,
    showExplanations: true,
    timeLimit: undefined
  };
}

/**
 * Creates a default user preferences object
 * @returns {Object} Default user preferences
 */
export function createDefaultUserPreferences() {
  return {
    apiKeys: {},
    preferences: {
      theme: 'light',
      defaultQuizSettings: createDefaultQuizSettings()
    }
  };
}

/**
 * Sanitizes question text to prevent XSS
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validates and sanitizes a question object
 * @param {Object} question - Question to sanitize
 * @returns {Object|null} Sanitized question or null if invalid
 */
export function sanitizeQuestion(question) {
  const validation = validateQuestionType(question);
  if (!validation.isValid) return null;

  const sanitized = {
    ...question,
    question: sanitizeText(question.question),
    explanation: sanitizeText(question.explanation)
  };

  // Sanitize options for MCQ questions
  if (question.type === QUESTION_TYPES.MCQ_SINGLE || question.type === QUESTION_TYPES.MCQ_MULTIPLE) {
    sanitized.options = question.options.map(option => sanitizeText(option));
  }

  // Sanitize correct answer for text input questions
  if (question.type === QUESTION_TYPES.TEXT_INPUT) {
    sanitized.correctAnswer = sanitizeText(question.correctAnswer);
  }

  return sanitized;
}

/**
 * Shuffles an array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} New shuffled array
 */
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deep clones an object
 * @param {any} obj - Object to clone
 * @returns {any} Deep cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (Array.isArray(obj)) return obj.map(item => deepClone(item));
  
  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}