/**
 * Simple tests for Settings component
 */

import { vi } from 'vitest';
import { Settings } from '../components/Settings.js';
import { THEMES } from '../models/types.js';

// Mock DOM environment
const mockContainer = () => {
    const container = document.createElement('div');
    container.innerHTML = `
        <div class="settings-container">
            <div class="settings-header">
                <h1>Settings</h1>
            </div>
            <input id="gemini-api-key" type="password" />
            <input id="shuffle-questions" type="checkbox" />
            <input id="show-explanations" type="checkbox" />
            <div class="theme-option" data-theme="light"></div>
            <div class="theme-option" data-theme="dark"></div>
        </div>
    `;
    document.body.appendChild(container);
    return container;
};

// Mock StorageManager
class MockStorageManager {
    constructor() {
        this.preferences = {
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
}

describe('Settings Component - Simple Tests', () => {
    let settings;
    let container;

    beforeEach(() => {
        container = mockContainer();
        settings = new Settings();
        settings.storageManager = new MockStorageManager();
    });

    afterEach(() => {
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
    });

    test('should create settings instance', () => {
        expect(settings).toBeDefined();
        expect(settings.storageManager).toBeDefined();
    });

    test('should load default preferences', async () => {
        await settings.loadPreferences();
        
        expect(settings.currentPreferences).toBeDefined();
        expect(settings.currentPreferences.preferences.theme).toBe(THEMES.LIGHT);
    });

    test('should select theme', () => {
        settings.currentPreferences = settings.storageManager.getDefaultUserPreferences();
        settings.container = container;
        
        settings.selectTheme(THEMES.DARK);
        
        expect(settings.currentPreferences.preferences.theme).toBe(THEMES.DARK);
    });

    test('should apply theme to body', () => {
        settings.currentPreferences = settings.storageManager.getDefaultUserPreferences();
        
        // Clear existing theme classes
        document.body.classList.remove('theme-light', 'theme-dark');
        
        settings.selectTheme(THEMES.DARK);
        
        expect(document.body.classList.contains('theme-dark')).toBe(true);
    });

    test('should get preferences', () => {
        settings.currentPreferences = { test: 'value' };
        
        const prefs = settings.getPreferences();
        
        expect(prefs).toEqual({ test: 'value' });
    });

    test('should handle missing container gracefully', () => {
        settings.container = null;
        
        // Should not throw error
        expect(() => settings.showAlert('test')).not.toThrow();
    });

    test('should save preferences', async () => {
        const spy = vi.spyOn(settings.storageManager, 'storeUserPreferences');
        settings.currentPreferences = settings.storageManager.getDefaultUserPreferences();
        
        await settings.savePreferences();
        
        expect(spy).toHaveBeenCalled();
    });

    test('should handle save errors', async () => {
        vi.spyOn(settings.storageManager, 'storeUserPreferences')
            .mockRejectedValue(new Error('Save failed'));
        
        settings.currentPreferences = settings.storageManager.getDefaultUserPreferences();
        
        // Should not throw
        await expect(settings.savePreferences()).resolves.toBeUndefined();
    });

    test('should clear API key', () => {
        settings.currentPreferences = {
            apiKeys: { gemini: 'test-key' },
            preferences: { theme: THEMES.LIGHT, defaultQuizSettings: {} }
        };
        settings.container = container;
        
        settings.clearApiKey();
        
        expect(settings.currentPreferences.apiKeys.gemini).toBeUndefined();
    });

    test('should reset to defaults', () => {
        settings.currentPreferences = {
            apiKeys: { gemini: 'test-key' },
            preferences: { theme: THEMES.DARK, defaultQuizSettings: {} }
        };
        settings.container = container;
        
        // Mock confirm
        global.confirm = vi.fn(() => true);
        
        settings.resetToDefaults();
        
        expect(settings.currentPreferences.preferences.theme).toBe(THEMES.LIGHT);
        expect(settings.currentPreferences.apiKeys.gemini).toBeUndefined();
    });

    test('should not reset if user cancels', () => {
        const originalPrefs = {
            apiKeys: { gemini: 'test-key' },
            preferences: { theme: THEMES.DARK, defaultQuizSettings: {} }
        };
        settings.currentPreferences = { ...originalPrefs };
        settings.container = container;
        
        // Mock confirm to return false
        global.confirm = vi.fn(() => false);
        
        settings.resetToDefaults();
        
        expect(settings.currentPreferences.preferences.theme).toBe(THEMES.DARK);
        expect(settings.currentPreferences.apiKeys.gemini).toBe('test-key');
    });
});