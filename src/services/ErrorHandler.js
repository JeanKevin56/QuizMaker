/**
 * Comprehensive Error Handler Service
 * Handles global error handling, user-friendly error messages, offline detection,
 * and API quota monitoring for the Quiz Platform
 */

import { StorageManager } from './StorageManager.js';

/**
 * Error types for categorization
 */
export const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  API: 'API',
  STORAGE: 'STORAGE',
  VALIDATION: 'VALIDATION',
  PERMISSION: 'PERMISSION',
  QUOTA: 'QUOTA',
  OFFLINE: 'OFFLINE',
  UNKNOWN: 'UNKNOWN'
};

/**
 * Error severity levels
 */
export const ERROR_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

/**
 * Error Handler Service Class
 */
export class ErrorHandler {
  constructor() {
    this.storageManager = new StorageManager();
    this.errorQueue = [];
    this.isOnline = navigator.onLine;
    this.errorListeners = new Set();
    this.quotaWarningThreshold = 0.8; // 80% of quota
    this.quotaLimits = new Map();
    
    this.initializeErrorHandling();
    this.initializeOfflineDetection();
  }

  /**
   * Initialize global error handling
   * @private
   */
  initializeErrorHandling() {
    // Handle uncaught JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleGlobalError({
        type: ERROR_TYPES.UNKNOWN,
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        severity: ERROR_SEVERITY.HIGH
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleGlobalError({
        type: ERROR_TYPES.UNKNOWN,
        message: event.reason?.message || 'Unhandled promise rejection',
        error: event.reason,
        severity: ERROR_SEVERITY.HIGH
      });
    });

    // Handle fetch errors globally
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // Monitor API quota usage
        if (args[0]?.includes('generativelanguage.googleapis.com')) {
          this.monitorAPIUsage(response);
        }
        
        return response;
      } catch (error) {
        this.handleNetworkError(error, args[0]);
        throw error;
      }
    };
  }

  /**
   * Initialize offline detection
   * @private
   */
  initializeOfflineDetection() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.handleOnlineStatusChange(true);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.handleOnlineStatusChange(false);
    });

    // Periodic connectivity check
    setInterval(() => {
      this.checkConnectivity();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Handle global errors
   * @param {Object} errorInfo - Error information
   * @private
   */
  handleGlobalError(errorInfo) {
    const error = this.createErrorObject(errorInfo);
    
    // Log error for debugging
    console.error('Global error caught:', error);
    
    // Store error for analysis
    this.storeError(error);
    
    // Show user-friendly message
    this.showUserFriendlyError(error);
    
    // Notify error listeners
    this.notifyErrorListeners(error);
  }

  /**
   * Handle network errors
   * @param {Error} error - Network error
   * @param {string} url - Request URL
   * @private
   */
  handleNetworkError(error, url) {
    const errorInfo = {
      type: ERROR_TYPES.NETWORK,
      message: error.message,
      url: url,
      error: error,
      severity: this.isOnline ? ERROR_SEVERITY.MEDIUM : ERROR_SEVERITY.HIGH,
      isOffline: !this.isOnline
    };

    this.handleGlobalError(errorInfo);
  }

  /**
   * Handle online status changes
   * @param {boolean} isOnline - Online status
   * @private
   */
  handleOnlineStatusChange(isOnline) {
    if (isOnline) {
      this.showNotification('Connection restored', 'success');
      this.processOfflineQueue();
    } else {
      this.showNotification('You are offline. Some features may not work.', 'warning');
    }
  }

  /**
   * Check connectivity with a simple request
   * @private
   */
  async checkConnectivity() {
    try {
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      if (!this.isOnline && response.ok) {
        this.isOnline = true;
        this.handleOnlineStatusChange(true);
      }
    } catch (error) {
      if (this.isOnline) {
        this.isOnline = false;
        this.handleOnlineStatusChange(false);
      }
    }
  }

  /**
   * Monitor API usage for quota warnings
   * @param {Response} response - Fetch response
   * @private
   */
  monitorAPIUsage(response) {
    // Check for quota-related headers
    const remainingQuota = response.headers.get('x-ratelimit-remaining');
    const quotaLimit = response.headers.get('x-ratelimit-limit');
    const resetTime = response.headers.get('x-ratelimit-reset');

    if (remainingQuota && quotaLimit) {
      const usage = 1 - (parseInt(remainingQuota) / parseInt(quotaLimit));
      
      if (usage >= this.quotaWarningThreshold) {
        this.handleQuotaWarning({
          service: 'Gemini API',
          usage: usage,
          remaining: remainingQuota,
          limit: quotaLimit,
          resetTime: resetTime
        });
      }
    }

    // Check for quota exceeded status
    if (response.status === 429) {
      this.handleQuotaExceeded({
        service: 'Gemini API',
        resetTime: resetTime
      });
    }
  }

  /**
   * Handle quota warnings
   * @param {Object} quotaInfo - Quota information
   * @private
   */
  handleQuotaWarning(quotaInfo) {
    const message = `API quota warning: ${Math.round(quotaInfo.usage * 100)}% used for ${quotaInfo.service}`;
    
    this.showNotification(message, 'warning', {
      persistent: true,
      actions: [
        {
          text: 'View Usage',
          action: () => this.showQuotaDetails(quotaInfo)
        }
      ]
    });
  }

  /**
   * Handle quota exceeded
   * @param {Object} quotaInfo - Quota information
   * @private
   */
  handleQuotaExceeded(quotaInfo) {
    const resetTime = quotaInfo.resetTime ? new Date(quotaInfo.resetTime * 1000) : null;
    const resetMessage = resetTime ? ` Resets at ${resetTime.toLocaleTimeString()}` : '';
    
    const error = {
      type: ERROR_TYPES.QUOTA,
      message: `${quotaInfo.service} quota exceeded.${resetMessage}`,
      severity: ERROR_SEVERITY.HIGH,
      quotaInfo: quotaInfo
    };

    this.handleGlobalError(error);
  }

  /**
   * Create standardized error object
   * @param {Object} errorInfo - Raw error information
   * @returns {Object} Standardized error object
   * @private
   */
  createErrorObject(errorInfo) {
    return {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      type: errorInfo.type || ERROR_TYPES.UNKNOWN,
      severity: errorInfo.severity || ERROR_SEVERITY.MEDIUM,
      message: errorInfo.message || 'An unknown error occurred',
      userMessage: this.generateUserFriendlyMessage(errorInfo),
      details: {
        filename: errorInfo.filename,
        lineno: errorInfo.lineno,
        colno: errorInfo.colno,
        url: errorInfo.url,
        stack: errorInfo.error?.stack,
        isOffline: !this.isOnline
      },
      originalError: errorInfo.error
    };
  }

  /**
   * Generate user-friendly error messages
   * @param {Object} errorInfo - Error information
   * @returns {string} User-friendly message
   * @private
   */
  generateUserFriendlyMessage(errorInfo) {
    const { type, message, isOffline } = errorInfo;

    if (isOffline) {
      return 'You appear to be offline. Please check your internet connection and try again.';
    }

    switch (type) {
      case ERROR_TYPES.NETWORK:
        return 'Network connection issue. Please check your internet connection and try again.';
      
      case ERROR_TYPES.API:
        if (message?.includes('API key')) {
          return 'API key issue. Please check your API key configuration in settings.';
        }
        if (message?.includes('quota') || message?.includes('limit')) {
          return 'API usage limit reached. Please try again later or check your quota.';
        }
        return 'Service temporarily unavailable. Please try again in a few moments.';
      
      case ERROR_TYPES.STORAGE:
        return 'Unable to save data. Your browser storage may be full.';
      
      case ERROR_TYPES.VALIDATION:
        return 'Invalid data provided. Please check your input and try again.';
      
      case ERROR_TYPES.PERMISSION:
        return 'Permission denied. Please check your browser settings.';
      
      case ERROR_TYPES.QUOTA:
        return 'Usage limit reached. Please wait before making more requests.';
      
      default:
        return 'Something went wrong. Please try refreshing the page.';
    }
  }

  /**
   * Show user-friendly error to the user
   * @param {Object} error - Error object
   * @private
   */
  showUserFriendlyError(error) {
    const severity = error.severity;
    let notificationType = 'error';
    
    if (severity === ERROR_SEVERITY.LOW) {
      notificationType = 'info';
    } else if (severity === ERROR_SEVERITY.MEDIUM) {
      notificationType = 'warning';
    }

    this.showNotification(error.userMessage, notificationType, {
      persistent: severity === ERROR_SEVERITY.CRITICAL,
      actions: severity === ERROR_SEVERITY.CRITICAL ? [
        {
          text: 'Reload Page',
          action: () => window.location.reload()
        }
      ] : []
    });
  }

  /**
   * Show notification to user
   * @param {string} message - Notification message
   * @param {string} type - Notification type (info, success, warning, error)
   * @param {Object} options - Additional options
   */
  showNotification(message, type = 'info', options = {}) {
    const notification = this.createNotificationElement(message, type, options);
    this.displayNotification(notification);
  }

  /**
   * Create notification DOM element
   * @param {string} message - Notification message
   * @param {string} type - Notification type
   * @param {Object} options - Additional options
   * @returns {HTMLElement} Notification element
   * @private
   */
  createNotificationElement(message, type, options) {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} notification`;
    notification.setAttribute('role', 'alert');
    
    const content = document.createElement('div');
    content.className = 'alert-content';
    content.textContent = message;
    
    notification.appendChild(content);

    // Add actions if provided
    if (options.actions && options.actions.length > 0) {
      const actionsContainer = document.createElement('div');
      actionsContainer.className = 'notification-actions';
      
      options.actions.forEach(action => {
        const button = document.createElement('button');
        button.className = 'btn btn-sm';
        button.textContent = action.text;
        button.onclick = action.action;
        actionsContainer.appendChild(button);
      });
      
      notification.appendChild(actionsContainer);
    }

    // Add close button if not persistent
    if (!options.persistent) {
      const closeButton = document.createElement('button');
      closeButton.className = 'alert-close';
      closeButton.innerHTML = '×';
      closeButton.onclick = () => this.removeNotification(notification);
      notification.appendChild(closeButton);
    } else {
      // Mark as persistent
      notification.classList.add('persistent');
    }

    return notification;
  }

  /**
   * Display notification in the UI
   * @param {HTMLElement} notification - Notification element
   * @private
   */
  displayNotification(notification) {
    let container = document.getElementById('notification-container');
    
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'notification-container';
      document.body.appendChild(container);
    }

    container.appendChild(notification);

    // Auto-remove after 5 seconds if not persistent
    if (!notification.classList.contains('persistent')) {
      setTimeout(() => {
        this.removeNotification(notification);
      }, 5000);
    }
  }

  /**
   * Remove notification from UI
   * @param {HTMLElement} notification - Notification element
   * @private
   */
  removeNotification(notification) {
    if (notification && notification.parentNode) {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      
      setTimeout(() => {
        notification.parentNode.removeChild(notification);
      }, 300);
    }
  }

  /**
   * Store error for analysis
   * @param {Object} error - Error object
   * @private
   */
  async storeError(error) {
    try {
      const errors = JSON.parse(localStorage.getItem('QuizMaker-errors') || '[]');
      errors.push(error);
      
      // Keep only last 50 errors
      if (errors.length > 50) {
        errors.splice(0, errors.length - 50);
      }
      
      localStorage.setItem('QuizMaker-errors', JSON.stringify(errors));
    } catch (storageError) {
      console.warn('Failed to store error:', storageError);
    }
  }

  /**
   * Process offline queue when connection is restored
   * @private
   */
  processOfflineQueue() {
    if (this.errorQueue.length > 0) {
      this.showNotification(`Processing ${this.errorQueue.length} queued actions...`, 'info');
      
      // Process queued errors/actions
      this.errorQueue.forEach(item => {
        // Retry failed operations
        if (item.retry && typeof item.retry === 'function') {
          item.retry();
        }
      });
      
      this.errorQueue = [];
    }
  }

  /**
   * Add error listener
   * @param {Function} listener - Error listener function
   */
  addErrorListener(listener) {
    this.errorListeners.add(listener);
  }

  /**
   * Remove error listener
   * @param {Function} listener - Error listener function
   */
  removeErrorListener(listener) {
    this.errorListeners.delete(listener);
  }

  /**
   * Notify error listeners
   * @param {Object} error - Error object
   * @private
   */
  notifyErrorListeners(error) {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }

  /**
   * Show quota details modal
   * @param {Object} quotaInfo - Quota information
   * @private
   */
  showQuotaDetails(quotaInfo) {
    const modal = this.createQuotaModal(quotaInfo);
    document.body.appendChild(modal);
  }

  /**
   * Create quota details modal
   * @param {Object} quotaInfo - Quota information
   * @returns {HTMLElement} Modal element
   * @private
   */
  createQuotaModal(quotaInfo) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `
      <h3 class="modal-title">API Usage Details</h3>
      <button class="modal-close">×</button>
    `;
    
    const content = document.createElement('div');
    content.className = 'modal-content';
    content.innerHTML = `
      <div class="quota-details">
        <h4>${quotaInfo.service}</h4>
        <div class="quota-bar">
          <div class="quota-fill" style="width: ${quotaInfo.usage * 100}%"></div>
        </div>
        <p>Usage: ${Math.round(quotaInfo.usage * 100)}%</p>
        <p>Remaining: ${quotaInfo.remaining} requests</p>
        <p>Limit: ${quotaInfo.limit} requests</p>
        ${quotaInfo.resetTime ? `<p>Resets: ${new Date(quotaInfo.resetTime * 1000).toLocaleString()}</p>` : ''}
      </div>
    `;
    
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    footer.innerHTML = `
      <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">Close</button>
    `;
    
    modal.appendChild(header);
    modal.appendChild(content);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    
    // Close modal handlers
    header.querySelector('.modal-close').onclick = () => overlay.remove();
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };
    
    return overlay;
  }

  /**
   * Generate unique error ID
   * @returns {string} Unique error ID
   * @private
   */
  generateErrorId() {
    return `error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get stored errors for analysis
   * @returns {Array} Array of stored errors
   */
  getStoredErrors() {
    try {
      return JSON.parse(localStorage.getItem('QuizMaker-errors') || '[]');
    } catch (error) {
      return [];
    }
  }

  /**
   * Clear stored errors
   */
  clearStoredErrors() {
    try {
      localStorage.removeItem('QuizMaker-errors');
    } catch (error) {
      console.warn('Failed to clear stored errors:', error);
    }
  }

  /**
   * Get current online status
   * @returns {boolean} Online status
   */
  isOnlineStatus() {
    return this.isOnline;
  }

  /**
   * Handle specific error types
   * @param {Error} error - Error object
   * @param {string} context - Error context
   */
  handleError(error, context = '') {
    let errorType = ERROR_TYPES.UNKNOWN;
    let severity = ERROR_SEVERITY.MEDIUM;

    // Categorize error based on type and message
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorType = ERROR_TYPES.NETWORK;
    } else if (error.message?.includes('API') || error.message?.includes('quota')) {
      errorType = ERROR_TYPES.API;
    } else if (error.message?.includes('storage') || error.message?.includes('quota exceeded')) {
      errorType = ERROR_TYPES.STORAGE;
    } else if (error.message?.includes('validation') || error.message?.includes('invalid')) {
      errorType = ERROR_TYPES.VALIDATION;
    }

    this.handleGlobalError({
      type: errorType,
      message: `${context ? context + ': ' : ''}${error.message}`,
      error: error,
      severity: severity
    });
  }
}

// Create global error handler instance
export const errorHandler = new ErrorHandler();