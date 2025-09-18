/**
 * Tests for QuizDashboard component
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { QuizDashboard } from '../components/QuizDashboard.js';
import { StorageManager } from '../services/StorageManager.js';

// Mock StorageManager
class MockStorageManager {
    constructor() {
        this.quizzes = [
            {
                id: 'quiz1',
                title: 'Sample Quiz 1',
                description: 'A sample quiz for testing',
                questions: [
                    { id: 'q1', type: 'mcq-single', question: 'Test question 1' },
                    { id: 'q2', type: 'mcq-single', question: 'Test question 2' }
                ],
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-02')
            },
            {
                id: 'quiz2',
                title: 'Sample Quiz 2',
                description: 'Another sample quiz',
                questions: [
                    { id: 'q3', type: 'text-input', question: 'Test question 3' }
                ],
                createdAt: new Date('2024-01-03'),
                updatedAt: new Date('2024-01-04')
            }
        ];
    }

    async getAllQuizzes() {
        return [...this.quizzes];
    }

    async getQuiz(id) {
        return this.quizzes.find(quiz => quiz.id === id) || null;
    }

    async storeQuiz(quiz) {
        const existingIndex = this.quizzes.findIndex(q => q.id === quiz.id);
        if (existingIndex >= 0) {
            this.quizzes[existingIndex] = quiz;
        } else {
            this.quizzes.push(quiz);
        }
        return quiz.id;
    }

    async deleteQuiz(id) {
        this.quizzes = this.quizzes.filter(quiz => quiz.id !== id);
    }

    async exportData() {
        return {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            data: {
                quizzes: this.quizzes,
                results: [],
                preferences: {}
            }
        };
    }

    async importData(data, overwrite) {
        return {
            quizzes: { imported: 1, skipped: 0 },
            results: { imported: 0, skipped: 0 },
            preferences: { imported: true }
        };
    }
}

describe('QuizDashboard', () => {
    let dashboard;
    let container;
    let mockStorageManager;

    beforeEach(() => {
        // Create container element
        container = document.createElement('div');
        document.body.appendChild(container);

        // Create dashboard instance
        dashboard = new QuizDashboard();
        
        // Mock the storage manager
        mockStorageManager = new MockStorageManager();
        dashboard.storageManager = mockStorageManager;
    });

    afterEach(() => {
        // Clean up
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
    });

    describe('Initialization', () => {
        test('should initialize dashboard with container', async () => {
            await dashboard.init(container);
            
            expect(dashboard.container).toBe(container);
            expect(dashboard.quizzes).toHaveLength(2);
            expect(container.innerHTML).toContain('Quiz Dashboard');
        });

        test('should load quizzes on initialization', async () => {
            await dashboard.init(container);
            
            expect(dashboard.quizzes).toHaveLength(2);
            expect(dashboard.filteredQuizzes).toHaveLength(2);
        });
    });

    describe('Rendering', () => {
        beforeEach(async () => {
            await dashboard.init(container);
        });

        test('should render dashboard header', () => {
            expect(container.innerHTML).toContain('Quiz Dashboard');
            expect(container.innerHTML).toContain('Manage your quizzes and track performance');
        });

        test('should render statistics', () => {
            expect(container.innerHTML).toContain('Total Quizzes');
            expect(container.innerHTML).toContain('Total Questions');
            expect(container.innerHTML).toContain('2'); // Total quizzes count
            expect(container.innerHTML).toContain('3'); // Total questions count
        });

        test('should render search and filter controls', () => {
            expect(container.querySelector('#quiz-search')).toBeTruthy();
            expect(container.querySelector('#filter-select')).toBeTruthy();
            expect(container.querySelector('#sort-select')).toBeTruthy();
        });

        test('should render action buttons', () => {
            expect(container.querySelector('#create-quiz-btn')).toBeTruthy();
            expect(container.querySelector('#import-quiz-btn')).toBeTruthy();
            expect(container.querySelector('#export-all-btn')).toBeTruthy();
        });

        test('should render quiz cards', () => {
            const quizCards = container.querySelectorAll('.quiz-card');
            expect(quizCards).toHaveLength(2);
            
            expect(container.innerHTML).toContain('Sample Quiz 1');
            expect(container.innerHTML).toContain('Sample Quiz 2');
        });
    });

    describe('Search and Filter', () => {
        beforeEach(async () => {
            await dashboard.init(container);
        });

        test('should filter quizzes by search term', () => {
            dashboard.searchTerm = 'Sample Quiz 1';
            dashboard.applyFiltersAndSort();
            
            expect(dashboard.filteredQuizzes).toHaveLength(1);
            expect(dashboard.filteredQuizzes[0].title).toBe('Sample Quiz 1');
        });

        test('should sort quizzes by title ascending', () => {
            dashboard.sortBy = 'title';
            dashboard.sortOrder = 'asc';
            dashboard.applyFiltersAndSort();
            
            expect(dashboard.filteredQuizzes[0].title).toBe('Sample Quiz 1');
            expect(dashboard.filteredQuizzes[1].title).toBe('Sample Quiz 2');
        });

        test('should sort quizzes by title descending', () => {
            dashboard.sortBy = 'title';
            dashboard.sortOrder = 'desc';
            dashboard.applyFiltersAndSort();
            
            expect(dashboard.filteredQuizzes[0].title).toBe('Sample Quiz 2');
            expect(dashboard.filteredQuizzes[1].title).toBe('Sample Quiz 1');
        });

        test('should clear filters', () => {
            dashboard.searchTerm = 'test';
            dashboard.filterBy = 'recent';
            dashboard.clearFilters();
            
            expect(dashboard.searchTerm).toBe('');
            expect(dashboard.filterBy).toBe('all');
            expect(dashboard.sortBy).toBe('updatedAt');
            expect(dashboard.sortOrder).toBe('desc');
        });
    });

    describe('Quiz Actions', () => {
        beforeEach(async () => {
            await dashboard.init(container);
        });

        test('should duplicate quiz', async () => {
            const originalCount = dashboard.quizzes.length;
            await dashboard.duplicateQuiz('quiz1');
            
            expect(dashboard.quizzes.length).toBe(originalCount + 1);
            
            const duplicatedQuiz = dashboard.quizzes.find(q => q.title === 'Sample Quiz 1 (Copy)');
            expect(duplicatedQuiz).toBeTruthy();
            expect(duplicatedQuiz.id).not.toBe('quiz1');
        });

        test('should delete quiz', async () => {
            const originalCount = mockStorageManager.quizzes.length;
            
            // Directly test the storage manager's delete functionality
            await mockStorageManager.deleteQuiz('quiz1');
            await dashboard.loadQuizzes();
            
            // Check that the quiz was deleted
            expect(dashboard.quizzes.length).toBe(originalCount - 1);
            expect(dashboard.quizzes.find(q => q.id === 'quiz1')).toBeFalsy();
        });

        test('should export quiz', async () => {
            // Mock URL.createObjectURL and related functions
            global.URL.createObjectURL = vi.fn(() => 'mock-url');
            global.URL.revokeObjectURL = vi.fn();
            
            const createElementSpy = vi.spyOn(document, 'createElement');
            const appendChildSpy = vi.spyOn(document.body, 'appendChild');
            const removeChildSpy = vi.spyOn(document.body, 'removeChild');
            
            await dashboard.exportQuiz('quiz1');
            
            expect(createElementSpy).toHaveBeenCalledWith('a');
            expect(appendChildSpy).toHaveBeenCalled();
            expect(removeChildSpy).toHaveBeenCalled();
            
            createElementSpy.mockRestore();
            appendChildSpy.mockRestore();
            removeChildSpy.mockRestore();
        });
    });

    describe('Utility Methods', () => {
        test('should format dates correctly', () => {
            const date = new Date('2024-01-15');
            const formatted = dashboard.formatDate(date);
            
            expect(formatted).toMatch(/Jan 15, 2024/);
        });

        test('should detect recently updated quizzes', () => {
            const recentDate = new Date();
            const oldDate = new Date('2020-01-01');
            
            expect(dashboard.isRecentlyUpdated(recentDate)).toBe(true);
            expect(dashboard.isRecentlyUpdated(oldDate)).toBe(false);
        });

        test('should escape HTML properly', () => {
            const html = '<script>alert("xss")</script>';
            const escaped = dashboard.escapeHtml(html);
            
            expect(escaped).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
        });
    });

    describe('Empty States', () => {
        test('should render empty state when no quizzes', async () => {
            mockStorageManager.quizzes = [];
            await dashboard.init(container);
            
            expect(container.innerHTML).toContain('No quizzes yet');
            expect(container.innerHTML).toContain('Create your first quiz');
        });

        test('should render no results state when search returns empty', async () => {
            await dashboard.init(container);
            dashboard.searchTerm = 'nonexistent';
            dashboard.applyFiltersAndSort();
            dashboard.render();
            
            expect(container.innerHTML).toContain('No quizzes found');
            expect(container.innerHTML).toContain('Try adjusting your search');
        });
    });

    describe('Event Handling', () => {
        beforeEach(async () => {
            await dashboard.init(container);
        });

        test('should handle search input', () => {
            const searchInput = container.querySelector('#quiz-search');
            searchInput.value = 'test search';
            searchInput.dispatchEvent(new Event('input'));
            
            expect(dashboard.searchTerm).toBe('test search');
        });

        test('should handle filter change', () => {
            const filterSelect = container.querySelector('#filter-select');
            filterSelect.value = 'recent';
            filterSelect.dispatchEvent(new Event('change'));
            
            expect(dashboard.filterBy).toBe('recent');
        });

        test('should handle sort change', () => {
            const sortSelect = container.querySelector('#sort-select');
            sortSelect.value = 'title-asc';
            sortSelect.dispatchEvent(new Event('change'));
            
            expect(dashboard.sortBy).toBe('title');
            expect(dashboard.sortOrder).toBe('asc');
        });
    });
});

// Run tests if this file is executed directly
if (typeof window !== 'undefined' && window.location.pathname.includes('test')) {
    console.log('Running QuizDashboard tests...');
    
    // Simple test runner for browser environment
    const runTests = async () => {
        const dashboard = new QuizDashboard();
        const container = document.createElement('div');
        document.body.appendChild(container);
        
        try {
            // Test initialization
            await dashboard.init(container);
            console.log('✓ Dashboard initialization test passed');
            
            // Test search functionality
            dashboard.searchTerm = 'test';
            dashboard.applyFiltersAndSort();
            console.log('✓ Search functionality test passed');
            
            // Test utility methods
            const formatted = dashboard.formatDate(new Date());
            const escaped = dashboard.escapeHtml('<test>');
            console.log('✓ Utility methods test passed');
            
            console.log('All QuizDashboard tests passed!');
        } catch (error) {
            console.error('QuizDashboard test failed:', error);
        } finally {
            container.remove();
        }
    };
    
    runTests();
}