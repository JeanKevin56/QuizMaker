/**
 * Text Preview Component
 * Provides interface for users to review processed text before AI generation
 */

import { TextPreprocessor } from '../services/TextPreprocessor.js';

export class TextPreview {
    constructor(container) {
        this.container = container;
        this.textPreprocessor = new TextPreprocessor();
        this.processedData = null;
        this.callbacks = {
            onApprove: null,
            onReject: null,
            onEdit: null
        };
        
        this.render();
    }

    /**
     * Sets callback functions for user actions
     * @param {Object} callbacks - Callback functions
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * Displays processed text for user review
     * @param {Object} processedData - Result from TextPreprocessor.processText()
     */
    showPreview(processedData) {
        this.processedData = processedData;
        
        if (!processedData.success) {
            this.showError(processedData.error);
            return;
        }

        this.updatePreviewContent();
        this.container.style.display = 'block';
    }

    /**
     * Hides the preview interface
     */
    hide() {
        this.container.style.display = 'none';
        this.processedData = null;
    }

    /**
     * Shows error message
     * @param {string} errorMessage - Error message to display
     */
    showError(errorMessage) {
        const errorContainer = this.container.querySelector('.text-preview-error');
        errorContainer.textContent = errorMessage;
        errorContainer.style.display = 'block';
        
        const contentContainer = this.container.querySelector('.text-preview-content');
        contentContainer.style.display = 'none';
    }

    /**
     * Updates the preview content with processed data
     */
    updatePreviewContent() {
        const { processedText, metadata, chunks, validation } = this.processedData;
        
        // Update metadata display
        this.updateMetadataDisplay(metadata, validation);
        
        // Update text content
        const textDisplay = this.container.querySelector('.processed-text-display');
        textDisplay.textContent = processedText;
        
        // Update chunks display
        this.updateChunksDisplay(chunks);
        
        // Show content, hide error
        const errorContainer = this.container.querySelector('.text-preview-error');
        errorContainer.style.display = 'none';
        
        const contentContainer = this.container.querySelector('.text-preview-content');
        contentContainer.style.display = 'block';
    }

    /**
     * Updates metadata display
     * @param {Object} metadata - Text metadata
     * @param {Object} validation - Validation details
     */
    updateMetadataDisplay(metadata, validation) {
        const metadataContainer = this.container.querySelector('.text-metadata');
        
        metadataContainer.innerHTML = `
            <div class="metadata-grid">
                <div class="metadata-item">
                    <span class="metadata-label">Word Count:</span>
                    <span class="metadata-value">${metadata.wordCount.toLocaleString()}</span>
                </div>
                <div class="metadata-item">
                    <span class="metadata-label">Character Count:</span>
                    <span class="metadata-value">${metadata.charCount.toLocaleString()}</span>
                </div>
                <div class="metadata-item">
                    <span class="metadata-label">Paragraphs:</span>
                    <span class="metadata-value">${metadata.paragraphCount}</span>
                </div>
                <div class="metadata-item">
                    <span class="metadata-label">Reading Time:</span>
                    <span class="metadata-value">${metadata.estimatedReadingTime} min</span>
                </div>
                <div class="metadata-item">
                    <span class="metadata-label">Complexity:</span>
                    <span class="metadata-value complexity-${metadata.complexity}">${metadata.complexity}</span>
                </div>
                <div class="metadata-item">
                    <span class="metadata-label">Language:</span>
                    <span class="metadata-value">${metadata.language}</span>
                </div>
                <div class="metadata-item">
                    <span class="metadata-label">Chunks:</span>
                    <span class="metadata-value">${validation.estimatedChunks}</span>
                </div>
            </div>
        `;

        // Display key topics if available
        if (metadata.keyTopics && metadata.keyTopics.length > 0) {
            const topicsContainer = document.createElement('div');
            topicsContainer.className = 'key-topics';
            topicsContainer.innerHTML = `
                <h4>Key Topics:</h4>
                <div class="topics-list">
                    ${metadata.keyTopics.slice(0, 5).map(topic => 
                        `<span class="topic-tag">${topic.word} (${topic.frequency})</span>`
                    ).join('')}
                </div>
            `;
            metadataContainer.appendChild(topicsContainer);
        }
    }

    /**
     * Updates chunks display
     * @param {Array} chunks - Text chunks
     */
    updateChunksDisplay(chunks) {
        const chunksContainer = this.container.querySelector('.text-chunks');
        
        if (chunks.length <= 1) {
            chunksContainer.innerHTML = '<p class="no-chunks">Text will be processed as a single chunk.</p>';
            return;
        }

        chunksContainer.innerHTML = `
            <h4>Text Chunks (${chunks.length} total):</h4>
            <div class="chunks-list">
                ${chunks.map((chunk, index) => `
                    <div class="chunk-item" data-chunk-index="${index}">
                        <div class="chunk-header">
                            <span class="chunk-title">Chunk ${index + 1}</span>
                            <span class="chunk-info">${chunk.wordCount} words</span>
                            <button class="chunk-toggle" type="button">Show</button>
                        </div>
                        <div class="chunk-content" style="display: none;">
                            <div class="chunk-text">${this.truncateText(chunk.content, 200)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Add chunk toggle functionality
        this.setupChunkToggles();
    }

    /**
     * Sets up chunk toggle functionality
     */
    setupChunkToggles() {
        const toggleButtons = this.container.querySelectorAll('.chunk-toggle');
        
        toggleButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const chunkItem = e.target.closest('.chunk-item');
                const chunkContent = chunkItem.querySelector('.chunk-content');
                const isVisible = chunkContent.style.display !== 'none';
                
                if (isVisible) {
                    chunkContent.style.display = 'none';
                    button.textContent = 'Show';
                } else {
                    chunkContent.style.display = 'block';
                    button.textContent = 'Hide';
                }
            });
        });
    }

    /**
     * Truncates text for preview
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} - Truncated text
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) {
            return text;
        }
        
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Renders the preview interface
     */
    render() {
        this.container.innerHTML = `
            <div class="text-preview-modal" style="display: none;">
                <div class="text-preview-header">
                    <h3>Review Processed Text</h3>
                    <button class="close-preview" type="button">&times;</button>
                </div>
                
                <div class="text-preview-error" style="display: none;">
                    <!-- Error message will be inserted here -->
                </div>
                
                <div class="text-preview-content">
                    <div class="text-metadata">
                        <!-- Metadata will be inserted here -->
                    </div>
                    
                    <div class="text-preview-section">
                        <h4>Processed Text:</h4>
                        <div class="processed-text-container">
                            <div class="processed-text-display"></div>
                        </div>
                    </div>
                    
                    <div class="text-chunks">
                        <!-- Chunks will be inserted here -->
                    </div>
                    
                    <div class="text-preview-actions">
                        <button class="btn-secondary edit-text" type="button">Edit Text</button>
                        <button class="btn-secondary reject-text" type="button">Cancel</button>
                        <button class="btn-primary approve-text" type="button">Use for Quiz Generation</button>
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
    }

    /**
     * Sets up event listeners for the preview interface
     */
    setupEventListeners() {
        // Close button
        const closeButton = this.container.querySelector('.close-preview');
        closeButton.addEventListener('click', () => {
            this.hide();
            if (this.callbacks.onReject) {
                this.callbacks.onReject();
            }
        });

        // Action buttons
        const approveButton = this.container.querySelector('.approve-text');
        approveButton.addEventListener('click', () => {
            if (this.callbacks.onApprove && this.processedData) {
                this.callbacks.onApprove(this.processedData);
            }
            this.hide();
        });

        const rejectButton = this.container.querySelector('.reject-text');
        rejectButton.addEventListener('click', () => {
            this.hide();
            if (this.callbacks.onReject) {
                this.callbacks.onReject();
            }
        });

        const editButton = this.container.querySelector('.edit-text');
        editButton.addEventListener('click', () => {
            if (this.callbacks.onEdit && this.processedData) {
                this.callbacks.onEdit(this.processedData.processedText);
            }
        });

        // Click outside to close
        this.container.addEventListener('click', (e) => {
            if (e.target === this.container) {
                this.hide();
                if (this.callbacks.onReject) {
                    this.callbacks.onReject();
                }
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.container.style.display !== 'none') {
                this.hide();
                if (this.callbacks.onReject) {
                    this.callbacks.onReject();
                }
            }
        });
    }

    /**
     * Updates the processed text (for editing functionality)
     * @param {string} newText - Updated text content
     */
    updateProcessedText(newText) {
        if (!this.processedData) return;

        // Reprocess the updated text
        const updatedData = this.textPreprocessor.processText(newText);
        
        if (updatedData.success) {
            this.processedData = updatedData;
            this.updatePreviewContent();
        } else {
            this.showError(updatedData.error);
        }
    }
}