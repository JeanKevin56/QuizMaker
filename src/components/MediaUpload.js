/**
 * Media Upload Component
 * Handles image upload, preview, validation, and storage for quiz questions
 */

import { createAlert } from './Layout.js';
import { MEDIA_TYPES } from '../models/types.js';
import { imageOptimizer } from '../utils/imageOptimizer.js';

export class MediaUpload {
    constructor(storageManager = null) {
        this.storageManager = storageManager;
        this.currentMedia = null;
        this.onMediaChange = null;
        this.container = null;
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
        this.allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    }

    /**
     * Initialize the media upload component
     * @param {HTMLElement} container - Container element
     * @param {Object} existingMedia - Existing media object (optional)
     * @param {Function} onMediaChange - Callback when media changes
     */
    init(container, existingMedia = null, onMediaChange = null) {
        this.container = container;
        this.currentMedia = existingMedia;
        this.onMediaChange = onMediaChange;

        this.render();
        this.attachEventListeners();
    }

    /**
     * Render the media upload interface
     */
    render() {
        this.container.innerHTML = `
            <div class="media-upload">
                <div class="media-upload-area" id="media-upload-area">
                    ${this.currentMedia ? this.renderMediaPreview() : this.renderUploadPrompt()}
                </div>
                
                <input 
                    type="file" 
                    id="media-file-input" 
                    class="media-file-input" 
                    accept="image/*"
                    style="display: none;"
                />
                
                <div class="media-upload-info">
                    <small class="media-help-text">
                        📷 Supported formats: JPEG, PNG, GIF, WebP<br>
                        📏 Maximum file size: 5MB<br>
                        💡 Images will be stored locally in your browser
                    </small>
                </div>

                <!-- Alerts container -->
                <div id="media-alerts-container" class="media-alerts-container"></div>
            </div>
        `;
    }

    /**
     * Render upload prompt when no media is selected
     * @returns {string} Upload prompt HTML
     */
    renderUploadPrompt() {
        return `
            <div class="media-upload-prompt">
                <div class="media-upload-icon">📷</div>
                <div class="media-upload-text">
                    <h4>Add Image to Question</h4>
                    <p>Click to browse or drag and drop an image file</p>
                </div>
                <button type="button" class="btn btn-secondary media-browse-btn">
                    Browse Files
                </button>
            </div>
        `;
    }

    /**
     * Render media preview when media is selected
     * @returns {string} Media preview HTML
     */
    renderMediaPreview() {
        return `
            <div class="media-preview">
                <div class="media-preview-image">
                    <img src="${this.currentMedia.url}" alt="Question media" class="preview-image" />
                </div>
                <div class="media-preview-actions">
                    <button type="button" class="btn btn-secondary btn-small media-change-btn">
                        Change Image
                    </button>
                    <button type="button" class="btn btn-error btn-small media-remove-btn">
                        Remove Image
                    </button>
                </div>
                <div class="media-preview-info">
                    <small class="media-info-text">
                        Image uploaded successfully
                    </small>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        const uploadArea = this.container.querySelector('#media-upload-area');
        const fileInput = this.container.querySelector('#media-file-input');

        // File input change
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        // Upload area click
        if (uploadArea) {
            uploadArea.addEventListener('click', (e) => this.handleUploadAreaClick(e));
        }

        // Drag and drop
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
            uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        }

        // Button clicks
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('media-browse-btn') || 
                e.target.classList.contains('media-change-btn')) {
                this.openFileDialog();
            } else if (e.target.classList.contains('media-remove-btn')) {
                this.removeMedia();
            }
        });
    }

    /**
     * Handle upload area click
     * @param {Event} e - Click event
     */
    handleUploadAreaClick(e) {
        // Only trigger file dialog if clicking on the upload prompt area
        if (!this.currentMedia && !e.target.classList.contains('btn')) {
            this.openFileDialog();
        }
    }

    /**
     * Handle drag over event
     * @param {Event} e - Drag event
     */
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const uploadArea = this.container.querySelector('#media-upload-area');
        if (uploadArea) {
            uploadArea.classList.add('drag-over');
        }
    }

    /**
     * Handle drag leave event
     * @param {Event} e - Drag event
     */
    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const uploadArea = this.container.querySelector('#media-upload-area');
        if (uploadArea) {
            uploadArea.classList.remove('drag-over');
        }
    }

    /**
     * Handle drop event
     * @param {Event} e - Drop event
     */
    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const uploadArea = this.container.querySelector('#media-upload-area');
        if (uploadArea) {
            uploadArea.classList.remove('drag-over');
        }

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    /**
     * Open file dialog
     */
    openFileDialog() {
        const fileInput = this.container.querySelector('#media-file-input');
        if (fileInput) {
            fileInput.click();
        }
    }

    /**
     * Handle file selection from input
     * @param {Event} e - Change event
     */
    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    /**
     * Process selected file
     * @param {File} file - Selected file
     */
    async processFile(file) {
        try {
            // Validate file
            const validation = this.validateFile(file);
            if (!validation.isValid) {
                this.showAlert(validation.error, 'error');
                return;
            }

            // Show loading state
            this.showLoadingState();

            // Optimize image before processing
            let processedFile = file;
            let optimizedData = null;
            
            try {
                optimizedData = await imageOptimizer.optimizeImage(file, {
                    maxWidth: 1200,
                    maxHeight: 800,
                    quality: 0.85
                });
                
                // Show compression info
                const compressionRatio = optimizedData.compressionRatio;
                if (compressionRatio > 10) {
                    this.showAlert(`Image optimized: ${compressionRatio.toFixed(1)}% size reduction`, 'info');
                }
                
                processedFile = optimizedData.blob;
            } catch (optimizationError) {
                console.warn('Image optimization failed, using original:', optimizationError);
                // Continue with original file if optimization fails
            }

            // Convert to base64
            const base64Data = optimizedData ? optimizedData.dataUrl : await this.fileToBase64(processedFile);
            
            // Create media object
            const mediaId = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const mediaObject = {
                id: mediaId,
                type: MEDIA_TYPES.IMAGE,
                url: base64Data,
                filename: file.name,
                size: optimizedData ? optimizedData.size : file.size,
                originalSize: file.size,
                mimeType: file.type,
                optimized: !!optimizedData,
                dimensions: optimizedData ? { width: optimizedData.width, height: optimizedData.height } : null
            };

            // Store in IndexedDB if storage manager is available
            if (this.storageManager) {
                try {
                    await this.storageManager.storeMedia(mediaId, base64Data, file.type);
                } catch (error) {
                    console.warn('Failed to store media in IndexedDB:', error);
                    // Continue anyway, media will still work with base64 URL
                }
            }

            // Update current media
            this.currentMedia = mediaObject;

            // Re-render with preview
            this.render();
            this.attachEventListeners();

            // Notify parent component
            if (this.onMediaChange) {
                this.onMediaChange(this.currentMedia);
            }

            this.showAlert('Image uploaded successfully!', 'success');

        } catch (error) {
            console.error('Error processing file:', error);
            this.showAlert('Failed to process image: ' + error.message, 'error');
            this.hideLoadingState();
        }
    }

    /**
     * Validate uploaded file
     * @param {File} file - File to validate
     * @returns {Object} Validation result
     */
    validateFile(file) {
        // Check file type
        if (!this.allowedTypes.includes(file.type)) {
            return {
                isValid: false,
                error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.'
            };
        }

        // Check file size
        if (file.size > this.maxFileSize) {
            const maxSizeMB = this.maxFileSize / (1024 * 1024);
            return {
                isValid: false,
                error: `File size too large. Maximum allowed size is ${maxSizeMB}MB.`
            };
        }

        // Check if it's actually an image
        if (!file.type.startsWith('image/')) {
            return {
                isValid: false,
                error: 'Please upload a valid image file.'
            };
        }

        return { isValid: true };
    }

    /**
     * Convert file to base64 data URL
     * @param {File} file - File to convert
     * @returns {Promise<string>} Base64 data URL
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = () => {
                resolve(reader.result);
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsDataURL(file);
        });
    }

    /**
     * Remove current media
     */
    async removeMedia() {
        if (!this.currentMedia) return;

        try {
            // Remove from IndexedDB if storage manager is available
            if (this.storageManager && this.currentMedia.id) {
                try {
                    await this.storageManager.deleteMedia(this.currentMedia.id);
                } catch (error) {
                    console.warn('Failed to delete media from IndexedDB:', error);
                    // Continue anyway
                }
            }

            // Clear current media
            this.currentMedia = null;

            // Re-render without preview
            this.render();
            this.attachEventListeners();

            // Notify parent component
            if (this.onMediaChange) {
                this.onMediaChange(null);
            }

            this.showAlert('Image removed successfully!', 'success');

        } catch (error) {
            console.error('Error removing media:', error);
            this.showAlert('Failed to remove image: ' + error.message, 'error');
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        const uploadArea = this.container.querySelector('#media-upload-area');
        if (uploadArea) {
            uploadArea.innerHTML = `
                <div class="media-loading">
                    <div class="loading-spinner"></div>
                    <p>Processing image...</p>
                </div>
            `;
        }
    }

    /**
     * Hide loading state
     */
    hideLoadingState() {
        this.render();
        this.attachEventListeners();
    }

    /**
     * Show alert message
     * @param {string} message - Alert message
     * @param {string} type - Alert type (success, error, warning, info)
     */
    showAlert(message, type = 'info') {
        const alertsContainer = this.container.querySelector('#media-alerts-container');
        if (!alertsContainer) return;

        const alert = createAlert({ message, type, dismissible: true });
        alertsContainer.appendChild(alert);

        // Auto-remove success and info alerts after 5 seconds
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.remove();
                }
            }, 5000);
        }
    }

    /**
     * Get current media object
     * @returns {Object|null} Current media object or null
     */
    getMedia() {
        return this.currentMedia;
    }

    /**
     * Set media object
     * @param {Object|null} media - Media object to set
     */
    setMedia(media) {
        this.currentMedia = media;
        this.render();
        this.attachEventListeners();
    }

    /**
     * Clear all media
     */
    clear() {
        this.currentMedia = null;
        this.render();
        this.attachEventListeners();
    }

    /**
     * Get supported file types
     * @returns {string[]} Array of supported MIME types
     */
    getSupportedTypes() {
        return [...this.allowedTypes];
    }

    /**
     * Get maximum file size
     * @returns {number} Maximum file size in bytes
     */
    getMaxFileSize() {
        return this.maxFileSize;
    }

    /**
     * Set maximum file size
     * @param {number} size - Maximum file size in bytes
     */
    setMaxFileSize(size) {
        this.maxFileSize = size;
    }
}