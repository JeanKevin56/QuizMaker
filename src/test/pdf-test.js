/**
 * Simple PDF processing test
 */

import { PDFProcessor } from '../services/PDFProcessor.js';

// Create a simple test
const testPDFProcessing = async () => {
    const processor = new PDFProcessor();
    
    console.log('Testing PDF processor initialization...');
    const initialized = await processor.initializeWorker();
    console.log('Initialization result:', initialized);
    
    console.log('PDF.js ready:', processor.isReady());
    console.log('Processing info:', processor.getProcessingInfo());
};

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testPDFProcessing().catch(console.error);
}

export { testPDFProcessing };