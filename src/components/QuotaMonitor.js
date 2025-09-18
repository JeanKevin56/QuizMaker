/**
 * API Quota Monitor Component
 * Monitors API usage and displays warnings when approaching limits
 */

export class QuotaMonitor {
  constructor() {
    this.quotaData = new Map();
    this.warningThreshold = 0.8; // 80%
    this.criticalThreshold = 0.95; // 95%
    this.warningShown = new Set();
    this.criticalWarningShown = new Set();
    
    this.init();
  }

  /**
   * Initialize the quota monitor
   */
  init() {
    this.loadStoredQuotaData();
    this.setupPeriodicCleanup();
  }

  /**
   * Load stored quota data from localStorage
   * @private
   */
  loadStoredQuotaData() {
    try {
      const stored = localStorage.getItem('quiz-platform-quota-data');
      if (stored) {
        const data = JSON.parse(stored);
        this.quotaData = new Map(Object.entries(data));
      }
    } catch (error) {
      console.warn('Failed to load quota data:', error);
    }
  }

  /**
   * Save quota data to localStorage
   * @private
   */
  saveQuotaData() {
    try {
      const data = Object.fromEntries(this.quotaData);
      localStorage.setItem('quiz-platform-quota-data', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save quota data:', error);
    }
  }

  /**
   * Setup periodic cleanup of old quota data
   * @private
   */
  setupPeriodicCleanup() {
    // Clean up old data every hour
    setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000);
  }

  /**
   * Clean up old quota data
   * @private
   */
  cleanupOldData() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [service, data] of this.quotaData.entries()) {
      if (data.resetTime && data.resetTime * 1000 < now) {
        // Reset time has passed, clear the data
        this.quotaData.delete(service);
        this.warningShown.delete(service);
        this.criticalWarningShown.delete(service);
      } else if (now - data.lastUpdated > maxAge) {
        // Data is too old, remove it
        this.quotaData.delete(service);
        this.warningShown.delete(service);
        this.criticalWarningShown.delete(service);
      }
    }
    
    this.saveQuotaData();
  }

  /**
   * Update quota information for a service
   * @param {string} service - Service name (e.g., 'Gemini API')
   * @param {Object} quotaInfo - Quota information
   */
  updateQuota(service, quotaInfo) {
    const {
      used = 0,
      remaining = null,
      limit = null,
      resetTime = null,
      usage = null
    } = quotaInfo;

    // Calculate usage percentage
    let usagePercentage = usage;
    if (usagePercentage === null && remaining !== null && limit !== null) {
      usagePercentage = (limit - remaining) / limit;
    } else if (usagePercentage === null && used !== null && limit !== null) {
      usagePercentage = used / limit;
    }

    if (usagePercentage === null) {
      console.warn('Unable to calculate usage percentage for', service);
      return;
    }

    // Store quota data
    this.quotaData.set(service, {
      used,
      remaining,
      limit,
      resetTime,
      usage: usagePercentage,
      lastUpdated: Date.now()
    });

    this.saveQuotaData();

    // Check for warnings
    this.checkQuotaWarnings(service, usagePercentage);
  }

  /**
   * Check and display quota warnings
   * @param {string} service - Service name
   * @param {number} usage - Usage percentage (0-1)
   * @private
   */
  checkQuotaWarnings(service, usage) {
    const serviceKey = service.toLowerCase();

    // Critical warning (95%+)
    if (usage >= this.criticalThreshold && !this.criticalWarningShown.has(serviceKey)) {
      this.showCriticalWarning(service, usage);
      this.criticalWarningShown.add(serviceKey);
    }
    // Regular warning (80%+)
    else if (usage >= this.warningThreshold && !this.warningShown.has(serviceKey)) {
      this.showWarning(service, usage);
      this.warningShown.add(serviceKey);
    }
  }

  /**
   * Show quota warning
   * @param {string} service - Service name
   * @param {number} usage - Usage percentage
   * @private
   */
  showWarning(service, usage) {
    const quotaData = this.quotaData.get(service) || { usage };
    const resetTime = quotaData?.resetTime ? new Date(quotaData.resetTime * 1000) : null;
    
    const warning = this.createQuotaWarning({
      service,
      usage,
      type: 'warning',
      resetTime,
      quotaData
    });

    this.displayWarning(warning);
  }

  /**
   * Show critical quota warning
   * @param {string} service - Service name
   * @param {number} usage - Usage percentage
   * @private
   */
  showCriticalWarning(service, usage) {
    const quotaData = this.quotaData.get(service) || { usage };
    const resetTime = quotaData?.resetTime ? new Date(quotaData.resetTime * 1000) : null;
    
    const warning = this.createQuotaWarning({
      service,
      usage,
      type: 'critical',
      resetTime,
      quotaData
    });

    this.displayWarning(warning, true);
  }

  /**
   * Create quota warning element
   * @param {Object} options - Warning options
   * @returns {HTMLElement} Warning element
   * @private
   */
  createQuotaWarning(options) {
    const { service, usage, type, resetTime, quotaData } = options;
    const usagePercent = Math.round(usage * 100);
    
    const warning = document.createElement('div');
    warning.className = `alert alert-${type === 'critical' ? 'error' : 'warning'} quota-warning`;
    
    const resetTimeText = resetTime ? 
      ` Resets at ${resetTime.toLocaleTimeString()}` : 
      '';

    warning.innerHTML = `
      <div class="alert-content">
        <h4>${type === 'critical' ? '🚨' : '⚠️'} ${service} Quota ${type === 'critical' ? 'Critical' : 'Warning'}</h4>
        <p>You have used ${usagePercent}% of your ${service} quota.${resetTimeText}</p>
        <div class="quota-details">
          <div class="quota-bar">
            <div class="quota-fill" style="width: ${usagePercent}%"></div>
          </div>
          ${quotaData?.remaining ? `<p>Remaining: ${quotaData.remaining} requests</p>` : ''}
          ${quotaData?.limit ? `<p>Limit: ${quotaData.limit} requests</p>` : ''}
        </div>
        <div class="quota-actions">
          <button class="btn btn-sm btn-primary" onclick="this.closest('.quota-warning').querySelector('.quota-details-modal').style.display='block'">
            View Details
          </button>
          <button class="btn btn-sm" onclick="this.closest('.alert').remove()">
            Dismiss
          </button>
        </div>
      </div>
      ${this.createQuotaDetailsModal(service, quotaData)}
    `;

    return warning;
  }

  /**
   * Create quota details modal
   * @param {string} service - Service name
   * @param {Object} quotaData - Quota data
   * @returns {string} Modal HTML
   * @private
   */
  createQuotaDetailsModal(service, quotaData) {
    const resetTime = quotaData?.resetTime ? new Date(quotaData.resetTime * 1000) : null;
    
    return `
      <div class="quota-details-modal" style="display: none;">
        <div class="modal-overlay">
          <div class="modal">
            <div class="modal-header">
              <h3 class="modal-title">${service} Usage Details</h3>
              <button class="modal-close" onclick="this.closest('.quota-details-modal').style.display='none'">×</button>
            </div>
            <div class="modal-content">
              <div class="quota-details">
                <div class="quota-bar">
                  <div class="quota-fill" style="width: ${Math.round(quotaData.usage * 100)}%"></div>
                </div>
                <div class="quota-stats">
                  <div class="stat">
                    <label>Usage:</label>
                    <span>${Math.round(quotaData.usage * 100)}%</span>
                  </div>
                  ${quotaData.used ? `
                    <div class="stat">
                      <label>Used:</label>
                      <span>${quotaData.used} requests</span>
                    </div>
                  ` : ''}
                  ${quotaData.remaining ? `
                    <div class="stat">
                      <label>Remaining:</label>
                      <span>${quotaData.remaining} requests</span>
                    </div>
                  ` : ''}
                  ${quotaData.limit ? `
                    <div class="stat">
                      <label>Limit:</label>
                      <span>${quotaData.limit} requests</span>
                    </div>
                  ` : ''}
                  ${resetTime ? `
                    <div class="stat">
                      <label>Resets:</label>
                      <span>${resetTime.toLocaleString()}</span>
                    </div>
                  ` : ''}
                </div>
                <div class="quota-recommendations">
                  <h4>Recommendations:</h4>
                  <ul>
                    ${this.getQuotaRecommendations(quotaData.usage)}
                  </ul>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-primary" onclick="this.closest('.quota-details-modal').style.display='none'">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get quota recommendations based on usage
   * @param {number} usage - Usage percentage
   * @returns {string} HTML list items
   * @private
   */
  getQuotaRecommendations(usage) {
    const recommendations = [];
    
    if (usage >= 0.95) {
      recommendations.push('<li>Consider waiting for quota reset before making more requests</li>');
      recommendations.push('<li>Review your API usage patterns to optimize requests</li>');
      recommendations.push('<li>Consider upgrading to a higher quota plan if available</li>');
    } else if (usage >= 0.8) {
      recommendations.push('<li>Monitor your usage closely to avoid hitting limits</li>');
      recommendations.push('<li>Consider batching requests to reduce API calls</li>');
      recommendations.push('<li>Cache responses when possible to reduce redundant requests</li>');
    }
    
    recommendations.push('<li>Set up usage alerts to monitor consumption</li>');
    recommendations.push('<li>Review API documentation for best practices</li>');
    
    return recommendations.join('');
  }

  /**
   * Display warning in the UI
   * @param {HTMLElement} warning - Warning element
   * @param {boolean} persistent - Whether warning should be persistent
   * @private
   */
  displayWarning(warning, persistent = false) {
    let container = document.getElementById('notification-container');
    
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'notification-container';
      document.body.appendChild(container);
    }

    if (persistent) {
      warning.classList.add('persistent');
    }

    container.appendChild(warning);

    // Auto-remove after 10 seconds if not persistent
    if (!persistent) {
      setTimeout(() => {
        if (warning.parentNode) {
          warning.style.opacity = '0';
          warning.style.transform = 'translateX(100%)';
          setTimeout(() => {
            if (warning.parentNode) {
              warning.parentNode.removeChild(warning);
            }
          }, 300);
        }
      }, 10000);
    }
  }

  /**
   * Handle quota exceeded error
   * @param {string} service - Service name
   * @param {Object} errorInfo - Error information
   */
  handleQuotaExceeded(service, errorInfo = {}) {
    const { resetTime, retryAfter } = errorInfo;
    
    // Update quota to 100% usage
    this.updateQuota(service, {
      usage: 1.0,
      resetTime: resetTime,
      remaining: 0
    });

    // Show quota exceeded notification
    this.showQuotaExceededNotification(service, { resetTime, retryAfter });
  }

  /**
   * Show quota exceeded notification
   * @param {string} service - Service name
   * @param {Object} options - Options
   * @private
   */
  showQuotaExceededNotification(service, options = {}) {
    const { resetTime, retryAfter } = options;
    
    let waitMessage = '';
    if (resetTime) {
      const resetDate = new Date(resetTime * 1000);
      waitMessage = ` Please wait until ${resetDate.toLocaleString()}.`;
    } else if (retryAfter) {
      waitMessage = ` Please wait ${retryAfter} seconds before trying again.`;
    }

    const notification = document.createElement('div');
    notification.className = 'alert alert-error persistent';
    notification.innerHTML = `
      <div class="alert-content">
        <h4>🚫 ${service} Quota Exceeded</h4>
        <p>You have reached your ${service} usage limit.${waitMessage}</p>
        <div class="error-recovery-actions">
          <button class="btn btn-sm btn-primary" onclick="window.location.reload()">
            Reload Page
          </button>
          <button class="btn btn-sm" onclick="this.closest('.alert').remove()">
            Dismiss
          </button>
        </div>
      </div>
    `;

    this.displayWarning(notification, true);
  }

  /**
   * Get quota status for a service
   * @param {string} service - Service name
   * @returns {Object|null} Quota status
   */
  getQuotaStatus(service) {
    return this.quotaData.get(service) || null;
  }

  /**
   * Get all quota statuses
   * @returns {Object} All quota statuses
   */
  getAllQuotaStatuses() {
    return Object.fromEntries(this.quotaData);
  }

  /**
   * Reset warnings for a service
   * @param {string} service - Service name
   */
  resetWarnings(service) {
    const serviceKey = service.toLowerCase();
    this.warningShown.delete(serviceKey);
    this.criticalWarningShown.delete(serviceKey);
  }

  /**
   * Clear all quota data
   */
  clearAllQuotaData() {
    this.quotaData.clear();
    this.warningShown.clear();
    this.criticalWarningShown.clear();
    this.saveQuotaData();
  }

  /**
   * Set warning thresholds
   * @param {number} warning - Warning threshold (0-1)
   * @param {number} critical - Critical threshold (0-1)
   */
  setThresholds(warning, critical) {
    this.warningThreshold = Math.max(0, Math.min(1, warning));
    this.criticalThreshold = Math.max(0, Math.min(1, critical));
  }
}

// Create global quota monitor instance
export const quotaMonitor = new QuotaMonitor();