/**
 * AI Explanation Generation Service
 * Generates detailed explanations for quiz answers using Google Gemini API
 */

import { GeminiAPIService } from './GeminiAPIService.js';
import { StorageManager } from './StorageManager.js';

/**
 * Explanation generation prompts
 */
const EXPLANATION_PROMPTS = {
  INCORRECT_ANSWER: `A student answered a quiz question incorrectly. Please provide a clear, educational explanation.

Question: {question}
{optionsText}
Student's Answer: {userAnswer}
Correct Answer: {correctAnswer}

Please provide:
1. Why the student's answer is incorrect
2. Why the correct answer is right
3. Key concepts the student should understand
4. A brief, encouraging note

Keep the explanation concise but thorough, suitable for learning. Be supportive and educational.

Format your response as plain text, no special formatting needed.`,

  CORRECT_ANSWER: `A student answered a quiz question correctly. Please provide a brief, positive explanation that reinforces their understanding.

Question: {question}
{optionsText}
Student's Answer: {userAnswer}
Correct Answer: {correctAnswer}

Please provide:
1. Confirmation that their answer is correct
2. Brief explanation of why it's correct
3. Any additional insight or related concepts
4. Positive reinforcement

Keep it concise and encouraging.

Format your response as plain text, no special formatting needed.`,

  GENERAL_EXPLANATION: `Please provide a detailed explanation for this quiz question and its answer.

Question: {question}
{optionsText}
Correct Answer: {correctAnswer}

Please explain:
1. The reasoning behind the correct answer
2. Key concepts involved
3. Why other options (if any) are incorrect
4. Any helpful context or examples

Make it educational and clear for students.

Format your response as plain text, no special formatting needed.`
};

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  MAX_ENTRIES: 1000,
  EXPIRY_HOURS: 24,
  STORAGE_KEY: 'ai_explanation_cache'
};

/**
 * AI Explanation Service Class
 */
export class AIExplanationService {
  constructor() {
    this.geminiService = new GeminiAPIService();
    this.storageManager = new StorageManager();
    this.cache = new Map();
    this.loadCache();
  }

  /**
   * Generate explanation for a quiz answer
   * @param {Object} question - The quiz question object
   * @param {any} userAnswer - User's answer
   * @param {boolean} isCorrect - Whether the answer was correct
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Generated explanation
   */
  async generateExplanation(question, userAnswer, isCorrect, options = {}) {
    try {
      // Create cache key
      const cacheKey = this.createCacheKey(question, userAnswer, isCorrect);
      
      // Check cache first
      const cached = this.getCachedExplanation(cacheKey);
      if (cached && !options.forceRefresh) {
        return {
          success: true,
          explanation: cached.explanation,
          fromCache: true,
          generatedAt: cached.generatedAt
        };
      }

      // Generate new explanation
      const prompt = this.buildExplanationPrompt(question, userAnswer, isCorrect);
      const aiResponse = await this.geminiService.makeRequest({
        contents: [{
          parts: [{ text: prompt }]
        }]
      });

      const explanation = this.geminiService.extractTextFromResponse(aiResponse);
      const cleanedExplanation = this.cleanExplanationText(explanation);

      // Cache the result
      this.cacheExplanation(cacheKey, cleanedExplanation);

      return {
        success: true,
        explanation: cleanedExplanation,
        fromCache: false,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Explanation generation error:', error);
      
      // Return fallback explanation
      const fallback = this.generateFallbackExplanation(question, userAnswer, isCorrect);
      
      return {
        success: false,
        explanation: fallback,
        error: error.message,
        fromCache: false,
        generatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Generate explanation for question without user context
   * @param {Object} question - The quiz question object
   * @returns {Promise<Object>} - Generated explanation
   */
  async generateGeneralExplanation(question) {
    try {
      const cacheKey = this.createGeneralCacheKey(question);
      
      // Check cache
      const cached = this.getCachedExplanation(cacheKey);
      if (cached) {
        return {
          success: true,
          explanation: cached.explanation,
          fromCache: true,
          generatedAt: cached.generatedAt
        };
      }

      // Generate explanation
      const prompt = this.buildGeneralExplanationPrompt(question);
      const aiResponse = await this.geminiService.makeRequest({
        contents: [{
          parts: [{ text: prompt }]
        }]
      });

      const explanation = this.geminiService.extractTextFromResponse(aiResponse);
      const cleanedExplanation = this.cleanExplanationText(explanation);

      // Cache the result
      this.cacheExplanation(cacheKey, cleanedExplanation);

      return {
        success: true,
        explanation: cleanedExplanation,
        fromCache: false,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('General explanation generation error:', error);
      
      return {
        success: false,
        explanation: question.explanation || 'No explanation available.',
        error: error.message,
        fromCache: false,
        generatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Build explanation prompt based on answer correctness
   * @param {Object} question - Question object
   * @param {any} userAnswer - User's answer
   * @param {boolean} isCorrect - Whether answer was correct
   * @returns {string} - Complete prompt
   * @private
   */
  buildExplanationPrompt(question, userAnswer, isCorrect) {
    const template = isCorrect ? 
      EXPLANATION_PROMPTS.CORRECT_ANSWER : 
      EXPLANATION_PROMPTS.INCORRECT_ANSWER;

    return this.fillPromptTemplate(template, question, userAnswer);
  }

  /**
   * Build general explanation prompt
   * @param {Object} question - Question object
   * @returns {string} - Complete prompt
   * @private
   */
  buildGeneralExplanationPrompt(question) {
    return this.fillPromptTemplate(EXPLANATION_PROMPTS.GENERAL_EXPLANATION, question, null);
  }

  /**
   * Fill prompt template with question data
   * @param {string} template - Prompt template
   * @param {Object} question - Question object
   * @param {any} userAnswer - User's answer (can be null)
   * @returns {string} - Filled template
   * @private
   */
  fillPromptTemplate(template, question, userAnswer) {
    let optionsText = '';
    let correctAnswerText = '';
    let userAnswerText = '';

    // Handle different question types
    switch (question.type) {
      case 'mcq-single':
        optionsText = this.formatMCQOptions(question.options);
        correctAnswerText = question.options[question.correctAnswer];
        if (userAnswer !== null && userAnswer !== undefined) {
          userAnswerText = typeof userAnswer === 'number' ? 
            question.options[userAnswer] || 'Invalid option' : 
            String(userAnswer);
        }
        break;

      case 'mcq-multiple':
        optionsText = this.formatMCQOptions(question.options);
        correctAnswerText = question.correctAnswers
          .map(index => question.options[index])
          .join(', ');
        if (userAnswer !== null && userAnswer !== undefined && Array.isArray(userAnswer)) {
          userAnswerText = userAnswer
            .map(index => question.options[index] || 'Invalid option')
            .join(', ');
        }
        break;

      case 'text-input':
        correctAnswerText = question.correctAnswer;
        if (userAnswer !== null && userAnswer !== undefined) {
          userAnswerText = String(userAnswer);
        }
        break;

      default:
        correctAnswerText = 'Unknown';
    }

    return template
      .replace('{question}', question.question)
      .replace('{optionsText}', optionsText)
      .replace('{correctAnswer}', correctAnswerText)
      .replace('{userAnswer}', userAnswerText || 'Not provided');
  }

  /**
   * Format multiple choice options for prompt
   * @param {Array} options - Options array
   * @returns {string} - Formatted options
   * @private
   */
  formatMCQOptions(options) {
    if (!Array.isArray(options) || options.length === 0) {
      return '';
    }

    return 'Options:\n' + options
      .map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`)
      .join('\n');
  }

  /**
   * Clean and format explanation text
   * @param {string} text - Raw explanation text
   * @returns {string} - Cleaned text
   * @private
   */
  cleanExplanationText(text) {
    if (!text || typeof text !== 'string') {
      return 'No explanation available.';
    }

    return text
      .trim()
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive line breaks
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n /g, '\n') // Remove leading spaces after line breaks
      .trim();
  }

  /**
   * Generate fallback explanation when AI fails
   * @param {Object} question - Question object
   * @param {any} userAnswer - User's answer
   * @param {boolean} isCorrect - Whether answer was correct
   * @returns {string} - Fallback explanation
   * @private
   */
  generateFallbackExplanation(question, userAnswer, isCorrect) {
    if (question.explanation) {
      return question.explanation;
    }

    if (isCorrect) {
      return 'Correct! Your answer is right.';
    } else {
      let fallback = 'That\'s not quite right. ';
      
      switch (question.type) {
        case 'mcq-single':
          fallback += `The correct answer is: ${question.options[question.correctAnswer]}`;
          break;
        case 'mcq-multiple':
          const correctOptions = question.correctAnswers
            .map(index => question.options[index])
            .join(', ');
          fallback += `The correct answers are: ${correctOptions}`;
          break;
        case 'text-input':
          fallback += `The correct answer is: ${question.correctAnswer}`;
          break;
      }
      
      return fallback;
    }
  }

  /**
   * Create cache key for explanation
   * @param {Object} question - Question object
   * @param {any} userAnswer - User's answer
   * @param {boolean} isCorrect - Whether answer was correct
   * @returns {string} - Cache key
   * @private
   */
  createCacheKey(question, userAnswer, isCorrect) {
    const questionHash = this.hashString(question.question + JSON.stringify(question.options || ''));
    const answerHash = this.hashString(String(userAnswer) + String(isCorrect));
    return `exp_${questionHash}_${answerHash}`;
  }

  /**
   * Create cache key for general explanation
   * @param {Object} question - Question object
   * @returns {string} - Cache key
   * @private
   */
  createGeneralCacheKey(question) {
    const questionHash = this.hashString(question.question + JSON.stringify(question.options || ''));
    return `gen_exp_${questionHash}`;
  }

  /**
   * Simple string hashing function
   * @param {string} str - String to hash
   * @returns {string} - Hash
   * @private
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached explanation
   * @param {string} key - Cache key
   * @returns {Object|null} - Cached explanation or null
   * @private
   */
  getCachedExplanation(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check expiry
    const now = Date.now();
    const expiryTime = cached.timestamp + (CACHE_CONFIG.EXPIRY_HOURS * 60 * 60 * 1000);
    
    if (now > expiryTime) {
      this.cache.delete(key);
      return null;
    }

    return cached;
  }

  /**
   * Cache explanation
   * @param {string} key - Cache key
   * @param {string} explanation - Explanation text
   * @private
   */
  cacheExplanation(key, explanation) {
    // Check cache size limit
    if (this.cache.size >= CACHE_CONFIG.MAX_ENTRIES) {
      // Remove oldest entries (simple LRU)
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      explanation,
      timestamp: Date.now(),
      generatedAt: new Date().toISOString()
    });

    // Persist to storage (async, don't wait)
    this.saveCache().catch(error => {
      console.warn('Failed to save explanation cache:', error);
    });
  }

  /**
   * Load cache from storage
   * @private
   */
  async loadCache() {
    try {
      const stored = localStorage.getItem(CACHE_CONFIG.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const now = Date.now();
        const expiryTime = CACHE_CONFIG.EXPIRY_HOURS * 60 * 60 * 1000;

        // Load non-expired entries
        for (const [key, value] of Object.entries(data)) {
          if (now - value.timestamp < expiryTime) {
            this.cache.set(key, value);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load explanation cache:', error);
    }
  }

  /**
   * Save cache to storage
   * @private
   */
  async saveCache() {
    try {
      const data = Object.fromEntries(this.cache);
      localStorage.setItem(CACHE_CONFIG.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save explanation cache:', error);
    }
  }

  /**
   * Clear explanation cache
   */
  clearCache() {
    this.cache.clear();
    try {
      localStorage.removeItem(CACHE_CONFIG.STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear explanation cache:', error);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: CACHE_CONFIG.MAX_ENTRIES,
      expiryHours: CACHE_CONFIG.EXPIRY_HOURS
    };
  }

  /**
   * Batch generate explanations for multiple questions
   * @param {Array} questions - Array of question objects
   * @returns {Promise<Array>} - Array of explanation results
   */
  async batchGenerateExplanations(questions) {
    const results = [];
    
    for (const question of questions) {
      try {
        const result = await this.generateGeneralExplanation(question);
        results.push({
          questionId: question.id,
          ...result
        });
      } catch (error) {
        results.push({
          questionId: question.id,
          success: false,
          explanation: question.explanation || 'No explanation available.',
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get service status and capabilities
   * @returns {Object} - Service status
   */
  getStatus() {
    return {
      apiKeyStatus: this.geminiService.getAPIKeyStatus(),
      cacheStats: this.getCacheStats(),
      isReady: this.geminiService.getAPIKeyStatus().hasKey
    };
  }
}