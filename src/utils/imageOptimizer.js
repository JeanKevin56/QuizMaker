/**
 * Image optimization utility for compressing and resizing images
 * Reduces file sizes while maintaining acceptable quality
 */

class ImageOptimizer {
    constructor() {
        this.defaultOptions = {
            maxWidth: 1200,
            maxHeight: 800,
            quality: 0.8,
            format: 'image/jpeg'
        };
    }

    /**
     * Compress and optimize an image file
     * @param {File} file - Image file to optimize
     * @param {Object} options - Optimization options
     * @returns {Promise<{blob: Blob, dataUrl: string, size: number}>} Optimized image data
     */
    async optimizeImage(file, options = {}) {
        const opts = { ...this.defaultOptions, ...options };
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            img.onload = () => {
                try {
                    // Calculate new dimensions
                    const { width, height } = this.calculateDimensions(
                        img.width, 
                        img.height, 
                        opts.maxWidth, 
                        opts.maxHeight
                    );
                    
                    // Set canvas dimensions
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Draw and compress image
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            reject(new Error('Failed to compress image'));
                            return;
                        }
                        
                        const reader = new FileReader();
                        reader.onload = () => {
                            resolve({
                                blob,
                                dataUrl: reader.result,
                                size: blob.size,
                                width,
                                height,
                                originalSize: file.size,
                                compressionRatio: (1 - blob.size / file.size) * 100
                            });
                        };
                        reader.onerror = () => reject(new Error('Failed to read compressed image'));
                        reader.readAsDataURL(blob);
                    }, opts.format, opts.quality);
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * Calculate optimal dimensions while maintaining aspect ratio
     * @param {number} originalWidth - Original image width
     * @param {number} originalHeight - Original image height
     * @param {number} maxWidth - Maximum allowed width
     * @param {number} maxHeight - Maximum allowed height
     * @returns {Object} New dimensions
     */
    calculateDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
        let { width, height } = { width: originalWidth, height: originalHeight };
        
        // Scale down if image is larger than max dimensions
        if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }
        
        if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
        }
        
        return { width: Math.round(width), height: Math.round(height) };
    }

    /**
     * Create multiple sizes of an image (responsive images)
     * @param {File} file - Original image file
     * @param {Array<Object>} sizes - Array of size configurations
     * @returns {Promise<Array<Object>>} Array of optimized images
     */
    async createResponsiveImages(file, sizes = []) {
        const defaultSizes = [
            { name: 'thumbnail', maxWidth: 150, maxHeight: 150, quality: 0.7 },
            { name: 'small', maxWidth: 400, maxHeight: 300, quality: 0.8 },
            { name: 'medium', maxWidth: 800, maxHeight: 600, quality: 0.8 },
            { name: 'large', maxWidth: 1200, maxHeight: 900, quality: 0.85 }
        ];
        
        const targetSizes = sizes.length > 0 ? sizes : defaultSizes;
        const results = [];
        
        for (const size of targetSizes) {
            try {
                const optimized = await this.optimizeImage(file, size);
                results.push({
                    name: size.name,
                    ...optimized
                });
            } catch (error) {
                console.warn(`Failed to create ${size.name} size:`, error);
            }
        }
        
        return results;
    }

    /**
     * Validate image file before processing
     * @param {File} file - File to validate
     * @returns {Object} Validation result
     */
    validateImage(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        
        const errors = [];
        
        if (!file) {
            errors.push('No file provided');
        } else {
            if (file.size > maxSize) {
                errors.push(`File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${this.formatFileSize(maxSize)})`);
            }
            
            if (!allowedTypes.includes(file.type)) {
                errors.push(`File type ${file.type} is not supported. Allowed types: ${allowedTypes.join(', ')}`);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Format file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Convert image to WebP format if supported
     * @param {File} file - Original image file
     * @param {Object} options - Conversion options
     * @returns {Promise<Object>} Converted image data
     */
    async convertToWebP(file, options = {}) {
        // Check WebP support
        if (!this.supportsWebP()) {
            throw new Error('WebP format is not supported in this browser');
        }
        
        const opts = {
            ...this.defaultOptions,
            format: 'image/webp',
            quality: 0.85,
            ...options
        };
        
        return this.optimizeImage(file, opts);
    }

    /**
     * Check if browser supports WebP format
     * @returns {boolean} WebP support status
     */
    supportsWebP() {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }

    /**
     * Batch optimize multiple images
     * @param {FileList|Array<File>} files - Images to optimize
     * @param {Object} options - Optimization options
     * @param {Function} progressCallback - Progress callback function
     * @returns {Promise<Array<Object>>} Array of optimization results
     */
    async batchOptimize(files, options = {}, progressCallback = null) {
        const results = [];
        const fileArray = Array.from(files);
        
        for (let i = 0; i < fileArray.length; i++) {
            const file = fileArray[i];
            
            try {
                const validation = this.validateImage(file);
                if (!validation.isValid) {
                    results.push({
                        file: file.name,
                        success: false,
                        errors: validation.errors
                    });
                    continue;
                }
                
                const optimized = await this.optimizeImage(file, options);
                results.push({
                    file: file.name,
                    success: true,
                    ...optimized
                });
                
                if (progressCallback) {
                    progressCallback({
                        current: i + 1,
                        total: fileArray.length,
                        percentage: Math.round(((i + 1) / fileArray.length) * 100)
                    });
                }
                
            } catch (error) {
                results.push({
                    file: file.name,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }
}

// Create singleton instance
export const imageOptimizer = new ImageOptimizer();

/**
 * Quick image optimization function
 * @param {File} file - Image file to optimize
 * @param {Object} options - Optimization options
 * @returns {Promise<Object>} Optimized image data
 */
export async function optimizeImage(file, options = {}) {
    return imageOptimizer.optimizeImage(file, options);
}

/**
 * Create thumbnail from image file
 * @param {File} file - Image file
 * @param {number} size - Thumbnail size (width and height)
 * @returns {Promise<Object>} Thumbnail data
 */
export async function createThumbnail(file, size = 150) {
    return imageOptimizer.optimizeImage(file, {
        maxWidth: size,
        maxHeight: size,
        quality: 0.7
    });
}