/**
 * Text Preprocessing Service
 * Handles text cleaning, formatting, chunking, and validation for AI processing
 */

export class TextPreprocessor {
    constructor() {
        this.maxChunkSize = 4000; // Characters per chunk for AI processing
        this.minChunkSize = 100;  // Minimum meaningful chunk size
        this.overlapSize = 200;   // Overlap between chunks to maintain context
    }

    /**
     * Cleans and formats raw text for AI processing
     * @param {string} rawText - Raw extracted text
     * @returns {string} - Cleaned and formatted text
     */
    cleanText(rawText) {
        if (!rawText || typeof rawText !== 'string') {
            return '';
        }

        let cleanedText = rawText
            // Remove excessive whitespace and normalize line breaks
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/[ \t]{2,}/g, ' ')
            
            // Remove page numbers and headers/footers patterns
            .replace(/^\s*\d+\s*$/gm, '')
            .replace(/^\s*Page \d+ of \d+\s*$/gm, '')
            .replace(/^\s*Chapter \d+\s*$/gm, '')
            
            // Clean up common PDF artifacts
            .replace(/[^\S\n]{2,}/g, ' ')
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            
            // Remove isolated single characters on lines
            .replace(/^\s*[a-zA-Z]\s*$/gm, '')
            
            // Fix common OCR errors
            .replace(/\bl\b/g, 'I') // Common OCR mistake
            .replace(/\b0\b/g, 'O') // Zero to O in context
            
            // Normalize punctuation
            .replace(/[""]/g, '"')
            .replace(/['']/g, "'")
            .replace(/…/g, '...')
            
            // Clean up extra newlines after removals
            .replace(/\n\s*\n/g, '\n')
            
            // Trim and normalize spacing
            .trim();

        return cleanedText;
    }

    /**
     * Validates text content for AI processing
     * @param {string} text - Text to validate
     * @returns {Object} - Validation result with success flag and details
     */
    validateContent(text) {
        if (!text || typeof text !== 'string') {
            return {
                success: false,
                message: 'No text content provided',
                details: { length: 0, wordCount: 0 }
            };
        }

        const trimmedText = text.trim();
        const wordCount = trimmedText.split(/\s+/).filter(word => word.length > 0).length;
        const charCount = trimmedText.length;

        // Check minimum content requirements - check word count first
        if (wordCount < 10) {
            return {
                success: false,
                message: 'Text content too short (minimum 10 words)',
                details: { length: charCount, wordCount }
            };
        }

        if (charCount < 50) {
            return {
                success: false,
                message: 'Text content too short (minimum 50 characters)',
                details: { length: charCount, wordCount }
            };
        }

        // Check for mostly non-alphabetic content
        const alphabeticChars = (trimmedText.match(/[a-zA-Z]/g) || []).length;
        const alphabeticRatio = alphabeticChars / charCount;
        
        if (alphabeticRatio < 0.5) {
            return {
                success: false,
                message: 'Text appears to contain mostly non-alphabetic content',
                details: { length: charCount, wordCount, alphabeticRatio }
            };
        }

        return {
            success: true,
            message: 'Text content is valid for processing',
            details: { 
                length: charCount, 
                wordCount,
                alphabeticRatio,
                estimatedChunks: Math.ceil(charCount / this.maxChunkSize)
            }
        };
    }

    /**
     * Splits large text into manageable chunks for AI processing
     * @param {string} text - Text to chunk
     * @param {Object} options - Chunking options
     * @returns {Array} - Array of text chunks with metadata
     */
    chunkText(text, options = {}) {
        const {
            maxSize = this.maxChunkSize,
            minSize = this.minChunkSize,
            overlap = this.overlapSize,
            preserveParagraphs = true
        } = options;

        if (!text || text.length <= maxSize) {
            return [{
                content: text,
                index: 0,
                startChar: 0,
                endChar: text.length,
                wordCount: text.split(/\s+/).filter(w => w.length > 0).length
            }];
        }

        const chunks = [];
        let currentPosition = 0;
        let chunkIndex = 0;

        while (currentPosition < text.length) {
            let chunkEnd = Math.min(currentPosition + maxSize, text.length);
            
            // If we're not at the end, try to break at a natural boundary
            if (chunkEnd < text.length && preserveParagraphs) {
                // Look for paragraph break first
                const paragraphBreak = text.lastIndexOf('\n\n', chunkEnd);
                if (paragraphBreak > currentPosition + minSize) {
                    chunkEnd = paragraphBreak + 2;
                } else {
                    // Look for sentence break
                    const sentenceBreak = text.lastIndexOf('. ', chunkEnd);
                    if (sentenceBreak > currentPosition + minSize) {
                        chunkEnd = sentenceBreak + 2;
                    } else {
                        // Look for word boundary
                        const wordBreak = text.lastIndexOf(' ', chunkEnd);
                        if (wordBreak > currentPosition + minSize) {
                            chunkEnd = wordBreak + 1;
                        }
                    }
                }
            }

            const chunkContent = text.substring(currentPosition, chunkEnd).trim();
            
            if (chunkContent.length >= minSize) {
                chunks.push({
                    content: chunkContent,
                    index: chunkIndex,
                    startChar: currentPosition,
                    endChar: chunkEnd,
                    wordCount: chunkContent.split(/\s+/).filter(w => w.length > 0).length
                });
                chunkIndex++;
            }

            // Move position forward, accounting for overlap
            const nextPosition = Math.max(chunkEnd - overlap, currentPosition + minSize);
            if (nextPosition <= currentPosition) {
                // Prevent infinite loop
                currentPosition = chunkEnd;
            } else {
                currentPosition = nextPosition;
            }
        }

        return chunks;
    }

    /**
     * Sanitizes text content to prevent potential security issues
     * @param {string} text - Text to sanitize
     * @returns {string} - Sanitized text
     */
    sanitizeContent(text) {
        if (!text || typeof text !== 'string') {
            return '';
        }

        return text
            // Remove potential HTML/XML tags
            .replace(/<[^>]*>/g, '')
            
            // Remove potential script content
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            
            // Remove excessive special characters
            .replace(/[^\w\s\.\,\!\?\;\:\-\(\)\[\]\{\}\"\']/g, '')
            
            // Normalize whitespace
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Extracts key information and metadata from text
     * @param {string} text - Text to analyze
     * @returns {Object} - Extracted metadata and key information
     */
    extractMetadata(text) {
        if (!text || typeof text !== 'string') {
            return {
                wordCount: 0,
                charCount: 0,
                paragraphCount: 0,
                estimatedReadingTime: 0,
                keyTopics: [],
                language: 'unknown'
            };
        }

        const words = text.split(/\s+/).filter(word => word.length > 0);
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        
        // Estimate reading time (average 200 words per minute)
        const estimatedReadingTime = Math.ceil(words.length / 200);

        // Extract potential key topics (simple keyword extraction)
        const keyTopics = this.extractKeywords(text);

        // Simple language detection (very basic)
        const language = this.detectLanguage(text);

        return {
            wordCount: words.length,
            charCount: text.length,
            paragraphCount: paragraphs.length,
            estimatedReadingTime,
            keyTopics,
            language,
            averageWordsPerParagraph: Math.round(words.length / Math.max(paragraphs.length, 1)),
            complexity: this.assessComplexity(text)
        };
    }

    /**
     * Simple keyword extraction
     * @param {string} text - Text to extract keywords from
     * @returns {Array} - Array of potential keywords
     */
    extractKeywords(text) {
        // Common stop words to filter out
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
            'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does',
            'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that',
            'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her',
            'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'over'
        ]);

        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !stopWords.has(word));

        // Count word frequency
        const wordCount = {};
        words.forEach(word => {
            wordCount[word] = (wordCount[word] || 0) + 1;
        });

        // Return top keywords
        return Object.entries(wordCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([word, count]) => ({ word, frequency: count }));
    }

    /**
     * Basic language detection
     * @param {string} text - Text to analyze
     * @returns {string} - Detected language code
     */
    detectLanguage(text) {
        // Very basic language detection based on common words
        const englishWords = ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'with'];
        const sample = text.toLowerCase().split(/\s+/).slice(0, 100);
        
        const englishMatches = sample.filter(word => englishWords.includes(word)).length;
        
        if (englishMatches >= 3) {
            return 'en';
        }
        
        return 'unknown';
    }

    /**
     * Assess text complexity
     * @param {string} text - Text to analyze
     * @returns {string} - Complexity level (basic, intermediate, advanced)
     */
    assessComplexity(text) {
        const words = text.split(/\s+/).filter(word => word.length > 0);
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        
        if (words.length === 0 || sentences.length === 0) {
            return 'basic';
        }

        const avgWordsPerSentence = words.length / sentences.length;
        const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
        
        // Simple complexity scoring - adjusted thresholds
        if (avgWordsPerSentence > 25 || avgWordLength > 7) {
            return 'advanced';
        } else if (avgWordsPerSentence > 12 || avgWordLength > 5.5) {
            return 'intermediate';
        } else {
            return 'basic';
        }
    }

    /**
     * Processes text through the complete preprocessing pipeline
     * @param {string} rawText - Raw text input
     * @param {Object} options - Processing options
     * @returns {Object} - Processed text with metadata and chunks
     */
    processText(rawText, options = {}) {
        try {
            // Step 1: Clean the text
            const cleanedText = this.cleanText(rawText);
            
            // Step 2: Validate content
            const validation = this.validateContent(cleanedText);
            if (!validation.success) {
                return {
                    success: false,
                    error: validation.message,
                    details: validation.details
                };
            }

            // Step 3: Sanitize content
            const sanitizedText = this.sanitizeContent(cleanedText);
            
            // Step 4: Extract metadata
            const metadata = this.extractMetadata(sanitizedText);
            
            // Step 5: Create chunks
            const chunks = this.chunkText(sanitizedText, options);
            
            return {
                success: true,
                processedText: sanitizedText,
                metadata,
                chunks,
                validation: validation.details
            };
        } catch (error) {
            return {
                success: false,
                error: `Text processing failed: ${error.message}`,
                details: { originalLength: rawText?.length || 0 }
            };
        }
    }
}