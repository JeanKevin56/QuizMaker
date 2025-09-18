/**
 * Quiz Management Dashboard Component
 * Provides quiz list view with search, filtering, editing, duplication, and deletion
 * Includes quiz statistics and usage tracking
 */

import { StorageManager } from '../services/StorageManager.js';
import { createCard, createButton, createModal, createAlert, createLoadingSpinner } from './Layout.js';

export class QuizDashboard {
    constructor() {
        this.storageManager = new StorageManager();
        this.container = null;
        this.quizzes = [];
        this.filteredQuizzes = [];
        this.searchTerm = '';
        this.sortBy = 'updatedAt';
        this.sortOrder = 'desc';
        this.filterBy = 'all';
        this.isLoading = false;
    }

    /**
     * Initialize the dashboard
     * @param {HTMLElement} container - Container element
     */
    async init(container) {
        this.container = container;
        await this.loadQuizzes();
        this.render();
        this.setupEventListeners();
    }

    /**
     * Load all quizzes from storage
     */
    async loadQuizzes() {
        try {
            this.isLoading = true;
            this.quizzes = await this.storageManager.getAllQuizzes();
            
            // Load usage statistics for each quiz
            await this.loadQuizUsageStats();
            
            this.filteredQuizzes = [...this.quizzes];
            this.applyFiltersAndSort();
        } catch (error) {
            console.error('Failed to load quizzes:', error);
            this.showError('Failed to load quizzes. Please try again.');
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load usage statistics for all quizzes
     */
    async loadQuizUsageStats() {
        try {
            // Get all results to calculate usage statistics
            const allResults = await this.storageManager.getUserResults();
            
            // Group results by quiz ID
            const resultsByQuiz = allResults.reduce((acc, result) => {
                if (!acc[result.quizId]) {
                    acc[result.quizId] = [];
                }
                acc[result.quizId].push(result);
                return acc;
            }, {});

            // Add usage stats to each quiz
            this.quizzes.forEach(quiz => {
                const results = resultsByQuiz[quiz.id] || [];
                quiz.usageStats = {
                    timesAttempted: results.length,
                    averageScore: results.length > 0 
                        ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
                        : 0,
                    lastAttempted: results.length > 0 
                        ? new Date(Math.max(...results.map(r => new Date(r.completedAt))))
                        : null,
                    bestScore: results.length > 0 
                        ? Math.max(...results.map(r => r.score))
                        : 0
                };
            });
        } catch (error) {
            console.error('Failed to load usage statistics:', error);
            // Continue without usage stats if there's an error
            this.quizzes.forEach(quiz => {
                quiz.usageStats = {
                    timesAttempted: 0,
                    averageScore: 0,
                    lastAttempted: null,
                    bestScore: 0
                };
            });
        }
    }

    /**
     * Render the dashboard
     */
    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="quiz-dashboard">
                <div class="dashboard-header">
                    <h1>Quiz Dashboard</h1>
                    <p class="dashboard-subtitle">Manage your quizzes and track performance</p>
                </div>

                <div class="dashboard-stats">
                    ${this.renderStats()}
                </div>

                <div class="dashboard-controls">
                    <div class="search-filter-container">
                        <div class="search-container">
                            <input 
                                type="text" 
                                id="quiz-search" 
                                class="search-input" 
                                placeholder="Search quizzes..."
                                value="${this.searchTerm}"
                            />
                            <button id="clear-search" class="clear-search-btn" title="Clear search">×</button>
                        </div>
                        
                        <div class="filter-container">
                            <select id="filter-select" class="filter-select">
                                <option value="all">All Quizzes</option>
                                <option value="recent">Recent (Last 7 days)</option>
                                <option value="popular">Most Attempted</option>
                                <option value="unused">Never Attempted</option>
                                <option value="high-scoring">High Scoring (80%+)</option>
                            </select>
                        </div>

                        <div class="sort-container">
                            <select id="sort-select" class="sort-select">
                                <option value="updatedAt-desc">Recently Updated</option>
                                <option value="createdAt-desc">Recently Created</option>
                                <option value="title-asc">Title A-Z</option>
                                <option value="title-desc">Title Z-A</option>
                            </select>
                        </div>
                    </div>

                    <div class="action-buttons">
                        <button id="create-quiz-btn" class="btn btn-primary">
                            <span class="btn-icon">+</span>
                            Create Quiz
                        </button>
                        <button id="import-quiz-btn" class="btn btn-secondary">
                            <span class="btn-icon">📁</span>
                            Import
                        </button>
                        <button id="export-all-btn" class="btn btn-secondary">
                            <span class="btn-icon">📤</span>
                            Export All
                        </button>
                    </div>
                </div>

                <div class="quiz-list-container">
                    ${this.isLoading ? this.renderLoading() : this.renderQuizList()}
                </div>
            </div>
        `;

        this.updateFilterAndSortSelects();
    }

    /**
     * Render dashboard statistics
     */
    renderStats() {
        const totalQuizzes = this.quizzes.length;
        const totalQuestions = this.quizzes.reduce((sum, quiz) => sum + (quiz.questions?.length || 0), 0);
        
        // Calculate average questions per quiz
        const avgQuestions = totalQuizzes > 0 ? Math.round(totalQuestions / totalQuizzes) : 0;
        
        // Find most recent quiz
        const mostRecent = this.quizzes.length > 0 
            ? this.quizzes.reduce((latest, quiz) => 
                new Date(quiz.updatedAt) > new Date(latest.updatedAt) ? quiz : latest
            )
            : null;

        // Calculate quiz type distribution
        const questionTypes = this.quizzes.reduce((types, quiz) => {
            quiz.questions?.forEach(question => {
                types[question.type] = (types[question.type] || 0) + 1;
            });
            return types;
        }, {});

        // Calculate recent activity (last 7 days)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const recentQuizzes = this.quizzes.filter(quiz => new Date(quiz.updatedAt) > weekAgo);

        // Calculate usage statistics
        const attemptedQuizzes = this.quizzes.filter(quiz => quiz.usageStats?.timesAttempted > 0);
        const totalAttempts = this.quizzes.reduce((sum, quiz) => sum + (quiz.usageStats?.timesAttempted || 0), 0);
        const avgScore = attemptedQuizzes.length > 0 
            ? Math.round(attemptedQuizzes.reduce((sum, quiz) => sum + (quiz.usageStats?.averageScore || 0), 0) / attemptedQuizzes.length)
            : 0;

        return `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${totalQuizzes}</div>
                    <div class="stat-label">Total Quizzes</div>
                    <div class="stat-detail">${recentQuizzes.length} updated this week</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${totalQuestions}</div>
                    <div class="stat-label">Total Questions</div>
                    <div class="stat-detail">${avgQuestions} avg per quiz</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${attemptedQuizzes.length}</div>
                    <div class="stat-label">Attempted Quizzes</div>
                    <div class="stat-detail">${totalAttempts} total attempts</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${avgScore}%</div>
                    <div class="stat-label">Average Score</div>
                    <div class="stat-detail">${this.getMostUsedQuestionType(questionTypes)}</div>
                </div>
            </div>
        `;
    }

    /**
     * Render loading state
     */
    renderLoading() {
        return `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Loading quizzes...</p>
            </div>
        `;
    }

    /**
     * Render quiz list
     */
    renderQuizList() {
        if (this.filteredQuizzes.length === 0) {
            return this.renderEmptyState();
        }

        return `
            <div class="quiz-grid">
                ${this.filteredQuizzes.map(quiz => this.renderQuizCard(quiz)).join('')}
            </div>
        `;
    }

    /**
     * Render empty state
     */
    renderEmptyState() {
        const hasSearch = this.searchTerm.trim() !== '';
        const hasFilter = this.filterBy !== 'all';

        if (hasSearch || hasFilter) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h3>No quizzes found</h3>
                    <p>Try adjusting your search or filter criteria.</p>
                    <button id="clear-filters-btn" class="btn btn-secondary">Clear Filters</button>
                </div>
            `;
        }

        return `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>No quizzes yet</h3>
                <p>Create your first quiz to get started!</p>
                <button id="create-first-quiz-btn" class="btn btn-primary">Create Your First Quiz</button>
            </div>
        `;
    }

    /**
     * Render individual quiz card
     */
    renderQuizCard(quiz) {
        const questionCount = quiz.questions?.length || 0;
        const createdDate = this.formatDate(quiz.createdAt);
        const updatedDate = this.formatDate(quiz.updatedAt);
        const isRecent = this.isRecentlyUpdated(quiz.updatedAt);
        const quizStats = this.getQuizStatistics(quiz);

        return `
            <div class="quiz-card" data-quiz-id="${quiz.id}">
                <div class="quiz-card-header">
                    <h3 class="quiz-title">${this.escapeHtml(quiz.title)}</h3>
                    ${isRecent ? '<span class="recent-badge">Recent</span>' : ''}
                </div>
                
                <div class="quiz-card-content">
                    <p class="quiz-description">${this.escapeHtml(quiz.description || 'No description')}</p>
                    
                    <div class="quiz-stats">
                        <div class="stat-row">
                            <div class="stat-item">
                                <span class="stat-icon">❓</span>
                                <span class="stat-text">${questionCount} questions</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-icon">🎯</span>
                                <span class="stat-text">${quizStats.questionTypes} types</span>
                            </div>
                        </div>
                        <div class="stat-row">
                            <div class="stat-item">
                                <span class="stat-icon">⏱️</span>
                                <span class="stat-text">~${quizStats.estimatedTime} min</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-icon">🔄</span>
                                <span class="stat-text">${quiz.settings?.shuffleQuestions ? 'Shuffled' : 'Fixed order'}</span>
                            </div>
                        </div>
                        ${quiz.usageStats?.timesAttempted > 0 ? `
                        <div class="stat-row usage-stats">
                            <div class="stat-item">
                                <span class="stat-icon">📊</span>
                                <span class="stat-text">${quiz.usageStats.timesAttempted} attempts</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-icon">🎯</span>
                                <span class="stat-text">${quiz.usageStats.averageScore}% avg</span>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="quiz-meta">
                        <div class="meta-item">
                            <span class="meta-label">Created:</span>
                            <span class="meta-value">${createdDate}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Updated:</span>
                            <span class="meta-value">${updatedDate}</span>
                        </div>
                    </div>
                </div>

                <div class="quiz-card-actions">
                    <button class="btn btn-primary take-quiz-btn" data-quiz-id="${quiz.id}">
                        <span class="btn-icon">▶️</span>
                        Take Quiz
                    </button>
                    <button class="btn btn-secondary edit-quiz-btn" data-quiz-id="${quiz.id}">
                        <span class="btn-icon">✏️</span>
                        Edit
                    </button>
                    <div class="dropdown">
                        <button class="btn btn-secondary dropdown-toggle" data-quiz-id="${quiz.id}">
                            <span class="btn-icon">⋯</span>
                        </button>
                        <div class="dropdown-menu">
                            <button class="dropdown-item duplicate-quiz-btn" data-quiz-id="${quiz.id}">
                                <span class="btn-icon">📋</span>
                                Duplicate
                            </button>
                            <button class="dropdown-item export-quiz-btn" data-quiz-id="${quiz.id}">
                                <span class="btn-icon">📤</span>
                                Export
                            </button>
                            <button class="dropdown-item share-quiz-btn" data-quiz-id="${quiz.id}">
                                <span class="btn-icon">🔗</span>
                                Share Link
                            </button>
                            <button class="dropdown-item view-results-btn" data-quiz-id="${quiz.id}">
                                <span class="btn-icon">📊</span>
                                View Results
                            </button>
                            <hr class="dropdown-divider">
                            <button class="dropdown-item delete-quiz-btn" data-quiz-id="${quiz.id}">
                                <span class="btn-icon">🗑️</span>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        if (!this.container) return;

        // Search functionality
        const searchInput = this.container.querySelector('#quiz-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.applyFiltersAndSort();
                this.renderQuizList();
            });
        }

        // Clear search
        const clearSearchBtn = this.container.querySelector('#clear-search');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                this.searchTerm = '';
                searchInput.value = '';
                this.applyFiltersAndSort();
                this.render();
            });
        }

        // Filter functionality
        const filterSelect = this.container.querySelector('#filter-select');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.filterBy = e.target.value;
                this.applyFiltersAndSort();
                this.renderQuizList();
            });
        }

        // Sort functionality
        const sortSelect = this.container.querySelector('#sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                this.sortBy = sortBy;
                this.sortOrder = sortOrder;
                this.applyFiltersAndSort();
                this.renderQuizList();
            });
        }

        // Action buttons
        this.setupActionButtons();
        
        // Quiz card actions
        this.setupQuizCardActions();
    }

    /**
     * Set up action buttons
     */
    setupActionButtons() {
        // Create quiz button
        const createBtn = this.container.querySelector('#create-quiz-btn, #create-first-quiz-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.navigateToCreate();
            });
        }

        // Import button
        const importBtn = this.container.querySelector('#import-quiz-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                this.showImportModal();
            });
        }

        // Export all button
        const exportAllBtn = this.container.querySelector('#export-all-btn');
        if (exportAllBtn) {
            exportAllBtn.addEventListener('click', () => {
                this.exportAllQuizzes();
            });
        }

        // Clear filters button
        const clearFiltersBtn = this.container.querySelector('#clear-filters-btn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }
    }

    /**
     * Set up quiz card actions
     */
    setupQuizCardActions() {
        // Take quiz buttons
        this.container.querySelectorAll('.take-quiz-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const quizId = e.target.closest('[data-quiz-id]').dataset.quizId;
                this.takeQuiz(quizId);
            });
        });

        // Edit quiz buttons
        this.container.querySelectorAll('.edit-quiz-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const quizId = e.target.closest('[data-quiz-id]').dataset.quizId;
                this.editQuiz(quizId);
            });
        });

        // Dropdown toggles
        this.container.querySelectorAll('.dropdown-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown(e.target.closest('.dropdown'));
            });
        });

        // Duplicate quiz buttons
        this.container.querySelectorAll('.duplicate-quiz-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const quizId = e.target.closest('[data-quiz-id]').dataset.quizId;
                this.duplicateQuiz(quizId);
            });
        });

        // Export quiz buttons
        this.container.querySelectorAll('.export-quiz-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const quizId = e.target.closest('[data-quiz-id]').dataset.quizId;
                this.exportQuiz(quizId);
            });
        });

        // Share quiz buttons
        this.container.querySelectorAll('.share-quiz-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const quizId = e.target.closest('[data-quiz-id]').dataset.quizId;
                this.shareQuiz(quizId);
            });
        });

        // View results buttons
        this.container.querySelectorAll('.view-results-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const quizId = e.target.closest('[data-quiz-id]').dataset.quizId;
                this.viewResults(quizId);
            });
        });

        // Delete quiz buttons
        this.container.querySelectorAll('.delete-quiz-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const quizId = e.target.closest('[data-quiz-id]').dataset.quizId;
                this.deleteQuiz(quizId);
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            this.closeAllDropdowns();
        });
    }

    /**
     * Apply filters and sorting to quiz list
     */
    applyFiltersAndSort() {
        let filtered = [...this.quizzes];

        // Apply search filter
        if (this.searchTerm.trim()) {
            const searchLower = this.searchTerm.toLowerCase();
            filtered = filtered.filter(quiz => 
                quiz.title.toLowerCase().includes(searchLower) ||
                (quiz.description && quiz.description.toLowerCase().includes(searchLower))
            );
        }

        // Apply category filter
        switch (this.filterBy) {
            case 'recent':
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                filtered = filtered.filter(quiz => new Date(quiz.updatedAt) > weekAgo);
                break;
            case 'popular':
                filtered = filtered.filter(quiz => quiz.usageStats?.timesAttempted > 0)
                    .sort((a, b) => (b.usageStats?.timesAttempted || 0) - (a.usageStats?.timesAttempted || 0));
                break;
            case 'unused':
                filtered = filtered.filter(quiz => (quiz.usageStats?.timesAttempted || 0) === 0);
                break;
            case 'high-scoring':
                filtered = filtered.filter(quiz => (quiz.usageStats?.averageScore || 0) >= 80);
                break;
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aValue, bValue;

            switch (this.sortBy) {
                case 'title':
                    aValue = a.title.toLowerCase();
                    bValue = b.title.toLowerCase();
                    break;
                case 'createdAt':
                case 'updatedAt':
                    aValue = new Date(a[this.sortBy]);
                    bValue = new Date(b[this.sortBy]);
                    break;
                default:
                    aValue = a[this.sortBy];
                    bValue = b[this.sortBy];
            }

            if (this.sortOrder === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });

        this.filteredQuizzes = filtered;
    }

    /**
     * Update filter and sort select elements
     */
    updateFilterAndSortSelects() {
        const filterSelect = this.container.querySelector('#filter-select');
        const sortSelect = this.container.querySelector('#sort-select');

        if (filterSelect) {
            filterSelect.value = this.filterBy;
        }

        if (sortSelect) {
            sortSelect.value = `${this.sortBy}-${this.sortOrder}`;
        }
    }

    /**
     * Clear all filters and search
     */
    clearFilters() {
        this.searchTerm = '';
        this.filterBy = 'all';
        this.sortBy = 'updatedAt';
        this.sortOrder = 'desc';
        this.applyFiltersAndSort();
        this.render();
    }

    /**
     * Navigate to quiz creation
     */
    navigateToCreate() {
        window.dispatchEvent(new CustomEvent('navigate', {
            detail: { view: 'create' }
        }));
    }

    /**
     * Take a quiz
     */
    takeQuiz(quizId) {
        window.dispatchEvent(new CustomEvent('navigate', {
            detail: { view: 'quiz', data: { quizId } }
        }));
    }

    /**
     * Edit a quiz
     */
    editQuiz(quizId) {
        window.dispatchEvent(new CustomEvent('navigate', {
            detail: { view: 'create', data: { quizId } }
        }));
    }

    /**
     * Duplicate a quiz
     */
    async duplicateQuiz(quizId) {
        try {
            const quiz = await this.storageManager.getQuiz(quizId);
            if (!quiz) {
                this.showError('Quiz not found');
                return;
            }

            const duplicatedQuiz = {
                ...quiz,
                id: `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                title: `${quiz.title} (Copy)`,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await this.storageManager.storeQuiz(duplicatedQuiz);
            await this.loadQuizzes();
            this.render();
            this.showSuccess('Quiz duplicated successfully');
        } catch (error) {
            console.error('Failed to duplicate quiz:', error);
            this.showError('Failed to duplicate quiz');
        }
    }

    /**
     * Export a single quiz
     */
    async exportQuiz(quizId) {
        try {
            const quiz = await this.storageManager.getQuiz(quizId);
            if (!quiz) {
                this.showError('Quiz not found');
                return;
            }

            // Include usage statistics in export if available
            const exportData = {
                version: '1.0',
                exportedAt: new Date().toISOString(),
                quiz: {
                    ...quiz,
                    exportStats: {
                        timesAttempted: quiz.usageStats?.timesAttempted || 0,
                        averageScore: quiz.usageStats?.averageScore || 0,
                        bestScore: quiz.usageStats?.bestScore || 0
                    }
                }
            };

            this.downloadJSON(exportData, `${quiz.title.replace(/[^a-z0-9]/gi, '_')}_quiz.json`);
            this.showSuccess('Quiz exported successfully with usage statistics');
        } catch (error) {
            console.error('Failed to export quiz:', error);
            this.showError('Failed to export quiz');
        }
    }

    /**
     * Export all quizzes
     */
    async exportAllQuizzes() {
        try {
            const exportData = await this.storageManager.exportData();
            this.downloadJSON(exportData, `quiz_platform_export_${new Date().toISOString().split('T')[0]}.json`);
            this.showSuccess('All data exported successfully');
        } catch (error) {
            console.error('Failed to export data:', error);
            this.showError('Failed to export data');
        }
    }

    /**
     * Share a quiz (generate shareable link)
     */
    async shareQuiz(quizId) {
        try {
            const quiz = await this.storageManager.getQuiz(quizId);
            if (!quiz) {
                this.showError('Quiz not found');
                return;
            }

            // Generate a shareable URL (for future implementation with server)
            const shareUrl = `${window.location.origin}${window.location.pathname}?quiz=${quizId}`;
            
            // Copy to clipboard if available
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(shareUrl);
                this.showSuccess('Quiz link copied to clipboard!');
            } else {
                // Fallback: show the URL in a modal
                const modal = createModal({
                    title: 'Share Quiz',
                    content: `
                        <div class="share-container">
                            <p>Share this quiz with others using the link below:</p>
                            <div class="share-url-container">
                                <input type="text" value="${shareUrl}" readonly class="share-url-input">
                                <button class="btn btn-secondary copy-url-btn">Copy</button>
                            </div>
                            <p class="share-note">Note: Recipients will need access to this quiz platform to take the quiz.</p>
                        </div>
                    `,
                    buttons: [
                        {
                            text: 'Close',
                            type: 'secondary',
                            action: 'close',
                            onClick: () => modal.remove()
                        }
                    ]
                });

                // Add copy functionality to the modal
                const copyBtn = modal.querySelector('.copy-url-btn');
                const urlInput = modal.querySelector('.share-url-input');
                
                copyBtn.addEventListener('click', () => {
                    urlInput.select();
                    document.execCommand('copy');
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => {
                        copyBtn.textContent = 'Copy';
                    }, 2000);
                });

                document.body.appendChild(modal);
            }
        } catch (error) {
            console.error('Failed to share quiz:', error);
            this.showError('Failed to generate share link');
        }
    }

    /**
     * Show import modal
     */
    showImportModal() {
        const modal = createModal({
            title: 'Import Quiz Data',
            content: `
                <div class="import-container">
                    <p>Select a JSON file to import quiz data:</p>
                    <input type="file" id="import-file" accept=".json" class="form-input">
                    <div class="import-options">
                        <label class="checkbox-label">
                            <input type="checkbox" id="overwrite-existing" checked>
                            Overwrite existing quizzes with same ID
                        </label>
                    </div>
                </div>
            `,
            buttons: [
                {
                    text: 'Cancel',
                    type: 'secondary',
                    action: 'cancel',
                    onClick: () => modal.remove()
                },
                {
                    text: 'Import',
                    type: 'primary',
                    action: 'import',
                    onClick: () => this.handleImport(modal)
                }
            ]
        });

        document.body.appendChild(modal);
    }

    /**
     * Handle import process
     */
    async handleImport(modal) {
        const fileInput = modal.querySelector('#import-file');
        const overwriteCheckbox = modal.querySelector('#overwrite-existing');
        
        if (!fileInput.files[0]) {
            this.showError('Please select a file to import');
            return;
        }

        try {
            const file = fileInput.files[0];
            const text = await file.text();
            const importData = JSON.parse(text);

            const summary = await this.storageManager.importData(importData, overwriteCheckbox.checked);
            
            await this.loadQuizzes();
            this.render();
            modal.remove();
            
            this.showSuccess(`Import completed: ${summary.quizzes.imported} quizzes imported, ${summary.quizzes.skipped} skipped`);
        } catch (error) {
            console.error('Failed to import data:', error);
            this.showError('Failed to import data. Please check the file format.');
        }
    }

    /**
     * View quiz results
     */
    viewResults(quizId) {
        window.dispatchEvent(new CustomEvent('navigate', {
            detail: { view: 'results', data: { quizId } }
        }));
    }

    /**
     * Delete a quiz
     */
    async deleteQuiz(quizId) {
        const quiz = this.quizzes.find(q => q.id === quizId);
        if (!quiz) return;

        const modal = createModal({
            title: 'Delete Quiz',
            content: `
                <div class="delete-confirmation">
                    <p>Are you sure you want to delete the quiz <strong>"${this.escapeHtml(quiz.title)}"</strong>?</p>
                    <p class="warning-text">This action cannot be undone. All associated results will also be deleted.</p>
                </div>
            `,
            buttons: [
                {
                    text: 'Cancel',
                    type: 'secondary',
                    action: 'cancel',
                    onClick: () => modal.remove()
                },
                {
                    text: 'Delete',
                    type: 'error',
                    action: 'delete',
                    onClick: async () => {
                        try {
                            await this.storageManager.deleteQuiz(quizId);
                            await this.loadQuizzes();
                            this.render();
                            modal.remove();
                            this.showSuccess('Quiz deleted successfully');
                        } catch (error) {
                            console.error('Failed to delete quiz:', error);
                            this.showError('Failed to delete quiz');
                        }
                    }
                }
            ]
        });

        document.body.appendChild(modal);
    }

    /**
     * Toggle dropdown menu
     */
    toggleDropdown(dropdown) {
        const menu = dropdown.querySelector('.dropdown-menu');
        const isOpen = menu.classList.contains('show');
        
        // Close all dropdowns first
        this.closeAllDropdowns();
        
        // Toggle current dropdown
        if (!isOpen) {
            menu.classList.add('show');
        }
    }

    /**
     * Close all dropdown menus
     */
    closeAllDropdowns() {
        this.container.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.classList.remove('show');
        });
    }

    /**
     * Get the most used question type
     */
    getMostUsedQuestionType(questionTypes) {
        if (Object.keys(questionTypes).length === 0) return 'None';
        
        const mostUsed = Object.entries(questionTypes).reduce((max, [type, count]) => 
            count > max.count ? { type, count } : max, 
            { type: '', count: 0 }
        );
        
        const typeNames = {
            'mcq-single': 'Multiple Choice',
            'mcq-multiple': 'Multi-Select',
            'text-input': 'Text Input'
        };
        
        return typeNames[mostUsed.type] || mostUsed.type;
    }

    /**
     * Get statistics for a specific quiz
     */
    getQuizStatistics(quiz) {
        const questions = quiz.questions || [];
        const questionTypes = new Set(questions.map(q => q.type)).size;
        
        // Estimate time based on question count and type
        // MCQ: 30 seconds, Text input: 60 seconds
        const estimatedTime = Math.ceil(questions.reduce((time, question) => {
            switch (question.type) {
                case 'mcq-single':
                case 'mcq-multiple':
                    return time + 0.5; // 30 seconds
                case 'text-input':
                    return time + 1; // 60 seconds
                default:
                    return time + 0.5;
            }
        }, 0));

        return {
            questionTypes,
            estimatedTime: Math.max(1, estimatedTime)
        };
    }

    /**
     * Utility methods
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    isRecentlyUpdated(dateString) {
        const date = new Date(dateString);
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        return date > threeDaysAgo;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showSuccess(message) {
        const alert = createAlert({ message, type: 'success' });
        this.container.insertBefore(alert, this.container.firstChild);
        setTimeout(() => alert.remove(), 5000);
    }

    showError(message) {
        const alert = createAlert({ message, type: 'error' });
        this.container.insertBefore(alert, this.container.firstChild);
        setTimeout(() => alert.remove(), 5000);
    }
}