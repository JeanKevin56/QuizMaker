/**
 * Unit tests for TextPreprocessor service
 */

import { TextPreprocessor } from '../services/TextPreprocessor.js';

describe('TextPreprocessor', () => {
    let textPreprocessor;

    beforeEach(() => {
        textPreprocessor = new TextPreprocessor();
    });

    describe('cleanText', () => {
        test('should handle null and undefined input', () => {
            expect(textPreprocessor.cleanText(null)).toBe('');
            expect(textPreprocessor.cleanText(undefined)).toBe('');
            expect(textPreprocessor.cleanText('')).toBe('');
        });

        test('should normalize line breaks', () => {
            const input = 'Line 1\r\nLine 2\rLine 3\nLine 4';
            const result = textPreprocessor.cleanText(input);
            expect(result).toBe('Line 1\nLine 2\nLine 3\nLine 4');
        });

        test('should remove excessive whitespace', () => {
            const input = 'Word1    Word2\t\t\tWord3     Word4';
            const result = textPreprocessor.cleanText(input);
            expect(result).toBe('Word1 Word2 Word3 Word4');
        });

        test('should remove page numbers and headers', () => {
            const input = 'Content here\n123\nMore content\nPage 5 of 10\nFinal content';
            const result = textPreprocessor.cleanText(input);
            expect(result).toBe('Content here\nMore content\nFinal content');
        });

        test('should normalize punctuation', () => {
            const input = '"Smart quotes" and \'apostrophes\' with ellipsis…';
            const result = textPreprocessor.cleanText(input);
            expect(result).toBe('"Smart quotes" and \'apostrophes\' with ellipsis...');
        });

        test('should handle complex text cleaning', () => {
            const input = `
                Chapter 1
                
                
                This is    some text with    excessive   spacing.
                
                Page 1 of 5
                
                More content here…
                
                a
                
                Final paragraph.
            `;
            const result = textPreprocessor.cleanText(input);
            expect(result).toContain('This is some text with excessive spacing.');
            expect(result).toContain('More content here...');
            expect(result).toContain('Final paragraph.');
            expect(result).not.toContain('Chapter 1');
            expect(result).not.toContain('Page 1 of 5');
        });
    });

    describe('validateContent', () => {
        test('should reject null or empty content', () => {
            expect(textPreprocessor.validateContent(null).success).toBe(false);
            expect(textPreprocessor.validateContent('').success).toBe(false);
            expect(textPreprocessor.validateContent('   ').success).toBe(false);
        });

        test('should reject content that is too short', () => {
            const shortText = 'Too short';
            const result = textPreprocessor.validateContent(shortText);
            expect(result.success).toBe(false);
            expect(result.message).toContain('too short');
        });

        test('should reject content with too few words', () => {
            const fewWords = 'One two three four five six seven eight nine';
            const result = textPreprocessor.validateContent(fewWords);
            expect(result.success).toBe(false);
            expect(result.message).toContain('minimum 10 words');
        });

        test('should reject mostly non-alphabetic content', () => {
            const numericText = '123456789 987654321 111222333 444555666 777888999 000111222 333444555 666777888 999000111 222333444';
            const result = textPreprocessor.validateContent(numericText);
            expect(result.success).toBe(false);
            expect(result.message).toContain('non-alphabetic');
        });

        test('should accept valid content', () => {
            const validText = 'This is a valid piece of text that contains enough words and characters to pass validation checks for processing.';
            const result = textPreprocessor.validateContent(validText);
            expect(result.success).toBe(true);
            expect(result.details.wordCount).toBeGreaterThan(10);
            expect(result.details.length).toBeGreaterThan(50);
        });

        test('should provide detailed validation information', () => {
            const text = 'This is a test text with exactly twenty words to check the validation details and word counting functionality works correctly.';
            const result = textPreprocessor.validateContent(text);
            expect(result.success).toBe(true);
            expect(result.details.wordCount).toBe(20);
            expect(result.details.length).toBe(text.length);
            expect(result.details.estimatedChunks).toBe(1);
        });
    });

    describe('chunkText', () => {
        test('should return single chunk for short text', () => {
            const shortText = 'This is a short text that should not be chunked.';
            const chunks = textPreprocessor.chunkText(shortText);
            expect(chunks).toHaveLength(1);
            expect(chunks[0].content).toBe(shortText);
            expect(chunks[0].index).toBe(0);
        });

        test('should split long text into multiple chunks', () => {
            const longText = 'A'.repeat(10000); // 10,000 characters
            const chunks = textPreprocessor.chunkText(longText);
            expect(chunks.length).toBeGreaterThan(1);
            expect(chunks[0].content.length).toBeLessThanOrEqual(4000);
        });

        test('should preserve paragraph boundaries when possible', () => {
            const textWithParagraphs = 'First paragraph with some content.\n\nSecond paragraph with more content.\n\nThird paragraph with even more content.';
            const chunks = textPreprocessor.chunkText(textWithParagraphs, { maxSize: 50 });
            
            // Should break at paragraph boundaries
            chunks.forEach(chunk => {
                expect(chunk.content.trim()).not.toBe('');
            });
        });

        test('should include chunk metadata', () => {
            const text = 'This is a test text for chunking functionality.';
            const chunks = textPreprocessor.chunkText(text);
            
            expect(chunks[0]).toHaveProperty('content');
            expect(chunks[0]).toHaveProperty('index');
            expect(chunks[0]).toHaveProperty('startChar');
            expect(chunks[0]).toHaveProperty('endChar');
            expect(chunks[0]).toHaveProperty('wordCount');
            expect(chunks[0].wordCount).toBe(8);
        });

        test('should handle custom chunking options', () => {
            const longText = 'Word '.repeat(1000); // 5000 characters
            const chunks = textPreprocessor.chunkText(longText, {
                maxSize: 100,
                minSize: 20,
                overlap: 10
            });
            
            expect(chunks.length).toBeGreaterThan(1);
            chunks.forEach(chunk => {
                expect(chunk.content.length).toBeGreaterThanOrEqual(20);
                expect(chunk.content.length).toBeLessThanOrEqual(100);
            });
        });
    });

    describe('sanitizeContent', () => {
        test('should remove HTML tags', () => {
            const htmlText = 'This is <b>bold</b> and <i>italic</i> text with <script>alert("xss")</script>';
            const result = textPreprocessor.sanitizeContent(htmlText);
            expect(result).toBe('This is bold and italic text with alert("xss")');
        });

        test('should remove potential script content', () => {
            const scriptText = 'Click here javascript:alert("xss") or onclick=alert("xss")';
            const result = textPreprocessor.sanitizeContent(scriptText);
            expect(result).not.toContain('javascript:');
            expect(result).not.toContain('onclick=');
        });

        test('should preserve normal text content', () => {
            const normalText = 'This is normal text with punctuation! And numbers 123.';
            const result = textPreprocessor.sanitizeContent(normalText);
            expect(result).toBe('This is normal text with punctuation! And numbers 123.');
        });

        test('should handle null and undefined input', () => {
            expect(textPreprocessor.sanitizeContent(null)).toBe('');
            expect(textPreprocessor.sanitizeContent(undefined)).toBe('');
        });
    });

    describe('extractMetadata', () => {
        test('should handle empty or invalid input', () => {
            const result = textPreprocessor.extractMetadata('');
            expect(result.wordCount).toBe(0);
            expect(result.charCount).toBe(0);
            expect(result.paragraphCount).toBe(0);
        });

        test('should extract basic metadata', () => {
            const text = 'This is a test paragraph.\n\nThis is another paragraph with more words.';
            const result = textPreprocessor.extractMetadata(text);
            
            expect(result.wordCount).toBe(12);
            expect(result.charCount).toBe(text.length);
            expect(result.paragraphCount).toBe(2);
            expect(result.estimatedReadingTime).toBe(1); // 12 words / 200 wpm = 0.06 min, rounded up to 1
        });

        test('should extract key topics', () => {
            const text = 'Machine learning algorithms are important in artificial intelligence. Machine learning helps computers learn patterns.';
            const result = textPreprocessor.extractMetadata(text);
            
            expect(result.keyTopics).toBeDefined();
            expect(result.keyTopics.length).toBeGreaterThan(0);
            
            // Should find "machine" and "learning" as key topics
            const topicWords = result.keyTopics.map(topic => topic.word);
            expect(topicWords).toContain('machine');
            expect(topicWords).toContain('learning');
        });

        test('should assess text complexity', () => {
            const simpleText = 'This is simple text. It has short words. Easy to read.';
            const complexText = 'The implementation of sophisticated algorithms requires comprehensive understanding of computational complexity theory and advanced mathematical concepts.';
            
            const simpleResult = textPreprocessor.extractMetadata(simpleText);
            const complexResult = textPreprocessor.extractMetadata(complexText);
            
            expect(simpleResult.complexity).toBe('basic');
            expect(complexResult.complexity).toBe('advanced');
        });
    });

    describe('processText', () => {
        test('should process text through complete pipeline', () => {
            const rawText = `
                This is a sample document with some content.
                
                It has multiple paragraphs and should be processed correctly.
                
                The text contains enough content to pass validation.
            `;
            
            const result = textPreprocessor.processText(rawText);
            
            expect(result.success).toBe(true);
            expect(result.processedText).toBeDefined();
            expect(result.metadata).toBeDefined();
            expect(result.chunks).toBeDefined();
            expect(result.validation).toBeDefined();
            
            expect(result.processedText.length).toBeGreaterThan(0);
            expect(result.chunks.length).toBeGreaterThanOrEqual(1);
        });

        test('should handle processing errors', () => {
            const invalidText = 'Too short';
            const result = textPreprocessor.processText(invalidText);
            
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        test('should handle processing with custom options', () => {
            const longText = 'This is a longer text. '.repeat(200); // Create long text
            const result = textPreprocessor.processText(longText, {
                maxSize: 100,
                preserveParagraphs: false
            });
            
            expect(result.success).toBe(true);
            expect(result.chunks.length).toBeGreaterThan(1);
        });

        test('should handle exception during processing', () => {
            // Mock a method to throw an error
            const originalCleanText = textPreprocessor.cleanText;
            textPreprocessor.cleanText = () => {
                throw new Error('Processing error');
            };
            
            const result = textPreprocessor.processText('Some text');
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Text processing failed');
            
            // Restore original method
            textPreprocessor.cleanText = originalCleanText;
        });
    });

    describe('extractKeywords', () => {
        test('should extract meaningful keywords', () => {
            const text = 'Machine learning algorithms process data efficiently. Machine learning requires training data.';
            const keywords = textPreprocessor.extractKeywords(text);
            
            expect(keywords.length).toBeGreaterThan(0);
            expect(keywords[0]).toHaveProperty('word');
            expect(keywords[0]).toHaveProperty('frequency');
            
            // Should prioritize frequently occurring words
            const topKeyword = keywords[0];
            expect(['machine', 'learning', 'data'].includes(topKeyword.word)).toBe(true);
        });

        test('should filter out stop words', () => {
            const text = 'The quick brown fox jumps over the lazy dog. The fox is quick.';
            const keywords = textPreprocessor.extractKeywords(text);
            
            const keywordWords = keywords.map(k => k.word);
            expect(keywordWords).not.toContain('the');
            expect(keywordWords).not.toContain('is');
            expect(keywordWords).not.toContain('over');
        });
    });

    describe('detectLanguage', () => {
        test('should detect English text', () => {
            const englishText = 'This is a sample text in English with common words like the, and, is, in, to, of, a, that, it, with.';
            const language = textPreprocessor.detectLanguage(englishText);
            expect(language).toBe('en');
        });

        test('should return unknown for non-English text', () => {
            const foreignText = 'Este es un texto en español que no contiene palabras comunes en inglés.';
            const language = textPreprocessor.detectLanguage(foreignText);
            expect(language).toBe('unknown');
        });
    });

    describe('assessComplexity', () => {
        test('should assess basic complexity', () => {
            const basicText = 'This is easy. Short words. Simple ideas.';
            const complexity = textPreprocessor.assessComplexity(basicText);
            expect(complexity).toBe('basic');
        });

        test('should assess intermediate complexity', () => {
            const intermediateText = 'This text contains moderately complex sentences with some technical terminology and concepts.';
            const complexity = textPreprocessor.assessComplexity(intermediateText);
            expect(complexity).toBe('intermediate');
        });

        test('should assess advanced complexity', () => {
            const advancedText = 'The implementation of sophisticated computational algorithms necessitates comprehensive understanding of advanced mathematical principles and theoretical frameworks.';
            const complexity = textPreprocessor.assessComplexity(advancedText);
            expect(complexity).toBe('advanced');
        });
    });
});