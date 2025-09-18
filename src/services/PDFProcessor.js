/**
 * PDF Processing Service
 * Handles PDF file upload, text extraction, and error handling
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker with fallback options
const configureWorker = () => {
    // Always set a worker source - PDF.js requires this
    const workerSources = [
        `https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.js`,
        `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.js`,
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js`
    ];
    
    // Use the first available source
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSources[0];
};

configureWorker();

export class PDFProcessor {
    constructor() {
        this.maxFileSize = 10 * 1024 * 1024; // 10MB limit
        this.supportedTypes = ['application/pdf'];
        this.workerInitialized = false;
    }

    /**
     * Initialize PDF.js worker with fallback handling
     * @returns {Promise<boolean>} - True if worker is successfully initialized
     */
    async initializeWorker() {
        if (this.workerInitialized) {
            return true;
        }

        try {
            // Try different worker sources
            const workerSources = [
                `https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.js`,
                `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.js`,
                `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js`
            ];

            for (const workerSrc of workerSources) {
                try {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
                    
                    // Test with a simple PDF processing task
                    const testResult = await this.testPdfProcessing();
                    if (testResult) {
                        console.log(`PDF.js worker initialized successfully with: ${workerSrc}`);
                        this.workerInitialized = true;
                        return true;
                    }
                } catch (error) {
                    console.warn(`Failed to initialize PDF.js worker with ${workerSrc}:`, error);
                    continue;
                }
            }

            console.error('Failed to initialize PDF.js worker with any CDN source');
            return false;

        } catch (error) {
            console.error('Failed to initialize PDF.js:', error);
            return false;
        }
    }

    /**
     * Test PDF processing capability
     * @returns {Promise<boolean>} - True if PDF processing works
     */
    async testPdfProcessing() {
        try {
            // Create a minimal valid PDF for testing
            const minimalPdf = this.createMinimalPdfBuffer();
            await pdfjsLib.getDocument({ data: minimalPdf }).promise;
            return true;
        } catch (error) {
            console.warn('PDF processing test failed:', error);
            return false;
        }
    }

    /**
     * Create a minimal PDF buffer for testing
     * @returns {Uint8Array} - Minimal PDF buffer
     */
    createMinimalPdfBuffer() {
        // This is a minimal valid PDF that contains just the header and basic structure
        const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
>>
endobj

xref
0 4
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000100 00000 n 
trailer
<<
/Size 4
/Root 1 0 R
>>
startxref
149
%%EOF`;
        
        return new TextEncoder().encode(pdfContent);
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

            // Initialize worker if not already done
            const workerReady = await this.initializeWorker();
            if (!workerReady) {
                throw new Error('PDF processing service is currently unavailable. This may be due to network connectivity issues or browser compatibility. Please try refreshing the page or use the text generation option instead.');
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

            // Initialize worker if not already done
            const workerReady = await this.initializeWorker();
            if (!workerReady) {
                throw new Error('PDF processing service is currently unavailable. This may be due to network connectivity issues or browser compatibility. Please try refreshing the page or use the text generation option instead.');
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
        return typeof pdfjsLib !== 'undefined' && this.workerInitialized;
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