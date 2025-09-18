/**
 * PDF Processing Service
 * Handles PDF file upload, text extraction, and error handling
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js`;

export class PDFProcessor {
    constructor() {
        this.maxFileSize = 10 * 1024 * 1024; // 10MB limit
        this.supportedTypes = ['application/pdf'];
    }

    /**
     * Validates PDF file before processing
     * @param {File} file - The PDF file to validate
     * @returns {Object} - Validation result with success flag and message
     */
    validateFile(file) {
        if (!file) {
            return { success: false, message: 'No file provided' };
        }

        if (!this.supportedTypes.includes(file.type)) {
            return { success: false, message: 'File must be a PDF' };
        }

        if (file.size > this.maxFileSize) {
            return { success: false, message: 'File size must be less than 10MB' };
        }

        return { success: true, message: 'File is valid' };
    }

    /**
     * Extracts text from PDF file
     * @param {File} file - The PDF file to process
     * @returns {Promise<Object>} - Extraction result with text content and metadata
     */
    async extractText(file) {
        try {
            // Validate file first
            const validation = this.validateFile(file);
            if (!validation.success) {
                throw new Error(validation.message);
            }

            // Convert file to array buffer
            const arrayBuffer = await file.arrayBuffer();
            
            // Load PDF document
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            let fullText = '';
            const pageTexts = [];
            
            // Extract text from each page
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                
                // Combine text items from the page
                const pageText = textContent.items
                    .map(item => item.str)
                    .join(' ')
                    .trim();
                
                pageTexts.push({
                    pageNumber: pageNum,
                    text: pageText
                });
                
                fullText += pageText + '\n\n';
            }

            return {
                success: true,
                text: fullText.trim(),
                metadata: {
                    fileName: file.name,
                    fileSize: file.size,
                    pageCount: pdf.numPages,
                    extractedAt: new Date().toISOString()
                },
                pages: pageTexts
            };

        } catch (error) {
            console.error('PDF extraction error:', error);
            return {
                success: false,
                error: error.message || 'Failed to extract text from PDF',
                text: '',
                metadata: null,
                pages: []
            };
        }
    }

    /**
     * Processes PDF file and returns formatted text
     * @param {File} file - The PDF file to process
     * @returns {Promise<string>} - Extracted and formatted text
     */
    async processFile(file) {
        const result = await this.extractText(file);
        
        if (!result.success) {
            throw new Error(result.error);
        }

        return this.formatExtractedText(result.text);
    }

    /**
     * Formats extracted text for better readability
     * @param {string} text - Raw extracted text
     * @returns {string} - Formatted text
     */
    formatExtractedText(text) {
        if (!text) return '';

        return text
            // Remove excessive whitespace
            .replace(/\s+/g, ' ')
            // Remove multiple line breaks
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            // Trim each line
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n')
            .trim();
    }

    /**
     * Gets PDF metadata without extracting full text
     * @param {File} file - The PDF file
     * @returns {Promise<Object>} - PDF metadata
     */
    async getMetadata(file) {
        try {
            const validation = this.validateFile(file);
            if (!validation.success) {
                throw new Error(validation.message);
            }

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const metadata = await pdf.getMetadata();

            return {
                success: true,
                metadata: {
                    fileName: file.name,
                    fileSize: file.size,
                    pageCount: pdf.numPages,
                    title: metadata.info?.Title || '',
                    author: metadata.info?.Author || '',
                    subject: metadata.info?.Subject || '',
                    creator: metadata.info?.Creator || '',
                    producer: metadata.info?.Producer || '',
                    creationDate: metadata.info?.CreationDate || null,
                    modificationDate: metadata.info?.ModDate || null
                }
            };

        } catch (error) {
            console.error('PDF metadata extraction error:', error);
            return {
                success: false,
                error: error.message || 'Failed to extract PDF metadata',
                metadata: null
            };
        }
    }

    /**
     * Checks if PDF.js is properly loaded and configured
     * @returns {boolean} - True if PDF.js is ready
     */
    isReady() {
        return typeof pdfjsLib !== 'undefined' && 
               pdfjsLib.GlobalWorkerOptions.workerSrc !== '';
    }

    /**
     * Gets processing statistics
     * @returns {Object} - Processing limits and capabilities
     */
    getProcessingInfo() {
        return {
            maxFileSize: this.maxFileSize,
            maxFileSizeMB: Math.round(this.maxFileSize / (1024 * 1024)),
            supportedTypes: [...this.supportedTypes],
            isReady: this.isReady()
        };
    }
}