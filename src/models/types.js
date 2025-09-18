/**
 * Core data model types and interfaces for the Quiz Platform
 */

/**
 * Question types supported by the platform
 */
export const QUESTION_TYPES = {
  MCQ_SINGLE: 'mcq-single',
  MCQ_MULTIPLE: 'mcq-multiple',
  TEXT_INPUT: 'text-input'
};

/**
 * Theme options for user preferences
 */
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark'
};

/**
 * Media types supported in questions
 */
export const MEDIA_TYPES = {
  IMAGE: 'image'
};

/**
 * Question base interface
 * @typedef {Object} Question
 * @property {string} id - Unique identifier for the question
 * @property {string} type - Type of question (mcq-single, mcq-multiple, text-input)
 * @property {string} question - The question text
 * @property {string} explanation - Explanation for the correct answer
 * @property {Object} [media] - Optional media attachment
 * @property {string} media.type - Type of media (image)
 * @property {string} media.url - URL or base64 data of the media
 */

/**
 * Multiple Choice Single Question
 * @typedef {Question} MCQSingleQuestion
 * @property {'mcq-single'} type
 * @property {string[]} options - Array of answer options
 * @property {number} correctAnswer - Index of the correct answer
 */

/**
 * Multiple Choice Multiple Question
 * @typedef {Question} MCQMultipleQuestion
 * @property {'mcq-multiple'} type
 * @property {string[]} options - Array of answer options
 * @property {number[]} correctAnswers - Array of indices of correct answers
 */

/**
 * Text Input Question
 * @typedef {Question} TextInputQuestion
 * @property {'text-input'} type
 * @property {string} correctAnswer - The correct text answer
 * @property {boolean} caseSensitive - Whether the answer is case sensitive
 */

/**
 * Quiz settings configuration
 * @typedef {Object} QuizSettings
 * @property {boolean} shuffleQuestions - Whether to shuffle question order
 * @property {boolean} showExplanations - Whether to show explanations after answers
 * @property {number} [timeLimit] - Optional time limit in minutes
 */

/**
 * Quiz model
 * @typedef {Object} Quiz
 * @property {string} id - Unique identifier for the quiz
 * @property {string} title - Quiz title
 * @property {string} description - Quiz description
 * @property {Question[]} questions - Array of questions
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 * @property {QuizSettings} settings - Quiz configuration settings
 */

/**
 * Answer record for quiz results
 * @typedef {Object} AnswerRecord
 * @property {string} questionId - ID of the question
 * @property {any} userAnswer - User's answer (string, number, or number[])
 * @property {boolean} isCorrect - Whether the answer was correct
 * @property {string} explanation - Explanation for the answer
 */

/**
 * Quiz result model
 * @typedef {Object} Result
 * @property {string} id - Unique identifier for the result
 * @property {string} quizId - ID of the quiz taken
 * @property {string} userId - Generated client-side user ID
 * @property {number} score - Score achieved (0-100)
 * @property {number} totalQuestions - Total number of questions
 * @property {AnswerRecord[]} answers - Array of answer records
 * @property {Date} completedAt - Completion timestamp
 * @property {number} timeSpent - Time spent in seconds
 */

/**
 * API keys configuration
 * @typedef {Object} APIKeys
 * @property {string} [gemini] - Google Gemini API key
 */

/**
 * User preferences configuration
 * @typedef {Object} Preferences
 * @property {string} theme - UI theme (light/dark)
 * @property {QuizSettings} defaultQuizSettings - Default settings for new quizzes
 */

/**
 * User preferences model
 * @typedef {Object} UserPreferences
 * @property {APIKeys} apiKeys - API keys for external services
 * @property {Preferences} preferences - User preference settings
 */