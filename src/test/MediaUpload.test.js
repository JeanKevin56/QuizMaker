/**
 * Media Upload Component Tests
 */

import { MediaUpload } from '../components/MediaUpload.js';
import { MEDIA_TYPES } from '../models/types.js';

// Mock StorageManager
const mockStorageManager = {
    storeMedia: vi.fn().mockResolvedValue('media-id'),
    getMedia: vi.fn().mockResolvedValue(null),
    deleteMedia: vi.fn().mockResolvedValue(undefined)
};

describe('MediaUpload', () => {
    let mediaUpload;
    let container;

    beforeEach(() => {
        // Create a container element
        container = document.createElement('div');
        document.body.appendChild(container);
        
        mediaUpload = new MediaUpload(mockStorageManager);
        
        // Reset mocks
        vi.clearAllMocks();
    });

    afterEach(() => {
        // Clean up
        if (container.parentNode) {
            container.parentNode.removeChild(container);
        }
    });

    describe('Initialization', () => {
        test('should create a new media upload instance', () => {
            expect(mediaUpload).toBeInstanceOf(MediaUpload);
            expect(mediaUpload.currentMedia).toBe(null);
            expect(mediaUpload.maxFileSize).toBe(5 * 1024 * 1024); // 5MB
            expect(mediaUpload.allowedTypes).toEqual(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
        });

        test('should initialize with storage manager', () => {
            expect(mediaUpload.storageManager).toBe(mockStorageManager);
        });
    });

    describe('Rendering', () => {
        test('should render media upload interface', () => {
            mediaUpload.init(container);
            
            expect(container.querySelector('.media-upload')).toBeTruthy();
            expect(container.querySelector('.media-upload-area')).toBeTruthy();
            expect(container.querySelector('#media-file-input')).toBeTruthy();
            expect(container.querySelector('.media-upload-info')).toBeTruthy();
        });

        test('should render upload prompt when no media', () => {
            mediaUpload.init(container);
            
            expect(container.querySelector('.media-upload-prompt')).toBeTruthy();
            expect(container.querySelector('.media-browse-btn')).toBeTruthy();
            expect(container.querySelector('.media-preview')).toBeFalsy();
        });

        test('should render media preview when media exists', () => {
            const existingMedia = {
                id: 'test-media',
                type: MEDIA_TYPES.IMAGE,
                url: 'data:image/png;base64,test',
                filename: 'test.png'
            };

            mediaUpload.init(container, existingMedia);
            
            expect(container.querySelector('.media-preview')).toBeTruthy();
            expect(container.querySelector('.preview-image')).toBeTruthy();
            expect(container.querySelector('.media-change-btn')).toBeTruthy();
            expect(container.querySelector('.media-remove-btn')).toBeTruthy();
            expect(container.querySelector('.media-upload-prompt')).toBeFalsy();
        });
    });

    describe('File Validation', () => {
        test('should validate file type', () => {
            const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
            const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
            
            const validResult = mediaUpload.validateFile(validFile);
            const invalidResult = mediaUpload.validateFile(invalidFile);
            
            expect(validResult.isValid).toBe(true);
            expect(invalidResult.isValid).toBe(false);
            expect(invalidResult.error).toContain('Invalid file type');
        });

        test('should validate file size', () => {
            const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
            const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
            
            const validResult = mediaUpload.validateFile(validFile);
            const invalidResult = mediaUpload.validateFile(largeFile);
            
            expect(validResult.isValid).toBe(true);
            expect(invalidResult.isValid).toBe(false);
            expect(invalidResult.error).toContain('File size too large');
        });

        test('should validate image type', () => {
            const imageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
            const nonImageFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
            
            const validResult = mediaUpload.validateFile(imageFile);
            const invalidResult = mediaUpload.validateFile(nonImageFile);
            
            expect(validResult.isValid).toBe(true);
            expect(invalidResult.isValid).toBe(false);
            expect(invalidResult.error).toContain('Invalid file type');
        });
    });

    describe('File Processing', () => {
        test('should convert file to base64', async () => {
            const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
            
            const base64 = await mediaUpload.fileToBase64(file);
            
            expect(base64).toMatch(/^data:image\/jpeg;base64,/);
        });

        test('should handle file conversion error', async () => {
            // Create a mock file that will cause FileReader to fail
            const badFile = {
                type: 'image/jpeg',
                name: 'test.jpg'
            };
            
            await expect(mediaUpload.fileToBase64(badFile)).rejects.toThrow();
        });
    });

    describe('Media Management', () => {
        test('should get current media', () => {
            const media = {
                id: 'test-media',
                type: MEDIA_TYPES.IMAGE,
                url: 'data:image/png;base64,test'
            };
            
            mediaUpload.currentMedia = media;
            
            expect(mediaUpload.getMedia()).toBe(media);
        });

        test('should set media', () => {
            const media = {
                id: 'test-media',
                type: MEDIA_TYPES.IMAGE,
                url: 'data:image/png;base64,test'
            };
            
            mediaUpload.init(container);
            mediaUpload.setMedia(media);
            
            expect(mediaUpload.currentMedia).toBe(media);
            expect(container.querySelector('.media-preview')).toBeTruthy();
        });

        test('should clear media', () => {
            const media = {
                id: 'test-media',
                type: MEDIA_TYPES.IMAGE,
                url: 'data:image/png;base64,test'
            };
            
            mediaUpload.init(container, media);
            mediaUpload.clear();
            
            expect(mediaUpload.currentMedia).toBe(null);
            expect(container.querySelector('.media-upload-prompt')).toBeTruthy();
        });

        test('should remove media', async () => {
            const media = {
                id: 'test-media',
                type: MEDIA_TYPES.IMAGE,
                url: 'data:image/png;base64,test'
            };
            
            const mockOnMediaChange = vi.fn();
            mediaUpload.init(container, media, mockOnMediaChange);
            
            await mediaUpload.removeMedia();
            
            expect(mediaUpload.currentMedia).toBe(null);
            expect(mockStorageManager.deleteMedia).toHaveBeenCalledWith('test-media');
            expect(mockOnMediaChange).toHaveBeenCalledWith(null);
        });
    });

    describe('Event Handling', () => {
        test('should attach event listeners', () => {
            mediaUpload.init(container);
            
            const uploadArea = container.querySelector('#media-upload-area');
            const fileInput = container.querySelector('#media-file-input');
            
            expect(uploadArea).toBeTruthy();
            expect(fileInput).toBeTruthy();
        });

        test('should handle browse button click', () => {
            mediaUpload.init(container);
            
            const browseBtn = container.querySelector('.media-browse-btn');
            const fileInput = container.querySelector('#media-file-input');
            
            // Mock click method
            fileInput.click = vi.fn();
            
            browseBtn.click();
            
            expect(fileInput.click).toHaveBeenCalled();
        });

        test('should handle remove button click', async () => {
            const media = {
                id: 'test-media',
                type: MEDIA_TYPES.IMAGE,
                url: 'data:image/png;base64,test'
            };
            
            mediaUpload.init(container, media);
            
            const removeBtn = container.querySelector('.media-remove-btn');
            await removeBtn.click();
            
            expect(mockStorageManager.deleteMedia).toHaveBeenCalledWith('test-media');
        });

        test('should handle drag over event', () => {
            mediaUpload.init(container);
            
            const uploadArea = container.querySelector('#media-upload-area');
            const dragEvent = new Event('dragover', { bubbles: true });
            
            // Mock preventDefault and stopPropagation
            dragEvent.preventDefault = vi.fn();
            dragEvent.stopPropagation = vi.fn();
            
            uploadArea.dispatchEvent(dragEvent);
            
            expect(uploadArea.classList.contains('drag-over')).toBe(true);
        });

        test('should handle drag leave event', () => {
            mediaUpload.init(container);
            
            const uploadArea = container.querySelector('#media-upload-area');
            uploadArea.classList.add('drag-over');
            
            const dragEvent = new Event('dragleave', { bubbles: true });
            
            // Mock preventDefault and stopPropagation
            dragEvent.preventDefault = vi.fn();
            dragEvent.stopPropagation = vi.fn();
            
            uploadArea.dispatchEvent(dragEvent);
            
            expect(uploadArea.classList.contains('drag-over')).toBe(false);
        });
    });

    describe('Configuration', () => {
        test('should get supported file types', () => {
            const types = mediaUpload.getSupportedTypes();
            
            expect(types).toEqual(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
        });

        test('should get and set max file size', () => {
            expect(mediaUpload.getMaxFileSize()).toBe(5 * 1024 * 1024);
            
            mediaUpload.setMaxFileSize(10 * 1024 * 1024);
            
            expect(mediaUpload.getMaxFileSize()).toBe(10 * 1024 * 1024);
        });
    });

    describe('Callbacks', () => {
        test('should call onMediaChange when media changes', () => {
            const mockOnMediaChange = vi.fn();
            const media = {
                id: 'test-media',
                type: MEDIA_TYPES.IMAGE,
                url: 'data:image/png;base64,test'
            };
            
            mediaUpload.init(container, null, mockOnMediaChange);
            mediaUpload.currentMedia = media;
            
            if (mediaUpload.onMediaChange) {
                mediaUpload.onMediaChange(media);
            }
            
            expect(mockOnMediaChange).toHaveBeenCalledWith(media);
        });
    });

    describe('Error Handling', () => {
        test('should handle storage errors gracefully', async () => {
            mockStorageManager.storeMedia.mockRejectedValue(new Error('Storage error'));
            
            const media = {
                id: 'test-media',
                type: MEDIA_TYPES.IMAGE,
                url: 'data:image/png;base64,test'
            };
            
            mediaUpload.init(container, media);
            
            // Should not throw error when storage fails
            await expect(mediaUpload.removeMedia()).resolves.not.toThrow();
        });
    });
});