/**
 * Google Gemini API Service
 * Handles authentication, rate limiting, request queuing, and error handling
 * for Google Gemini API integration
 */

import { StorageManager } from './StorageManager.js';
import { EnvLoader } from '../utils/envLoader.js';
import { errorHandler, ERROR_TYPES, ERROR_SEVERITY } from './ErrorHandler.js';
import { quotaMonitor } from '../components/QuotaMonitor.js';

/**
 * Configuration constants for Gemini API
 */
const GEMINI_CONFIG = {
  BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
  MODEL: 'gemini-1.5-flash',
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // Base delay in milliseconds
  RATE_LIMIT_DELAY: 60000, // 1 minute delay for rate limit errors
  REQUEST_TIMEOUT: 30000, // 30 seconds timeout
  MAX_QUEUE_SIZE: 50
};

/**
 * Error types for API operations
 */
export const API_ERROR_TYPES = {
  INVALID_API_KEY: 'INVALID_API_KEY',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
};

/**
 * Request queue item structure
 * @typedef {Object} QueueItem
 * @property {string} id - Unique request ID
 * @property {Object} request - Request configuration
 * @property {Function} resolve - Promise resolve function
 * @property {Function} reject - Promise reject function
 * @property {number} retryCount - Current retry count
 * @property {number} timestamp - Request timestamp
 */

/**
 * Google Gemini API Service Class
 */
export class GeminiAPIService {
  constructor() {
    this.apiKey = null;
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.rateLimitUntil = 0;
    this.storageManager = new StorageManager();
    
    // Initialize API key from storage
    this.initializeAPIKey();
  }

  /**
   * Initialize API key from storage
   * @private
   */
  async initializeAPIKey() {
    try {
      const preferences = await this.storageManager.getUserPreferences();
      if (preferences?.apiKeys?.gemini) {
        this.apiKey = preferences.apiKeys.gemini;
      }
    } catch (error) {
      console.warn('Failed to load API key from storage:', error);
    }
  }

  /**
   * Set and validate API key
   * @param {string} apiKey - Google Gemini API key
   * @returns {Promise<boolean>} - True if key is valid
   */
  async setAPIKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('Invalid API key format');
    }

    // Test the API key with a simple request
    const isValid = await this.validateAPIKey(apiKey);
    
    if (isValid) {
      this.apiKey = apiKey;
      
      // Store the API key
      try {
        const preferences = await this.storageManager.getUserPreferences() || {
          apiKeys: {},
          preferences: {
            theme: 'light',
            defaultQuizSettings: {
              shuffleQuestions: false,
              showExplanations: true
            }
          }
        };
        
        preferences.apiKeys.gemini = apiKey;
        await this.storageManager.storeUserPreferences(preferences);
      } catch (error) {
        console.warn('Failed to save API key to storage:', error);
      }
    }

    return isValid;
  }

  /**
   * Validate API key by making a test request
   * @param {string} apiKey - API key to validate
   * @returns {Promise<boolean>} - True if valid
   * @private
   */
  async validateAPIKey(apiKey) {
    try {
      const testRequest = {
        contents: [{
          parts: [{ text: 'Hello' }]
        }]
      };

      const response = await this.makeDirectRequest(testRequest, apiKey);
      return response && response.candidates && response.candidates.length > 0;
    } catch (error) {
      console.warn('API key validation failed:', error);
      return false;
    }
  }

  /**
   * Get current API key status
   * @returns {Object} - API key status information
   */
  getAPIKeyStatus() {
    return {
      hasKey: !!this.apiKey,
      isValid: !!this.apiKey, // Assume valid if we have one
      keyPreview: this.apiKey ? `${this.apiKey.substring(0, 8)}...` : null
    };
  }

  /**
   * Make a request to Gemini API with queuing and rate limiting
   * @param {Object} requestData - Request payload
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - API response
   */
  async makeRequest(requestData, options = {}) {
    if (!this.apiKey) {
      throw new Error('API key not set. Please configure your Gemini API key.');
    }

    // Check if we're currently rate limited
    if (Date.now() < this.rateLimitUntil) {
      const waitTime = this.rateLimitUntil - Date.now();
      throw new Error(`Rate limited. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    // Create request item for queue
    const requestId = this.generateRequestId();
    const queueItem = {
      id: requestId,
      request: { ...requestData, ...options },
      retryCount: 0,
      timestamp: Date.now()
    };

    // Add to queue and process
    return new Promise((resolve, reject) => {
      queueItem.resolve = resolve;
      queueItem.reject = reject;
      
      this.addToQueue(queueItem);
      this.processQueue();
    });
  }

  /**
   * Add request to queue
   * @param {QueueItem} queueItem - Request to queue
   * @private
   */
  addToQueue(queueItem) {
    // Check queue size limit
    if (this.requestQueue.length >= GEMINI_CONFIG.MAX_QUEUE_SIZE) {
      queueItem.reject(new Error('Request queue is full. Please try again later.'));
      return;
    }

    this.requestQueue.push(queueItem);
  }

  /**
   * Process the request queue
   * @private
   */
  async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      // Check rate limit
      if (Date.now() < this.rateLimitUntil) {
        break;
      }

      const queueItem = this.requestQueue.shift();
      
      try {
        const response = await this.executeRequest(queueItem);
        queueItem.resolve(response);
      } catch (error) {
        await this.handleRequestError(queueItem, error);
      }

      // Small delay between requests to be respectful
      await this.delay(100);
    }

    this.isProcessingQueue = false;
  }

  /**
   * Execute a single request
   * @param {QueueItem} queueItem - Request to execute
   * @returns {Promise<Object>} - API response
   * @private
   */
  async executeRequest(queueItem) {
    const { request } = queueItem;
    
    try {
      return await this.makeDirectRequest(request, this.apiKey);
    } catch (error) {
      // Enhance error with context
      error.requestId = queueItem.id;
      error.retryCount = queueItem.retryCount;
      throw error;
    }
  }

  /**
   * Make direct HTTP request to Gemini API
   * @param {Object} requestData - Request payload
   * @param {string} apiKey - API key to use
   * @returns {Promise<Object>} - API response
   * @private
   */
  async makeDirectRequest(requestData, apiKey) {
    const url = `${GEMINI_CONFIG.BASE_URL}/${GEMINI_CONFIG.MODEL}:generateContent?key=${apiKey}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_CONFIG.REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleHTTPError(response);
      }

      const data = await response.json();
      
      // Update quota monitor with successful response
      const remainingQuota = response.headers.get('x-ratelimit-remaining');
      const quotaLimit = response.headers.get('x-ratelimit-limit');
      const resetTime = response.headers.get('x-ratelimit-reset');
      
      if (remainingQuota && quotaLimit) {
        quotaMonitor.updateQuota('Gemini API', {
          remaining: parseInt(remainingQuota),
          limit: parseInt(quotaLimit),
          resetTime: resetTime ? parseInt(resetTime) : null
        });
      }
      
      // Validate response structure
      if (!this.isValidResponse(data)) {
        const validationError = new Error('Invalid response format from API');
        validationError.type = API_ERROR_TYPES.INVALID_RESPONSE;
        errorHandler.handleError(validationError, 'Gemini API Response Validation');
        throw validationError;
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        const timeoutError = new Error('Request timeout');
        timeoutError.type = API_ERROR_TYPES.TIMEOUT_ERROR;
        throw timeoutError;
      }
      
      throw error;
    }
  }

  /**
   * Handle HTTP errors from API
   * @param {Response} response - Fetch response object
   * @private
   */
  async handleHTTPError(response) {
    let errorData;
    let rawResponse = '';
    
    try {
      rawResponse = await response.text();
      errorData = JSON.parse(rawResponse);
    } catch {
      errorData = { message: rawResponse || 'Unknown error' };
    }

    console.error('API Error Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: [...response.headers.entries()],
      body: errorData
    });

    const error = new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    
    // Extract quota information from headers
    const remainingQuota = response.headers.get('x-ratelimit-remaining');
    const quotaLimit = response.headers.get('x-ratelimit-limit');
    const resetTime = response.headers.get('x-ratelimit-reset');
    
    switch (response.status) {
      case 400:
        if (errorData.error?.message?.includes('API key')) {
          error.type = API_ERROR_TYPES.INVALID_API_KEY;
          error.message = 'Invalid API key. Please check your Gemini API key.';
          
          // Report to error handler
          errorHandler.handleError(error, 'Gemini API Authentication');
        } else {
          error.type = API_ERROR_TYPES.NETWORK_ERROR;
        }
        break;
      case 401:
        error.type = API_ERROR_TYPES.INVALID_API_KEY;
        error.message = 'Unauthorized. Please check your API key.';
        
        // Report to error handler
        errorHandler.handleError(error, 'Gemini API Authentication');
        break;
      case 429:
        error.type = API_ERROR_TYPES.RATE_LIMIT_EXCEEDED;
        this.rateLimitUntil = Date.now() + GEMINI_CONFIG.RATE_LIMIT_DELAY;
        
        // Update quota monitor
        if (remainingQuota && quotaLimit) {
          quotaMonitor.updateQuota('Gemini API', {
            remaining: parseInt(remainingQuota),
            limit: parseInt(quotaLimit),
            resetTime: resetTime ? parseInt(resetTime) : null
          });
        }
        
        // Handle quota exceeded
        quotaMonitor.handleQuotaExceeded('Gemini API', {
          resetTime: resetTime ? parseInt(resetTime) : null,
          retryAfter: response.headers.get('retry-after')
        });
        break;
      case 403:
        error.type = API_ERROR_TYPES.QUOTA_EXCEEDED;
        error.message = 'API quota exceeded or access denied.';
        
        // Handle quota exceeded
        quotaMonitor.handleQuotaExceeded('Gemini API', {
          resetTime: resetTime ? parseInt(resetTime) : null
        });
        break;
      case 503:
        error.type = API_ERROR_TYPES.SERVICE_UNAVAILABLE;
        
        // Report service unavailable
        errorHandler.handleError(error, 'Gemini API Service');
        break;
      default:
        error.type = API_ERROR_TYPES.NETWORK_ERROR;
        
        // Report network error
        errorHandler.handleError(error, 'Gemini API Network');
    }

    throw error;
  }

  /**
   * Handle request errors and retry logic
   * @param {QueueItem} queueItem - Failed request item
   * @param {Error} error - Error that occurred
   * @private
   */
  async handleRequestError(queueItem, error) {
    const shouldRetry = this.shouldRetryRequest(queueItem, error);
    
    if (shouldRetry) {
      queueItem.retryCount++;
      
      // Calculate exponential backoff delay
      const delay = GEMINI_CONFIG.RETRY_DELAY * Math.pow(2, queueItem.retryCount - 1);
      
      // Add back to queue after delay
      setTimeout(() => {
        this.requestQueue.unshift(queueItem);
        this.processQueue();
      }, delay);
    } else {
      queueItem.reject(error);
    }
  }

  /**
   * Determine if a request should be retried
   * @param {QueueItem} queueItem - Request item
   * @param {Error} error - Error that occurred
   * @returns {boolean} - True if should retry
   * @private
   */
  shouldRetryRequest(queueItem, error) {
    // Don't retry if max retries reached
    if (queueItem.retryCount >= GEMINI_CONFIG.MAX_RETRIES) {
      return false;
    }

    // Don't retry certain error types
    const nonRetryableErrors = [
      API_ERROR_TYPES.INVALID_API_KEY,
      API_ERROR_TYPES.QUOTA_EXCEEDED,
      API_ERROR_TYPES.INVALID_RESPONSE
    ];

    if (nonRetryableErrors.includes(error.type)) {
      return false;
    }

    // Retry network errors, timeouts, and rate limits
    return [
      API_ERROR_TYPES.NETWORK_ERROR,
      API_ERROR_TYPES.TIMEOUT_ERROR,
      API_ERROR_TYPES.RATE_LIMIT_EXCEEDED,
      API_ERROR_TYPES.SERVICE_UNAVAILABLE
    ].includes(error.type);
  }

  /**
   * Validate API response structure
   * @param {Object} response - API response
   * @returns {boolean} - True if valid
   * @private
   */
  isValidResponse(response) {
    return response && 
           response.candidates && 
           Array.isArray(response.candidates) &&
           response.candidates.length > 0 &&
           response.candidates[0].content &&
           response.candidates[0].content.parts &&
           Array.isArray(response.candidates[0].content.parts);
  }

  /**
   * Extract text from API response
   * @param {Object} response - API response
   * @returns {string} - Extracted text
   */
  extractTextFromResponse(response) {
    if (!this.isValidResponse(response)) {
      throw new Error('Invalid response format');
    }

    const parts = response.candidates[0].content.parts;
    return parts.map(part => part.text || '').join('');
  }

  /**
   * Get API key from environment or storage
   * @returns {Promise<string|null>} - API key if available
   * @private
   */
  async getAPIKeyFromEnv() {
    try {
      await EnvLoader.load();
      return EnvLoader.get('GEMINI_API_KEY');
    } catch (error) {
      console.warn('Failed to load environment variables:', error);
      return null;
    }
  }

  /**
   * Initialize API key from environment or storage
   * @private
   */
  async initializeAPIKey() {
    try {
      // First try environment variable
      const envKey = await this.getAPIKeyFromEnv();
      if (envKey) {
        this.apiKey = envKey;
        return;
      }

      // Fallback to storage
      const preferences = await this.storageManager.getUserPreferences();
      if (preferences?.apiKeys?.gemini) {
        this.apiKey = preferences.apiKeys.gemini;
      }
    } catch (error) {
      console.warn('Failed to load API key:', error);
    }
  }

  /**
   * Generate unique request ID
   * @returns {string} - Unique ID
   * @private
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Utility function for delays
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} - Promise that resolves after delay
   * @private
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear the request queue
   */
  clearQueue() {
    this.requestQueue.forEach(item => {
      item.reject(new Error('Queue cleared'));
    });
    this.requestQueue = [];
  }

  /**
   * Get queue status
   * @returns {Object} - Queue status information
   */
  getQueueStatus() {
    return {
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessingQueue,
      rateLimitUntil: this.rateLimitUntil,
      isRateLimited: Date.now() < this.rateLimitUntil
    };
  }

  /**
   * Reset rate limiting
   */
  resetRateLimit() {
    this.rateLimitUntil = 0;
  }

  /**
   * Test API connection with the current API key
   * @returns {Promise<boolean>} - True if connection successful
   */
  async testConnection() {
    if (!this.apiKey) {
      throw new Error('No API key configured');
    }

    try {
      const testRequest = {
        contents: [{
          parts: [{ text: 'Hello, this is a test.' }]
        }]
      };

      const response = await this.makeDirectRequest(testRequest, this.apiKey);
      
      // Check if we got a valid response
      if (this.isValidResponse(response)) {
        return true;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      // Re-throw with more specific error message
      if (error.type === API_ERROR_TYPES.INVALID_API_KEY) {
        throw new Error('Invalid API key. Please check your Gemini API key.');
      } else if (error.type === API_ERROR_TYPES.QUOTA_EXCEEDED) {
        throw new Error('API quota exceeded. Please check your usage limits.');
      } else if (error.type === API_ERROR_TYPES.RATE_LIMIT_EXCEEDED) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`Connection test failed: ${error.message}`);
      }
    }
  }
}