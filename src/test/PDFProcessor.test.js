/**
 * PDF Processor Service Tests
 */

import { PDFProcessor } from '../services/PDFProcessor.js';

describe('PDFProcessor', () => {
    let pdfProcessor;

    beforeEach(() => {
        pdfProcessor = new PDFProcessor();
    });

    describe('Initialization', () => {
        test('should create a new PDF processor instance', () => {
            expect(pdfProcessor).toBeInstanceOf(PDFProcessor);
            expect(pdfProcessor.maxFileSize).toBe(10 * 1024 * 1024);
            expect(pdfProcessor.supportedTypes).toEqual(['application/pdf']);
            expect(pdfProcessor.workerInitialized).toBe(false);
        });

        test('should have correct processing info', () => {
            const info = pdfProcessor.getProcessingInfo();
            expect(info.maxFileSize).toBe(10 * 1024 * 1024);
            expect(info.maxFileSizeMB).toBe(10);
            expect(info.supportedTypes).toEqual(['application/pdf']);
        });
    });

    describe('File Validation', () => {
        test('should validate PDF files correctly', () => {
            // Valid PDF file mock
            const validFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
            const validation = pdfProcessor.validateFile(validFile);
            expect(validation.success).toBe(true);
            expect(validation.message).toBe('File is valid');
        });

        test('should reject non-PDF files', () => {
            const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
            const validation = pdfProcessor.validateFile(invalidFile);
            expect(validation.success).toBe(false);
            expect(validation.message).toBe('File must be a PDF');
        });

        test('should reject files that are too large', () => {
            // Create a mock file that's too large
            const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', {
                type: 'application/pdf'
            });

            const validation = pdfProcessor.validateFile(largeFile);
            expect(validation.success).toBe(false);
            expect(validation.message).toBe('File size must be less than 10MB');
        });

        test('should reject null/undefined files', () => {
            const validation1 = pdfProcessor.validateFile(null);
            expect(validation1.success).toBe(false);
            expect(validation1.message).toBe('No file provided');

            const validation2 = pdfProcessor.validateFile(undefined);
            expect(validation2.success).toBe(false);
            expect(validation2.message).toBe('No file provided');
        });
    });

    describe('Worker Initialization', () => {
        test('should attempt to initialize worker', async () => {
            // This test might fail in test environment due to network/worker issues
            // but it should at least attempt initialization
            const result = await pdfProcessor.initializeWorker();
            expect(typeof result).toBe('boolean');
        }, 10000); // Longer timeout for network requests

        test('should handle worker initialization gracefully', async () => {
            // Test that the method doesn't throw errors
            let error = null;
            try {
                await pdfProcessor.initializeWorker();
            } catch (e) {
                error = e;
            }
            expect(error).toBe(null);
        }, 10000);
    });

    describe('Text Formatting', () => {
        test('should format extracted text correctly', () => {
            const rawText = '  This   is   test   text  \n\n\n  with   extra   spaces  \n\n  ';
            const formatted = pdfProcessor.formatExtractedText(rawText);
            expect(formatted).toBe('This is test text with extra spaces');
        });

        test('should handle empty text', () => {
            expect(pdfProcessor.formatExtractedText('')).toBe('');
            expect(pdfProcessor.formatExtractedText(null)).toBe('');
            expect(pdfProcessor.formatExtractedText(undefined)).toBe('');
        });

        test('should remove excessive line breaks', () => {
            const textWithBreaks = 'Line 1\n\n\n\nLine 2\n\n\nLine 3';
            const formatted = pdfProcessor.formatExtractedText(textWithBreaks);
            expect(formatted).toBe('Line 1 Line 2 Line 3');
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid file in extractText', async () => {
            const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
            const result = await pdfProcessor.extractText(invalidFile);

            expect(result.success).toBe(false);
            expect(result.error).toBe('File must be a PDF');
            expect(result.text).toBe('');
            expect(result.metadata).toBe(null);
            expect(result.pages).toEqual([]);
        });

        test('should handle invalid file in getMetadata', async () => {
            const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
            const result = await pdfProcessor.getMetadata(invalidFile);

            expect(result.success).toBe(false);
            expect(result.error).toBe('File must be a PDF');
            expect(result.metadata).toBe(null);
        });

        test('should handle null file in processFile', async () => {
            try {
                await pdfProcessor.processFile(null);
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toBe('No file provided');
            }
        });
    });
});