/**
 * Tests for Settings component
 */

import { vi } from 'vitest';
import { Settings } from '../components/Settings.js';
import { StorageManager } from '../services/StorageManager.js';
import { THEMES } from '../models/types.js';

// Mock DOM environment
const mockContainer = () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    return container;
};

// Mock StorageManager
class MockStorageManager {
    constructor() {
        this.preferences = {
            apiKeys: { gemini: 'test-key' },
            preferences: {
                theme: THEMES.LIGHT,
                defaultQuizSettings: {
                    shuffleQuestions: false,
                    showExplanations: true
                }
            }
        };
    }

    async initialize() {
        return Promise.resolve();
    }

    async getUserPreferences() {
        return this.preferences;
    }

    async storeUserPreferences(prefs) {
        this.preferences = prefs;
        return Promise.resolve();
    }

    getDefaultUserPreferences() {
        return {
            apiKeys: {},
            preferences: {
                theme: THEMES.LIGHT,
                defaultQuizSettings: {
                    shuffleQuestions: false,
                    showExplanations: true
                }
            }
        };
    }

    async exportData() {
        return {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            userId: 'test-user',
            data: {
                quizzes: [],
                results: [],
                preferences: this.preferences
            }
        };
    }

    async importData(data, overwrite) {
        return {
            quizzes: { imported: 0, skipped: 0 },
            results: { imported: 0, skipped: 0 },
            preferences: { imported: true }
        };
    }

    async clearAllData(confirmed) {
        if (confirmed) {
            this.preferences = this.getDefaultUserPreferences();
        }
        return Promise.resolve();
    }
}

describe('Settings Component', () => {
    let settings;
    let container;
    let originalStorageManager;

    beforeEach(() => {
        container = mockContainer();
        settings = new Settings();
        
        // Mock the StorageManager
        originalStorageManager = settings.storageManager;
        settings.storageManager = new MockStorageManager();
    });

    afterEach(() => {
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
        settings.storageManager = originalStorageManager;
    });

    describe('Initialization', () => {
        test('should initialize with default preferences', async () => {
            await settings.init(container);
            
            expect(settings.currentPreferences).toBeDefined();
            expect(settings.currentPreferences.preferences.theme).toBe(THEMES.LIGHT);
            expect(settings.currentPreferences.preferences.defaultQuizSettings).toBeDefined();
        });

        test('should render settings interface', async () => {
            await settings.init(container);
            
            expect(container.querySelector('.settings-container')).toBeTruthy();
            expect(container.querySelector('.settings-header')).toBeTruthy();
            expect(container.querySelector('.api-keys-form')).toBeTruthy();
            expect(container.querySelector('.theme-selector')).toBeTruthy();
            expect(container.querySelector('.quiz-settings-form')).toBeTruthy();
        });

        test('should load existing preferences', async () => {
            const mockPrefs = {
                apiKeys: { gemini: 'existing-key' },
                preferences: {
                    theme: THEMES.DARK,
                    defaultQuizSettings: {
                        shuffleQuestions: true,
                        showExplanations: false
                    }
                }
            };
            
            settings.storageManager.preferences = mockPrefs;
            await settings.init(container);
            
            expect(settings.currentPreferences.preferences.theme).toBe(THEMES.DARK);
            expect(settings.currentPreferences.preferences.defaultQuizSettings.shuffleQuestions).toBe(true);
        });
    });

    describe('Theme Management', () => {
        beforeEach(async () => {
            await settings.init(container);
        });

        test('should select theme correctly', () => {
            settings.selectTheme(THEMES.DARK);
            
            expect(settings.currentPreferences.preferences.theme).toBe(THEMES.DARK);
            expect(document.body.classList.contains('theme-dark')).toBe(true);
        });

        test('should update theme UI selection', () => {
            settings.selectTheme(THEMES.DARK);
            
            const darkOption = container.querySelector(`[data-theme="${THEMES.DARK}"]`);
            const lightOption = container.querySelector(`[data-theme="${THEMES.LIGHT}"]`);
            
            expect(darkOption.classList.contains('selected')).toBe(true);
            expect(lightOption.classList.contains('selected')).toBe(false);
        });

        test('should apply theme to body', () => {
            // Clear existing theme classes
            document.body.classList.remove('theme-light', 'theme-dark');
            
            settings.selectTheme(THEMES.DARK);
            
            expect(document.body.classList.contains('theme-dark')).toBe(true);
            expect(document.body.classList.contains('theme-light')).toBe(false);
        });
    });

    describe('API Key Management', () => {
        beforeEach(async () => {
            await settings.init(container);
        });

        test('should update API key', () => {
            const apiKeyInput = container.querySelector('#gemini-api-key');
            apiKeyInput.value = 'new-api-key';
            apiKeyInput.dispatchEvent(new Event('input'));
            
            expect(settings.currentPreferences.apiKeys.gemini).toBe('new-api-key');
        });

        test('should clear API key', () => {
            settings.clearApiKey();
            
            expect(settings.currentPreferences.apiKeys.gemini).toBeUndefined();
            
            const apiKeyInput = container.querySelector('#gemini-api-key');
            expect(apiKeyInput.value).toBe('');
        });

        test('should handle empty API key input', () => {
            const apiKeyInput = container.querySelector('#gemini-api-key');
            apiKeyInput.value = '   ';
            apiKeyInput.dispatchEvent(new Event('input'));
            
            expect(settings.currentPreferences.apiKeys.gemini).toBeUndefined();
        });
    });

    describe('Quiz Settings', () => {
        beforeEach(async () => {
            await settings.init(container);
        });

        test('should update shuffle questions setting', () => {
            const shuffleCheckbox = container.querySelector('#shuffle-questions');
            shuffleCheckbox.checked = true;
            shuffleCheckbox.dispatchEvent(new Event('change'));
            
            expect(settings.currentPreferences.preferences.defaultQuizSettings.shuffleQuestions).toBe(true);
        });

        test('should update show explanations setting', () => {
            const explanationsCheckbox = container.querySelector('#show-explanations');
            explanationsCheckbox.checked = false;
            explanationsCheckbox.dispatchEvent(new Event('change'));
            
            expect(settings.currentPreferences.preferences.defaultQuizSettings.showExplanations).toBe(false);
        });
    });

    describe('Data Management', () => {
        beforeEach(async () => {
            await settings.init(container);
        });

        test('should export data', async () => {
            // Mock URL.createObjectURL and related functions
            global.URL.createObjectURL = vi.fn(() => 'mock-url');
            global.URL.revokeObjectURL = vi.fn();
            
            const mockLink = {
                href: '',
                download: '',
                click: vi.fn()
            };
            
            vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
            vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
            vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
            
            await settings.exportData();
            
            expect(mockLink.click).toHaveBeenCalled();
            expect(mockLink.download).toContain('quiz-platform-data-');
        });

        test('should reset to defaults', () => {
            // Change some settings first
            settings.currentPreferences.preferences.theme = THEMES.DARK;
            settings.currentPreferences.apiKeys.gemini = 'test-key';
            
            // Mock confirm dialog
            global.confirm = vi.fn(() => true);
            
            settings.resetToDefaults();
            
            expect(settings.currentPreferences.preferences.theme).toBe(THEMES.LIGHT);
            expect(settings.currentPreferences.apiKeys.gemini).toBeUndefined();
        });

        test('should not reset if user cancels', () => {
            const originalPrefs = { ...settings.currentPreferences };
            
            // Mock confirm dialog to return false
            global.confirm = vi.fn(() => false);
            
            settings.resetToDefaults();
            
            expect(settings.currentPreferences).toEqual(originalPrefs);
        });
    });

    describe('Preferences Persistence', () => {
        beforeEach(async () => {
            await settings.init(container);
        });

        test('should save preferences', async () => {
            const spy = vi.spyOn(settings.storageManager, 'storeUserPreferences');
            
            await settings.savePreferences();
            
            expect(spy).toHaveBeenCalledWith(settings.currentPreferences);
        });

        test('should handle save errors gracefully', async () => {
            vi.spyOn(settings.storageManager, 'storeUserPreferences')
                .mockRejectedValue(new Error('Save failed'));
            
            const spy = vi.spyOn(settings, 'showAlert');
            
            await settings.savePreferences();
            
            expect(spy).toHaveBeenCalledWith(
                expect.stringContaining('Failed to save'),
                'error'
            );
        });
    });

    describe('Alert System', () => {
        beforeEach(async () => {
            await settings.init(container);
        });

        test('should show alert messages', () => {
            settings.showAlert('Test message', 'success');
            
            const alert = container.querySelector('.alert');
            expect(alert).toBeTruthy();
            expect(alert.textContent).toContain('Test message');
            expect(alert.classList.contains('alert-success')).toBe(true);
        });

        test('should remove existing alerts before showing new ones', () => {
            settings.showAlert('First message', 'info');
            settings.showAlert('Second message', 'warning');
            
            const alerts = container.querySelectorAll('.alert');
            expect(alerts.length).toBe(1);
            expect(alerts[0].textContent).toContain('Second message');
        });

        test('should auto-dismiss alerts after timeout', (done) => {
            settings.showAlert('Auto dismiss test', 'info');
            
            const alert = container.querySelector('.alert');
            expect(alert).toBeTruthy();
            
            // Check that alert is removed after timeout
            setTimeout(() => {
                const alertAfter = container.querySelector('.alert');
                expect(alertAfter).toBeFalsy();
                done();
            }, 5100); // Slightly longer than the 5000ms timeout
        });
    });

    describe('Accessibility', () => {
        beforeEach(async () => {
            await settings.init(container);
        });

        test('should have proper form labels', () => {
            const apiKeyLabel = container.querySelector('label[for="gemini-api-key"]');
            const apiKeyInput = container.querySelector('#gemini-api-key');
            
            expect(apiKeyLabel).toBeTruthy();
            expect(apiKeyInput).toBeTruthy();
            expect(apiKeyLabel.textContent).toContain('Google Gemini API Key');
        });

        test('should have accessible checkboxes', () => {
            const shuffleCheckbox = container.querySelector('#shuffle-questions');
            const shuffleLabel = container.querySelector('.checkbox-label');
            
            expect(shuffleCheckbox).toBeTruthy();
            expect(shuffleLabel).toBeTruthy();
        });

        test('should have proper button roles', () => {
            const saveButton = container.querySelector('#save-settings');
            const testButton = container.querySelector('#test-api-key');
            
            expect(saveButton.tagName).toBe('BUTTON');
            expect(testButton.tagName).toBe('BUTTON');
        });
    });
});

// Integration tests
describe('Settings Integration', () => {
    let settings;
    let container;

    beforeEach(() => {
        container = mockContainer();
        settings = new Settings();
    });

    afterEach(() => {
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
    });

    test('should integrate with real StorageManager', async () => {
        // This test uses the real StorageManager
        await settings.init(container);
        
        expect(settings.currentPreferences).toBeDefined();
        expect(typeof settings.currentPreferences.preferences.theme).toBe('string');
    });

    test('should handle storage initialization errors', async () => {
        // Mock StorageManager to throw error
        vi.spyOn(settings.storageManager, 'initialize')
            .mockRejectedValue(new Error('Storage init failed'));
        
        await settings.init(container);
        
        // Should still initialize with defaults
        expect(settings.currentPreferences).toBeDefined();
        expect(settings.currentPreferences.preferences.theme).toBe(THEMES.LIGHT);
    });
});