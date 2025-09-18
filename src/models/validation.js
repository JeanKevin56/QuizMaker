/**
 * Validation functions for Quiz Platform data models
 */

import { QUESTION_TYPES, THEMES, MEDIA_TYPES } from './types.js';

/**
 * Validates if a value is a non-empty string
 * @param {any} value - Value to validate
 * @returns {boolean} True if valid string
 */
export function isValidString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validates if a value is a valid UUID or custom ID
 * @param {any} value - Value to validate
 * @returns {boolean} True if valid ID format
 */
export function isValidId(value) {
  if (!isValidString(value)) return false;
  // Allow custom IDs with minimum length of 8 characters for security
  return value.trim().length >= 8;
}

/**
 * Validates if a value is a valid Date object or ISO string
 * @param {any} value - Value to validate
 * @returns {boolean} True if valid date
 */
export function isValidDate(value) {
  if (value instanceof Date) {
    return !isNaN(value.getTime());
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }
  return false;
}

/**
 * Validates media object structure
 * @param {any} media - Media object to validate
 * @returns {boolean} True if valid media object
 */
export function isValidMedia(media) {
  if (!media) return true; // Media is optional
  
  return (
    typeof media === 'object' &&
    Object.values(MEDIA_TYPES).includes(media.type) &&
    isValidString(media.url)
  );
}

/**
 * Validates question base properties
 * @param {any} question - Question object to validate
 * @returns {boolean} True if valid base question
 */
function isValidQuestionBase(question) {
  if (!question || typeof question !== 'object') return false;
  
  return (
    isValidId(question.id) &&
    Object.values(QUESTION_TYPES).includes(question.type) &&
    isValidString(question.question) &&
    isValidString(question.explanation) &&
    isValidMedia(question.media)
  );
}

/**
 * Validates multiple choice single question
 * @param {any} question - Question object to validate
 * @returns {boolean} True if valid MCQ single question
 */
export function isValidMCQSingleQuestion(question) {
  if (!isValidQuestionBase(question) || question.type !== QUESTION_TYPES.MCQ_SINGLE) {
    return false;
  }
  
  return (
    Array.isArray(question.options) &&
    question.options.length >= 2 &&
    question.options.every(option => isValidString(option)) &&
    typeof question.correctAnswer === 'number' &&
    question.correctAnswer >= 0 &&
    question.correctAnswer < question.options.length
  );
}

/**
 * Validates multiple choice multiple question
 * @param {any} question - Question object to validate
 * @returns {boolean} True if valid MCQ multiple question
 */
export function isValidMCQMultipleQuestion(question) {
  if (!isValidQuestionBase(question) || question.type !== QUESTION_TYPES.MCQ_MULTIPLE) {
    return false;
  }
  
  return (
    Array.isArray(question.options) &&
    question.options.length >= 2 &&
    question.options.every(option => isValidString(option)) &&
    Array.isArray(question.correctAnswers) &&
    question.correctAnswers.length > 0 &&
    question.correctAnswers.every(answer => 
      typeof answer === 'number' && 
      answer >= 0 && 
      answer < question.options.length
    ) &&
    // Ensure no duplicate correct answers
    new Set(question.correctAnswers).size === question.correctAnswers.length
  );
}

/**
 * Validates text input question
 * @param {any} question - Question object to validate
 * @returns {boolean} True if valid text input question
 */
export function isValidTextInputQuestion(question) {
  if (!isValidQuestionBase(question) || question.type !== QUESTION_TYPES.TEXT_INPUT) {
    return false;
  }
  
  return (
    isValidString(question.correctAnswer) &&
    typeof question.caseSensitive === 'boolean'
  );
}

/**
 * Validates any question type
 * @param {any} question - Question object to validate
 * @returns {boolean} True if valid question
 */
export function isValidQuestion(question) {
  if (!question || typeof question !== 'object') return false;
  
  switch (question.type) {
    case QUESTION_TYPES.MCQ_SINGLE:
      return isValidMCQSingleQuestion(question);
    case QUESTION_TYPES.MCQ_MULTIPLE:
      return isValidMCQMultipleQuestion(question);
    case QUESTION_TYPES.TEXT_INPUT:
      return isValidTextInputQuestion(question);
    default:
      return false;
  }
}

/**
 * Validates quiz settings object
 * @param {any} settings - Settings object to validate
 * @returns {boolean} True if valid settings
 */
export function isValidQuizSettings(settings) {
  if (!settings || typeof settings !== 'object') return false;
  
  const validBase = (
    typeof settings.shuffleQuestions === 'boolean' &&
    typeof settings.showExplanations === 'boolean'
  );
  
  if (!validBase) return false;
  
  // timeLimit is optional, but if present must be a positive number
  if (settings.timeLimit !== undefined) {
    return typeof settings.timeLimit === 'number' && settings.timeLimit > 0;
  }
  
  return true;
}

/**
 * Validates quiz object
 * @param {any} quiz - Quiz object to validate
 * @returns {boolean} True if valid quiz
 */
export function isValidQuiz(quiz) {
  if (!quiz || typeof quiz !== 'object') return false;
  
  return (
    isValidId(quiz.id) &&
    isValidString(quiz.title) &&
    isValidString(quiz.description) &&
    Array.isArray(quiz.questions) &&
    quiz.questions.length > 0 &&
    quiz.questions.every(question => isValidQuestion(question)) &&
    isValidDate(quiz.createdAt) &&
    isValidDate(quiz.updatedAt) &&
    isValidQuizSettings(quiz.settings)
  );
}

/**
 * Validates answer record object
 * @param {any} answer - Answer record to validate
 * @returns {boolean} True if valid answer record
 */
export function isValidAnswerRecord(answer) {
  if (!answer || typeof answer !== 'object') return false;
  
  return (
    isValidId(answer.questionId) &&
    answer.userAnswer !== undefined && // Can be any type
    typeof answer.isCorrect === 'boolean' &&
    isValidString(answer.explanation)
  );
}

/**
 * Validates result object
 * @param {any} result - Result object to validate
 * @returns {boolean} True if valid result
 */
export function isValidResult(result) {
  if (!result || typeof result !== 'object') return false;
  
  return (
    isValidId(result.id) &&
    isValidId(result.quizId) &&
    isValidString(result.userId) &&
    typeof result.score === 'number' &&
    result.score >= 0 &&
    result.score <= 100 &&
    typeof result.totalQuestions === 'number' &&
    result.totalQuestions > 0 &&
    Array.isArray(result.answers) &&
    result.answers.length === result.totalQuestions &&
    result.answers.every(answer => isValidAnswerRecord(answer)) &&
    isValidDate(result.completedAt) &&
    typeof result.timeSpent === 'number' &&
    result.timeSpent >= 0
  );
}

/**
 * Validates API keys object
 * @param {any} apiKeys - API keys object to validate
 * @returns {boolean} True if valid API keys
 */
export function isValidAPIKeys(apiKeys) {
  if (!apiKeys || typeof apiKeys !== 'object') return false;
  
  // All API keys are optional, but if present must be non-empty strings
  const keys = Object.keys(apiKeys);
  return keys.every(key => {
    const value = apiKeys[key];
    return value === undefined || isValidString(value);
  });
}

/**
 * Validates preferences object
 * @param {any} preferences - Preferences object to validate
 * @returns {boolean} True if valid preferences
 */
export function isValidPreferences(preferences) {
  if (!preferences || typeof preferences !== 'object') return false;
  
  return (
    Object.values(THEMES).includes(preferences.theme) &&
    isValidQuizSettings(preferences.defaultQuizSettings)
  );
}

/**
 * Validates user preferences object
 * @param {any} userPreferences - User preferences object to validate
 * @returns {boolean} True if valid user preferences
 */
export function isValidUserPreferences(userPreferences) {
  if (!userPreferences || typeof userPreferences !== 'object') return false;
  
  return (
    isValidAPIKeys(userPreferences.apiKeys) &&
    isValidPreferences(userPreferences.preferences)
  );
}

/**
 * Validates a question and returns detailed validation results
 * @param {any} question - Question object to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 */
export function validateQuestion(question) {
  const errors = [];
  
  if (!question || typeof question !== 'object') {
    return { isValid: false, errors: ['Question must be an object'] };
  }
  
  // Validate base properties
  if (!isValidId(question.id)) {
    errors.push('Question ID is required and must be at least 8 characters');
  }
  
  if (!Object.values(QUESTION_TYPES).includes(question.type)) {
    errors.push('Question type is invalid');
  }
  
  if (!isValidString(question.question)) {
    errors.push('Question text is required');
  }
  
  if (!isValidString(question.explanation)) {
    errors.push('Question explanation is required');
  }
  
  if (!isValidMedia(question.media)) {
    errors.push('Question media is invalid');
  }
  
  // Type-specific validation
  switch (question.type) {
    case QUESTION_TYPES.MCQ_SINGLE:
      if (!Array.isArray(question.options) || question.options.length < 2) {
        errors.push('Multiple choice questions must have at least 2 options');
      } else if (!question.options.every(option => isValidString(option))) {
        errors.push('All options must be non-empty text');
      }
      
      if (typeof question.correctAnswer !== 'number' || 
          question.correctAnswer < 0 || 
          question.correctAnswer >= (question.options?.length || 0)) {
        errors.push('Correct answer must be a valid option index');
      }
      break;
      
    case QUESTION_TYPES.MCQ_MULTIPLE:
      if (!Array.isArray(question.options) || question.options.length < 2) {
        errors.push('Multiple choice questions must have at least 2 options');
      } else if (!question.options.every(option => isValidString(option))) {
        errors.push('All options must be non-empty text');
      }
      
      if (!Array.isArray(question.correctAnswers) || question.correctAnswers.length === 0) {
        errors.push('At least one correct answer must be selected');
      } else {
        const invalidAnswers = question.correctAnswers.filter(answer => 
          typeof answer !== 'number' || 
          answer < 0 || 
          answer >= (question.options?.length || 0)
        );
        if (invalidAnswers.length > 0) {
          errors.push('All correct answers must be valid option indices');
        }
        
        if (new Set(question.correctAnswers).size !== question.correctAnswers.length) {
          errors.push('Duplicate correct answers are not allowed');
        }
      }
      break;
      
    case QUESTION_TYPES.TEXT_INPUT:
      if (!isValidString(question.correctAnswer)) {
        errors.push('Correct answer text is required');
      }
      
      if (typeof question.caseSensitive !== 'boolean') {
        errors.push('Case sensitivity setting is required');
      }
      break;
      
    default:
      errors.push('Unknown question type');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates a quiz and returns detailed validation results
 * @param {any} quiz - Quiz object to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 */
export function validateQuiz(quiz) {
  const errors = [];
  
  if (!quiz || typeof quiz !== 'object') {
    return { isValid: false, errors: ['Quiz must be an object'] };
  }
  
  // Validate base properties
  if (!isValidId(quiz.id)) {
    errors.push('Quiz ID is required and must be at least 8 characters');
  }
  
  if (!isValidString(quiz.title)) {
    errors.push('Quiz title is required');
  }
  
  if (!isValidString(quiz.description)) {
    errors.push('Quiz description is required');
  }
  
  if (!Array.isArray(quiz.questions)) {
    errors.push('Quiz questions must be an array');
  } else if (quiz.questions.length === 0) {
    errors.push('Quiz must have at least one question');
  } else {
    // Validate each question
    quiz.questions.forEach((question, index) => {
      const questionValidation = validateQuestion(question);
      if (!questionValidation.isValid) {
        errors.push(`Question ${index + 1}: ${questionValidation.errors.join(', ')}`);
      }
    });
  }
  
  if (!isValidDate(quiz.createdAt)) {
    errors.push('Quiz creation date is invalid');
  }
  
  if (!isValidDate(quiz.updatedAt)) {
    errors.push('Quiz update date is invalid');
  }
  
  if (!isValidQuizSettings(quiz.settings)) {
    errors.push('Quiz settings are invalid');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates a result and returns detailed validation results
 * @param {any} result - Result object to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 */
export function validateResult(result) {
  const errors = [];
  
  if (!result || typeof result !== 'object') {
    return { isValid: false, errors: ['Result must be an object'] };
  }
  
  // Validate base properties
  if (!isValidId(result.id)) {
    errors.push('Result ID is required and must be at least 8 characters');
  }
  
  if (!isValidId(result.quizId)) {
    errors.push('Quiz ID is required and must be at least 8 characters');
  }
  
  if (!isValidString(result.userId)) {
    errors.push('User ID is required');
  }
  
  if (typeof result.score !== 'number' || result.score < 0) {
    errors.push('Score must be non-negative');
  }
  
  if (typeof result.totalQuestions !== 'number' || result.totalQuestions <= 0) {
    errors.push('Total questions must be a positive number');
  }
  
  if (typeof result.score === 'number' && typeof result.totalQuestions === 'number' && 
      result.score > result.totalQuestions) {
    errors.push('Score cannot exceed total questions');
  }
  
  if (!Array.isArray(result.answers)) {
    errors.push('Answers must be an array');
  } else if (result.answers.length !== result.totalQuestions) {
    errors.push('Number of answers must match total questions');
  } else {
    // Validate each answer record
    result.answers.forEach((answer, index) => {
      if (!isValidAnswerRecord(answer)) {
        errors.push(`Answer ${index + 1} is invalid`);
      }
    });
  }
  
  if (!isValidDate(result.completedAt)) {
    errors.push('Completion date is invalid');
  }
  
  if (typeof result.timeSpent !== 'number' || result.timeSpent < 0) {
    errors.push('Time spent must be non-negative');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}