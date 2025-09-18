/**
 * Offline Indicator Component
 * Displays offline status and provides reconnection functionality
 */

export class OfflineIndicator {
  constructor() {
    this.isOnline = navigator.onLine;
    this.indicator = null;
    this.connectionStatus = null;
    this.retryAttempts = 0;
    this.maxRetryAttempts = 3;
    this.retryDelay = 5000; // 5 seconds
    
    this.init();
  }

  /**
   * Initialize the offline indicator
   */
  init() {
    this.createIndicator();
    this.createConnectionStatus();
    this.setupEventListeners();
    this.updateStatus(this.isOnline);
  }

  /**
   * Create the offline indicator element
   * @private
   */
  createIndicator() {
    this.indicator = document.createElement('div');
    this.indicator.className = 'offline-indicator';
    this.indicator.innerHTML = `
      <span class="offline-message">You are offline</span>
      <button class="reconnect-button">Try to reconnect</button>
    `;
    
    // Add click handler for reconnect button
    const reconnectButton = this.indicator.querySelector('.reconnect-button');
    reconnectButton.addEventListener('click', () => this.attemptReconnection());
    
    document.body.appendChild(this.indicator);
  }

  /**
   * Create the connection status indicator
   * @private
   */
  createConnectionStatus() {
    this.connectionStatus = document.createElement('div');
    this.connectionStatus.className = 'connection-status';
    this.connectionStatus.innerHTML = `
      <div class="connection-status-dot"></div>
      <span class="connection-status-text">Online</span>
    `;
    
    document.body.appendChild(this.connectionStatus);
  }

  /**
   * Setup event listeners for online/offline events
   * @private
   */
  setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.retryAttempts = 0;
      this.updateStatus(true);
      this.showReconnectedMessage();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateStatus(false);
    });

    // Periodic connectivity check
    setInterval(() => {
      this.checkConnectivity();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Update the status indicators
   * @param {boolean} isOnline - Online status
   * @private
   */
  updateStatus(isOnline) {
    if (isOnline) {
      this.hideOfflineIndicator();
      this.updateConnectionStatus('online', 'Online');
    } else {
      this.showOfflineIndicator();
      this.updateConnectionStatus('offline', 'Offline');
    }
  }

  /**
   * Show the offline indicator
   * @private
   */
  showOfflineIndicator() {
    this.indicator.classList.add('show');
    
    // Update message based on retry attempts
    const message = this.indicator.querySelector('.offline-message');
    if (this.retryAttempts > 0) {
      message.textContent = `Connection lost. Retry attempt ${this.retryAttempts}/${this.maxRetryAttempts}`;
    } else {
      message.textContent = 'You are offline. Some features may not work.';
    }
  }

  /**
   * Hide the offline indicator
   * @private
   */
  hideOfflineIndicator() {
    this.indicator.classList.remove('show');
  }

  /**
   * Update connection status indicator
   * @param {string} status - Status class (online/offline)
   * @param {string} text - Status text
   * @private
   */
  updateConnectionStatus(status, text) {
    this.connectionStatus.className = `connection-status ${status}`;
    this.connectionStatus.querySelector('.connection-status-text').textContent = text;
    
    // Show status indicator temporarily
    this.connectionStatus.classList.add('show');
    
    // Hide after 3 seconds if online
    if (status === 'online') {
      setTimeout(() => {
        this.connectionStatus.classList.remove('show');
      }, 3000);
    }
  }

  /**
   * Check connectivity with a simple request
   * @private
   */
  async checkConnectivity() {
    try {
      // Try to fetch a small resource
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      const wasOffline = !this.isOnline;
      this.isOnline = response.ok;
      
      // If we were offline and now we're online, update status
      if (wasOffline && this.isOnline) {
        this.retryAttempts = 0;
        this.updateStatus(true);
        this.showReconnectedMessage();
      }
    } catch (error) {
      const wasOnline = this.isOnline;
      this.isOnline = false;
      
      // If we were online and now we're offline, update status
      if (wasOnline && !this.isOnline) {
        this.updateStatus(false);
      }
    }
  }

  /**
   * Attempt to reconnect
   * @private
   */
  async attemptReconnection() {
    if (this.retryAttempts >= this.maxRetryAttempts) {
      this.showMaxRetriesMessage();
      return;
    }

    this.retryAttempts++;
    this.updateReconnectButton(true);
    
    try {
      await this.checkConnectivity();
      
      if (this.isOnline) {
        this.showReconnectedMessage();
      } else {
        this.scheduleNextRetry();
      }
    } catch (error) {
      this.scheduleNextRetry();
    } finally {
      this.updateReconnectButton(false);
    }
  }

  /**
   * Schedule next retry attempt
   * @private
   */
  scheduleNextRetry() {
    const button = this.indicator.querySelector('.reconnect-button');
    let countdown = this.retryDelay / 1000;
    
    const updateCountdown = () => {
      if (countdown > 0) {
        button.textContent = `Retry in ${countdown}s`;
        countdown--;
        setTimeout(updateCountdown, 1000);
      } else {
        button.textContent = 'Try to reconnect';
        button.disabled = false;
      }
    };
    
    button.disabled = true;
    updateCountdown();
  }

  /**
   * Update reconnect button state
   * @param {boolean} isLoading - Loading state
   * @private
   */
  updateReconnectButton(isLoading) {
    const button = this.indicator.querySelector('.reconnect-button');
    
    if (isLoading) {
      button.textContent = 'Connecting...';
      button.disabled = true;
      button.classList.add('loading');
    } else {
      button.textContent = 'Try to reconnect';
      button.disabled = false;
      button.classList.remove('loading');
    }
  }

  /**
   * Show reconnected message
   * @private
   */
  showReconnectedMessage() {
    // Create temporary success notification
    const notification = document.createElement('div');
    notification.className = 'alert alert-success notification';
    notification.innerHTML = `
      <div class="alert-content">
        <strong>Connection restored!</strong> You are back online.
      </div>
    `;
    
    // Add to notification container or create one
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'notification-container';
      document.body.appendChild(container);
    }
    
    container.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          notification.parentNode.removeChild(notification);
        }, 300);
      }
    }, 3000);
  }

  /**
   * Show max retries message
   * @private
   */
  showMaxRetriesMessage() {
    const message = this.indicator.querySelector('.offline-message');
    const button = this.indicator.querySelector('.reconnect-button');
    
    message.textContent = 'Unable to reconnect. Please check your internet connection.';
    button.textContent = 'Reload page';
    button.onclick = () => window.location.reload();
  }

  /**
   * Get current online status
   * @returns {boolean} Online status
   */
  getOnlineStatus() {
    return this.isOnline;
  }

  /**
   * Manually trigger connectivity check
   */
  async checkConnection() {
    await this.checkConnectivity();
    return this.isOnline;
  }

  /**
   * Show connection status temporarily
   */
  showConnectionStatus() {
    this.connectionStatus.classList.add('show');
    
    setTimeout(() => {
      this.connectionStatus.classList.remove('show');
    }, 3000);
  }

  /**
   * Destroy the offline indicator
   */
  destroy() {
    if (this.indicator && this.indicator.parentNode) {
      this.indicator.parentNode.removeChild(this.indicator);
    }
    
    if (this.connectionStatus && this.connectionStatus.parentNode) {
      this.connectionStatus.parentNode.removeChild(this.connectionStatus);
    }
  }
}

// Create global offline indicator instance
export const offlineIndicator = new OfflineIndicator();