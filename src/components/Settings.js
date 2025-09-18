/**
 * Settings component for managing user preferences and API keys
 * Handles theme switching, API key management, and default quiz settings
 */

import { StorageManager } from '../services/StorageManager.js';
import { THEMES } from '../models/types.js';
import { isValidUserPreferences } from '../models/validation.js';
import { createAlert, createLoadingSpinner } from './Layout.js';

export class Settings {
    constructor() {
        this.storageManager = new StorageManager();
        this.currentPreferences = null;
        this.isLoading = false;
        this.container = null;
    }

    /**
     * Initialize the settings component
     * @param {HTMLElement} container - Container element
     */
    async init(container) {
        this.container = container;
        await this.loadPreferences();
        this.render();
        this.attachEventListeners();
    }

    /**
     * Load user preferences from storage
     */
    async loadPreferences() {
        try {
            this.isLoading = true;
            await this.storageManager.initialize();
            
            this.currentPreferences = await this.storageManager.getUserPreferences();
            if (!this.currentPreferences) {
                this.currentPreferences = this.storageManager.getDefaultUserPreferences();
            }
        } catch (error) {
            console.error('Failed to load preferences:', error);
            this.currentPreferences = this.storageManager.getDefaultUserPreferences();
            this.showAlert('Failed to load preferences. Using defaults.', 'warning');
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Save preferences to storage
     */
    async savePreferences() {
        try {
            if (!isValidUserPreferences(this.currentPreferences)) {
                throw new Error('Invalid preferences data');
            }

            await this.storageManager.storeUserPreferences(this.currentPreferences);
            this.applyTheme();
            this.showAlert('Settings saved successfully!', 'success');
        } catch (error) {
            console.error('Failed to save preferences:', error);
            this.showAlert('Failed to save settings. Please try again.', 'error');
        }
    }

    /**
     * Apply theme to the document
     */
    applyTheme() {
        const body = document.body;
        body.classList.remove('theme-light', 'theme-dark');
        body.classList.add(`theme-${this.currentPreferences.preferences.theme}`);
    }

    /**
     * Render the settings interface
     */
    render() {
        if (!this.container) return;

        if (this.isLoading) {
            this.container.innerHTML = '';
            this.container.appendChild(createLoadingSpinner({ text: 'Loading settings...' }));
            return;
        }

        this.container.innerHTML = `
            <div class="settings-container">
                <div class="settings-header">
                    <h1>Settings</h1>
                    <p>Manage your preferences and API keys</p>
                </div>

                <div class="settings-content">
                    <!-- API Keys Section -->
                    <div class="settings-section">
                        <div class="section-header">
                            <h2>API Keys</h2>
                            <p>Configure your API keys for AI-powered features</p>
                        </div>
                        
                        <div class="api-keys-form">
                            <div class="form-group">
                                <label for="gemini-api-key" class="form-label">
                                    Google Gemini API Key
                                    <span class="optional-label">(Optional)</span>
                                </label>
                                <input 
                                    type="password" 
                                    id="gemini-api-key" 
                                    class="form-input api-key-input"
                                    placeholder="Enter your Gemini API key"
                                    value="${this.currentPreferences.apiKeys.gemini || ''}"
                                />
                                <div class="form-help">
                                    <p>Get your free API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener">Google AI Studio</a></p>
                                    <p>This enables AI quiz generation and explanations</p>
                                </div>
                            </div>

                            <div class="api-key-actions">
                                <button type="button" id="test-api-key" class="btn btn-secondary">
                                    Test API Key
                                </button>
                                <button type="button" id="clear-api-key" class="btn btn-warning">
                                    Clear Key
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Theme Section -->
                    <div class="settings-section">
                        <div class="section-header">
                            <h2>Appearance</h2>
                            <p>Customize the look and feel of the application</p>
                        </div>
                        
                        <div class="theme-selector">
                            <div class="theme-options">
                                <div class="theme-option ${this.currentPreferences.preferences.theme === THEMES.LIGHT ? 'selected' : ''}" 
                                     data-theme="${THEMES.LIGHT}">
                                    <div class="theme-preview theme-preview-light">
                                        <div class="preview-header"></div>
                                        <div class="preview-content">
                                            <div class="preview-text"></div>
                                            <div class="preview-text short"></div>
                                        </div>
                                    </div>
                                    <div class="theme-label">Light Theme</div>
                                </div>
                                
                                <div class="theme-option ${this.currentPreferences.preferences.theme === THEMES.DARK ? 'selected' : ''}" 
                                     data-theme="${THEMES.DARK}">
                                    <div class="theme-preview theme-preview-dark">
                                        <div class="preview-header"></div>
                                        <div class="preview-content">
                                            <div class="preview-text"></div>
                                            <div class="preview-text short"></div>
                                        </div>
                                    </div>
                                    <div class="theme-label">Dark Theme</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Default Quiz Settings Section -->
                    <div class="settings-section">
                        <div class="section-header">
                            <h2>Default Quiz Settings</h2>
                            <p>Set default preferences for new quizzes</p>
                        </div>
                        
                        <div class="quiz-settings-form">
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input 
                                        type="checkbox" 
                                        id="shuffle-questions" 
                                        class="form-checkbox"
                                        ${this.currentPreferences.preferences.defaultQuizSettings.shuffleQuestions ? 'checked' : ''}
                                    />
                                    <span class="checkbox-text">Shuffle Questions</span>
                                </label>
                                <div class="form-help">
                                    <p>Randomize the order of questions in new quizzes</p>
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input 
                                        type="checkbox" 
                                        id="show-explanations" 
                                        class="form-checkbox"
                                        ${this.currentPreferences.preferences.defaultQuizSettings.showExplanations ? 'checked' : ''}
                                    />
                                    <span class="checkbox-text">Show Explanations</span>
                                </label>
                                <div class="form-help">
                                    <p>Display explanations for answers after quiz completion</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Data Management Section -->
                    <div class="settings-section">
                        <div class="section-header">
                            <h2>Data Management</h2>
                            <p>Export, import, or clear your data</p>
                        </div>
                        
                        <div class="data-management">
                            <div class="data-actions">
                                <button type="button" id="export-data" class="btn btn-secondary">
                                    Export Data
                                </button>
                                <button type="button" id="import-data" class="btn btn-secondary">
                                    Import Data
                                </button>
                                <button type="button" id="clear-data" class="btn btn-error">
                                    Clear All Data
                                </button>
                            </div>
                            <input type="file" id="import-file" accept=".json" style="display: none;" />
                        </div>
                    </div>
                </div>

                <div class="settings-footer">
                    <button type="button" id="save-settings" class="btn btn-primary">
                        Save Settings
                    </button>
                    <button type="button" id="reset-settings" class="btn btn-secondary">
                        Reset to Defaults
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners to settings controls
     */
    attachEventListeners() {
        if (!this.container) return;

        // API Key input
        const apiKeyInput = this.container.querySelector('#gemini-api-key');
        if (apiKeyInput) {
            apiKeyInput.addEventListener('input', (e) => {
                this.currentPreferences.apiKeys.gemini = e.target.value.trim() || undefined;
            });
        }

        // Test API Key
        const testApiButton = this.container.querySelector('#test-api-key');
        if (testApiButton) {
            testApiButton.addEventListener('click', () => this.testApiKey());
        }

        // Clear API Key
        const clearApiButton = this.container.querySelector('#clear-api-key');
        if (clearApiButton) {
            clearApiButton.addEventListener('click', () => this.clearApiKey());
        }

        // Theme selection
        const themeOptions = this.container.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const theme = e.currentTarget.dataset.theme;
                this.selectTheme(theme);
            });
        });

        // Quiz settings checkboxes
        const shuffleCheckbox = this.container.querySelector('#shuffle-questions');
        if (shuffleCheckbox) {
            shuffleCheckbox.addEventListener('change', (e) => {
                this.currentPreferences.preferences.defaultQuizSettings.shuffleQuestions = e.target.checked;
            });
        }

        const explanationsCheckbox = this.container.querySelector('#show-explanations');
        if (explanationsCheckbox) {
            explanationsCheckbox.addEventListener('change', (e) => {
                this.currentPreferences.preferences.defaultQuizSettings.showExplanations = e.target.checked;
            });
        }

        // Data management buttons
        const exportButton = this.container.querySelector('#export-data');
        if (exportButton) {
            exportButton.addEventListener('click', () => this.exportData());
        }

        const importButton = this.container.querySelector('#import-data');
        if (importButton) {
            importButton.addEventListener('click', () => this.importData());
        }

        const clearButton = this.container.querySelector('#clear-data');
        if (clearButton) {
            clearButton.addEventListener('click', () => this.clearAllData());
        }

        const importFile = this.container.querySelector('#import-file');
        if (importFile) {
            importFile.addEventListener('change', (e) => this.handleFileImport(e));
        }

        // Save and reset buttons
        const saveButton = this.container.querySelector('#save-settings');
        if (saveButton) {
            saveButton.addEventListener('click', () => this.savePreferences());
        }

        const resetButton = this.container.querySelector('#reset-settings');
        if (resetButton) {
            resetButton.addEventListener('click', () => this.resetToDefaults());
        }
    }

    /**
     * Select a theme
     * @param {string} theme - Theme to select
     */
    selectTheme(theme) {
        this.currentPreferences.preferences.theme = theme;
        
        // Update UI if container exists
        if (this.container) {
            const themeOptions = this.container.querySelectorAll('.theme-option');
            themeOptions.forEach(option => {
                option.classList.toggle('selected', option.dataset.theme === theme);
            });
        }

        // Apply theme immediately for preview
        this.applyTheme();
    }

    /**
     * Test API key functionality
     */
    async testApiKey() {
        const apiKey = this.currentPreferences.apiKeys.gemini;
        if (!apiKey) {
            this.showAlert('Please enter an API key first', 'warning');
            return;
        }

        const testButton = this.container.querySelector('#test-api-key');
        const originalText = testButton.textContent;
        
        try {
            testButton.textContent = 'Testing...';
            testButton.disabled = true;

            // Import and test the Gemini API service
            const { GeminiAPIService } = await import('../services/GeminiAPIService.js');
            const apiService = new GeminiAPIService();
            
            // Set the API key and test it
            await apiService.setAPIKey(apiKey);
            await apiService.testConnection();
            
            this.showAlert('API key is valid and working!', 'success');
        } catch (error) {
            console.error('API key test failed:', error);
            this.showAlert(`API key test failed: ${error.message}`, 'error');
        } finally {
            testButton.textContent = originalText;
            testButton.disabled = false;
        }
    }

    /**
     * Clear API key
     */
    clearApiKey() {
        this.currentPreferences.apiKeys.gemini = undefined;
        const apiKeyInput = this.container.querySelector('#gemini-api-key');
        if (apiKeyInput) {
            apiKeyInput.value = '';
        }
        this.showAlert('API key cleared', 'info');
    }

    /**
     * Export user data
     */
    async exportData() {
        try {
            const exportData = await this.storageManager.exportData();
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `QuizMaker-data-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showAlert('Data exported successfully!', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            this.showAlert('Failed to export data', 'error');
        }
    }

    /**
     * Import user data
     */
    importData() {
        const fileInput = this.container.querySelector('#import-file');
        if (fileInput) {
            fileInput.click();
        }
    }

    /**
     * Handle file import
     * @param {Event} event - File input change event
     */
    async handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            const summary = await this.storageManager.importData(importData, false);
            
            let message = 'Data imported successfully!\n';
            message += `Quizzes: ${summary.quizzes.imported} imported, ${summary.quizzes.skipped} skipped\n`;
            message += `Results: ${summary.results.imported} imported, ${summary.results.skipped} skipped\n`;
            message += `Preferences: ${summary.preferences.imported ? 'imported' : 'skipped'}`;
            
            this.showAlert(message, 'success');
            
            // Reload preferences if they were imported
            if (summary.preferences.imported) {
                await this.loadPreferences();
                this.render();
                this.attachEventListeners();
            }
        } catch (error) {
            console.error('Import failed:', error);
            this.showAlert('Failed to import data. Please check the file format.', 'error');
        }
        
        // Clear file input
        event.target.value = '';
    }

    /**
     * Clear all data with confirmation
     */
    async clearAllData() {
        const confirmed = confirm(
            'Are you sure you want to clear all data? This will delete all quizzes, results, and preferences. This action cannot be undone.'
        );
        
        if (!confirmed) return;

        try {
            await this.storageManager.clearAllData(true);
            this.showAlert('All data cleared successfully!', 'success');
            
            // Reset to defaults
            this.currentPreferences = this.storageManager.getDefaultUserPreferences();
            this.render();
            this.attachEventListeners();
            this.applyTheme();
        } catch (error) {
            console.error('Clear data failed:', error);
            this.showAlert('Failed to clear data', 'error');
        }
    }

    /**
     * Reset settings to defaults
     */
    resetToDefaults() {
        const confirmed = confirm('Reset all settings to defaults?');
        if (!confirmed) return;

        this.currentPreferences = this.storageManager.getDefaultUserPreferences();
        this.render();
        this.attachEventListeners();
        this.applyTheme();
        this.showAlert('Settings reset to defaults', 'info');
    }

    /**
     * Show alert message
     * @param {string} message - Alert message
     * @param {string} type - Alert type
     */
    showAlert(message, type = 'info') {
        if (!this.container) {
            console.warn('Settings: Cannot show alert, container not initialized');
            return;
        }

        const existingAlert = this.container.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        const alert = createAlert({ message, type, dismissible: true });
        const settingsHeader = this.container.querySelector('.settings-header');
        if (settingsHeader) {
            settingsHeader.insertAdjacentElement('afterend', alert);
        }

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }

    /**
     * Get current preferences
     * @returns {Object} Current preferences
     */
    getPreferences() {
        return this.currentPreferences;
    }

    /**
     * Update preferences programmatically
     * @param {Object} updates - Preference updates
     */
    async updatePreferences(updates) {
        this.currentPreferences = {
            ...this.currentPreferences,
            ...updates
        };
        
        await this.savePreferences();
        this.render();
        this.attachEventListeners();
    }
}