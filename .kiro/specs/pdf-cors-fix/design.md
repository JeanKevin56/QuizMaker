# PDF CORS Fix Design Document

## Overview

This design document outlines the solution for fixing CORS issues with PDF.js worker loading in production deployments. The solution involves self-hosting PDF.js worker files and implementing robust fallback mechanisms to ensure reliable PDF processing across all deployment environments.

## Architecture

### Current Problem
```
Browser → External CDN (unpkg.com) → PDF.js Worker
                ↑
            CORS Block (Production)
```

### Proposed Solution
```
Browser → Local Origin → Self-hosted PDF.js Worker
                ↓
        Fallback: Synchronous Processing (if worker fails)
```

## Components and Interfaces

### 1. Build System Enhancement

#### Vite Plugin for PDF.js Assets
- **Purpose**: Automatically copy PDF.js worker files during build
- **Implementation**: Custom Vite plugin that copies worker files from node_modules
- **Location**: `vite.config.js` enhancement

```javascript
// New plugin configuration
{
  name: 'copy-pdfjs-worker',
  generateBundle() {
    // Copy PDF.js worker files to assets directory
  }
}
```

#### Build Script Enhancement
- **Purpose**: Ensure PDF.js workers are included in production builds
- **Files Modified**: `scripts/build-optimize-simple.js`
- **Functionality**: Verify worker files exist and are properly copied

### 2. PDF Processor Service Updates

#### Worker Path Resolution
- **Current**: External CDN URLs with fallback detection
- **New**: Local path resolution with environment detection
- **Method**: `configureWorkerPath()` - determines optimal worker source

#### Enhanced Fallback Chain
```javascript
1. Local worker files (production)
2. CDN workers (development)
3. Synchronous processing (fallback)
4. Error state with user guidance
```

#### Worker Initialization Strategy
- **Lazy Loading**: Initialize worker only when needed
- **Caching**: Cache successful worker configuration
- **Retry Logic**: Attempt multiple worker sources before fallback

### 3. User Experience Enhancements

#### Loading States
- **Worker Loading**: Show initialization progress
- **Processing States**: Different indicators for sync vs async processing
- **Error States**: Clear messaging with actionable suggestions

#### Performance Indicators
- **Sync Mode Warning**: Inform users about slower processing
- **Progress Tracking**: Show PDF processing progress
- **Cancellation**: Allow users to cancel slow operations

## Data Models

### WorkerConfiguration Model
```javascript
{
  workerSource: 'local' | 'cdn' | 'disabled',
  workerPath: string,
  isInitialized: boolean,
  fallbackMode: boolean,
  lastError: Error | null,
  performanceMode: 'fast' | 'slow' | 'unavailable'
}
```

### ProcessingOptions Model
```javascript
{
  useWorker: boolean,
  chunkSize: number,
  progressCallback: Function,
  timeoutMs: number,
  retryAttempts: number
}
```

## Implementation Details

### 1. Vite Configuration Updates

#### PDF.js Worker Copy Plugin
```javascript
function copyPdfjsWorker() {
  return {
    name: 'copy-pdfjs-worker',
    generateBundle() {
      // Copy worker files from node_modules/pdfjs-dist/build/
      // to dist/assets/pdf/ directory
    }
  }
}
```

#### Asset Handling
- **Worker Files**: Copy to `dist/assets/pdf/` directory
- **Path Resolution**: Use relative paths for same-origin loading
- **Optimization**: Minify worker files in production

### 2. PDFProcessor Service Enhancements

#### Worker Path Detection
```javascript
detectWorkerPath() {
  const isProduction = window.location.hostname !== 'localhost';
  
  if (isProduction) {
    // Try local worker first
    return './assets/pdf/pdf.worker.min.js';
  } else {
    // Development: use CDN with fallbacks
    return 'https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.js';
  }
}
```

#### Enhanced Error Handling
- **CORS Detection**: Identify CORS-specific errors
- **Automatic Fallback**: Switch to sync mode on worker failure
- **User Notification**: Inform users about processing mode changes

#### Performance Optimization
- **Chunked Processing**: Process large PDFs in smaller chunks
- **Progress Callbacks**: Provide real-time progress updates
- **Memory Management**: Clean up resources after processing

### 3. Build Process Integration

#### Asset Copying Strategy
1. **Source**: `node_modules/pdfjs-dist/build/pdf.worker.min.js`
2. **Destination**: `dist/assets/pdf/pdf.worker.min.js`
3. **Verification**: Ensure file exists and is accessible
4. **Optimization**: Apply minification if needed

#### Environment-Specific Builds
- **Development**: Use CDN workers for faster builds
- **Production**: Always include local worker files
- **Testing**: Mock worker for reliable test execution

## Error Handling

### CORS Error Recovery
1. **Detection**: Identify CORS-related worker loading failures
2. **Fallback**: Automatically switch to synchronous processing
3. **Notification**: Inform user about processing mode change
4. **Guidance**: Provide troubleshooting information

### Worker Loading Failures
- **Timeout Handling**: Set reasonable timeouts for worker initialization
- **Retry Logic**: Attempt multiple worker sources before giving up
- **Graceful Degradation**: Fall back to sync processing seamlessly

### User Communication
- **Clear Messages**: Explain what's happening and why
- **Alternative Options**: Suggest text input when PDF fails
- **Progress Indicators**: Show processing status and estimated time

## Testing Strategy

### Unit Tests
- **Worker Configuration**: Test path resolution logic
- **Fallback Mechanisms**: Verify sync processing works
- **Error Scenarios**: Test CORS and loading failures

### Integration Tests
- **Build Process**: Verify worker files are copied correctly
- **End-to-End**: Test PDF processing in both modes
- **Cross-Browser**: Ensure compatibility across browsers

### Deployment Tests
- **Production Environment**: Test with actual CORS restrictions
- **Performance**: Measure processing times in different modes
- **User Experience**: Verify error messages and fallbacks

## Performance Considerations

### Worker vs Synchronous Processing
- **Worker Mode**: Faster, non-blocking, better user experience
- **Sync Mode**: Slower, may block UI, but reliable
- **Hybrid Approach**: Use workers when available, sync as fallback

### Memory Management
- **Large Files**: Process in chunks to avoid memory issues
- **Cleanup**: Properly dispose of PDF documents and workers
- **Caching**: Cache worker initialization for repeated use

### User Experience
- **Loading States**: Show appropriate progress indicators
- **Cancellation**: Allow users to cancel slow operations
- **Feedback**: Provide clear status updates throughout processing

## Security Considerations

### Content Security Policy
- **Worker Sources**: Ensure CSP allows local worker loading
- **Script Sources**: Update CSP to include local PDF.js assets
- **Fallback Safety**: Ensure sync processing doesn't violate CSP

### File Validation
- **PDF Verification**: Validate files before processing
- **Size Limits**: Enforce reasonable file size restrictions
- **Content Scanning**: Basic validation of PDF structure

## Deployment Strategy

### Rollout Plan
1. **Development Testing**: Verify solution works locally
2. **Staging Deployment**: Test in production-like environment
3. **Production Deployment**: Deploy with monitoring
4. **Monitoring**: Watch for errors and performance issues

### Rollback Plan
- **Quick Revert**: Ability to disable PDF processing if needed
- **Fallback Mode**: Force synchronous processing if workers fail
- **User Communication**: Clear messaging about temporary limitations

## Monitoring and Maintenance

### Key Metrics
- **PDF Processing Success Rate**: Track successful vs failed processing
- **Processing Time**: Monitor performance in different modes
- **Error Rates**: Track CORS and other processing errors
- **User Behavior**: Monitor usage patterns and fallback usage

### Maintenance Tasks
- **PDF.js Updates**: Keep worker files updated with library versions
- **Performance Monitoring**: Regular checks of processing times
- **Error Analysis**: Review and address common failure patterns
- **User Feedback**: Collect and respond to user experience issues