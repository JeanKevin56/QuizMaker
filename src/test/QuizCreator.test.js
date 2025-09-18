/**
 * Quiz Creator Component Tests
 */

import { QuizCreator } from '../components/QuizCreator.js';
import { QUESTION_TYPES } from '../models/types.js';

// Mock StorageManager
vi.mock('../services/StorageManager.js', () => ({
    StorageManager: vi.fn().mockImplementation(() => ({
        initialize: vi.fn().mockResolvedValue(undefined),
        storeQuiz: vi.fn().mockResolvedValue('quiz-id'),
        getQuiz: vi.fn().mockResolvedValue(null),
        getAllQuizzes: vi.fn().mockResolvedValue([]),
        updateQuiz: vi.fn().mockResolvedValue({}),
        deleteQuiz: vi.fn().mockResolvedValue(undefined)
    }))
}));

describe('QuizCreator', () => {
    let quizCreator;
    let container;

    beforeEach(() => {
        // Create a container element
        container = document.createElement('div');
        document.body.appendChild(container);
        
        quizCreator = new QuizCreator();
    });

    afterEach(() => {
        // Clean up
        if (container.parentNode) {
            container.parentNode.removeChild(container);
        }
    });

    describe('Initialization', () => {
        test('should create a new quiz creator instance', () => {
            expect(quizCreator).toBeInstanceOf(QuizCreator);
            expect(quizCreator.currentQuiz).toBeDefined();
            expect(quizCreator.isEditing).toBe(false);
        });

        test('should generate default quiz structure', () => {
            const defaultQuiz = quizCreator.getDefaultQuiz();
            
            expect(defaultQuiz).toHaveProperty('id');
            expect(defaultQuiz).toHaveProperty('title', '');
            expect(defaultQuiz).toHaveProperty('description', '');
            expect(defaultQuiz).toHaveProperty('questions', []);
            expect(defaultQuiz).toHaveProperty('createdAt');
            expect(defaultQuiz).toHaveProperty('updatedAt');
            expect(defaultQuiz).toHaveProperty('settings');
            expect(defaultQuiz.settings).toHaveProperty('shuffleQuestions', false);
            expect(defaultQuiz.settings).toHaveProperty('showExplanations', true);
            expect(defaultQuiz.settings).toHaveProperty('timeLimit', null);
        });
    });

    describe('Rendering', () => {
        test('should render quiz creator interface', async () => {
            await quizCreator.init(container);
            
            expect(container.querySelector('.quiz-creator')).toBeTruthy();
            expect(container.querySelector('.quiz-creator-header')).toBeTruthy();
            expect(container.querySelector('.quiz-metadata-section')).toBeTruthy();
            expect(container.querySelector('.quiz-settings-section')).toBeTruthy();
            expect(container.querySelector('.quiz-questions-section')).toBeTruthy();
        });

        test('should render metadata form fields', async () => {
            await quizCreator.init(container);
            
            expect(container.querySelector('#quiz-title')).toBeTruthy();
            expect(container.querySelector('#quiz-description')).toBeTruthy();
        });

        test('should render settings form fields', async () => {
            await quizCreator.init(container);
            
            expect(container.querySelector('#shuffle-questions')).toBeTruthy();
            expect(container.querySelector('#show-explanations')).toBeTruthy();
            expect(container.querySelector('#time-limit')).toBeTruthy();
        });

        test('should show correct header for new quiz', async () => {
            await quizCreator.init(container);
            
            const header = container.querySelector('.quiz-creator-header h2');
            expect(header.textContent).toBe('Create New Quiz');
        });

        test('should show correct header for editing quiz', async () => {
            const existingQuiz = {
                id: 'test-quiz',
                title: 'Test Quiz',
                description: 'Test Description',
                questions: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                settings: {
                    shuffleQuestions: true,
                    showExplanations: false,
                    timeLimit: 30
                }
            };

            await quizCreator.init(container, existingQuiz);
            
            const header = container.querySelector('.quiz-creator-header h2');
            expect(header.textContent).toBe('Edit Quiz');
            expect(quizCreator.isEditing).toBe(true);
        });
    });

    describe('Form Updates', () => {
        test('should update quiz from form values', async () => {
            await quizCreator.init(container);
            
            // Update form fields
            const titleInput = container.querySelector('#quiz-title');
            const descriptionInput = container.querySelector('#quiz-description');
            const shuffleInput = container.querySelector('#shuffle-questions');
            const explanationsInput = container.querySelector('#show-explanations');
            const timeLimitInput = container.querySelector('#time-limit');
            
            titleInput.value = 'Test Quiz Title';
            descriptionInput.value = 'Test Quiz Description';
            shuffleInput.checked = true;
            explanationsInput.checked = false;
            timeLimitInput.value = '45';
            
            // Trigger update
            quizCreator.updateQuizFromForm();
            
            expect(quizCreator.currentQuiz.title).toBe('Test Quiz Title');
            expect(quizCreator.currentQuiz.description).toBe('Test Quiz Description');
            expect(quizCreator.currentQuiz.settings.shuffleQuestions).toBe(true);
            expect(quizCreator.currentQuiz.settings.showExplanations).toBe(false);
            expect(quizCreator.currentQuiz.settings.timeLimit).toBe(45);
        });

        test('should handle empty time limit', async () => {
            await quizCreator.init(container);
            
            const timeLimitInput = container.querySelector('#time-limit');
            timeLimitInput.value = '';
            
            quizCreator.updateQuizFromForm();
            
            expect(quizCreator.currentQuiz.settings.timeLimit).toBe(null);
        });
    });

    describe('Question Management', () => {
        test('should show empty questions message when no questions', async () => {
            await quizCreator.init(container);
            
            const emptyMessage = container.querySelector('.empty-questions');
            expect(emptyMessage).toBeTruthy();
            expect(emptyMessage.textContent).toContain('No questions added yet');
        });

        test('should update question count in header', async () => {
            quizCreator.currentQuiz.questions = [
                { 
                    id: '1', 
                    type: QUESTION_TYPES.MCQ_SINGLE, 
                    question: 'Test?',
                    options: ['Option 1', 'Option 2'],
                    correctAnswer: 0,
                    explanation: 'Test explanation'
                },
                { 
                    id: '2', 
                    type: QUESTION_TYPES.TEXT_INPUT, 
                    question: 'Test 2?',
                    correctAnswer: 'Answer',
                    caseSensitive: false,
                    explanation: 'Test explanation 2'
                }
            ];
            
            await quizCreator.init(container);
            
            const header = container.querySelector('.questions-header h3');
            expect(header.textContent).toBe('Questions (2)');
        });

        test('should get correct question type labels', () => {
            expect(quizCreator.getQuestionTypeLabel(QUESTION_TYPES.MCQ_SINGLE))
                .toBe('Multiple Choice (Single)');
            expect(quizCreator.getQuestionTypeLabel(QUESTION_TYPES.MCQ_MULTIPLE))
                .toBe('Multiple Choice (Multiple)');
            expect(quizCreator.getQuestionTypeLabel(QUESTION_TYPES.TEXT_INPUT))
                .toBe('Text Input');
            expect(quizCreator.getQuestionTypeLabel('unknown'))
                .toBe('Unknown');
        });
    });

    describe('Utility Methods', () => {
        test('should detect unsaved changes', async () => {
            await quizCreator.init(container);
            
            // Initially no changes
            expect(quizCreator.hasUnsavedChanges()).toBe(false);
            
            // Add title
            quizCreator.currentQuiz.title = 'Test Title';
            expect(quizCreator.hasUnsavedChanges()).toBe(true);
            
            // Reset and add description
            quizCreator.currentQuiz.title = '';
            quizCreator.currentQuiz.description = 'Test Description';
            expect(quizCreator.hasUnsavedChanges()).toBe(true);
            
            // Reset and add question
            quizCreator.currentQuiz.description = '';
            quizCreator.currentQuiz.questions = [{ id: '1', question: 'Test?' }];
            expect(quizCreator.hasUnsavedChanges()).toBe(true);
        });

        test('should show alerts', async () => {
            await quizCreator.init(container);
            
            quizCreator.showAlert('Test message', 'success');
            
            const alert = container.querySelector('.alert-success');
            expect(alert).toBeTruthy();
            expect(alert.textContent).toContain('Test message');
        });
    });

    describe('Event Handling', () => {
        test('should attach event listeners', async () => {
            await quizCreator.init(container);
            
            const saveButton = container.querySelector('#save-quiz');
            const cancelButton = container.querySelector('#cancel-quiz');
            const addQuestionButton = container.querySelector('#add-question');
            
            expect(saveButton).toBeTruthy();
            expect(cancelButton).toBeTruthy();
            expect(addQuestionButton).toBeTruthy();
        });

        test('should handle form input changes', async () => {
            await quizCreator.init(container);
            
            const titleInput = container.querySelector('#quiz-title');
            titleInput.value = 'New Title';
            
            // Simulate input event
            const inputEvent = new Event('input', { bubbles: true });
            titleInput.dispatchEvent(inputEvent);
            
            expect(quizCreator.currentQuiz.title).toBe('New Title');
        });
    });

    describe('AI Generation Features', () => {
        test('should render AI generation buttons', async () => {
            await quizCreator.init(container);
            
            const generateFromTextBtn = container.querySelector('#generate-from-text');
            const generateFromPdfBtn = container.querySelector('#generate-from-pdf');
            
            expect(generateFromTextBtn).toBeTruthy();
            expect(generateFromPdfBtn).toBeTruthy();
            expect(generateFromTextBtn.textContent).toContain('Generate from Text');
            expect(generateFromPdfBtn.textContent).toContain('Generate from PDF');
        });

        test('should have AI generation buttons with correct styling', async () => {
            await quizCreator.init(container);
            
            const generateFromTextBtn = container.querySelector('#generate-from-text');
            const generateFromPdfBtn = container.querySelector('#generate-from-pdf');
            
            expect(generateFromTextBtn.classList.contains('btn')).toBe(true);
            expect(generateFromTextBtn.classList.contains('btn-primary')).toBe(true);
            expect(generateFromTextBtn.classList.contains('ai-generate-btn')).toBe(true);
            
            expect(generateFromPdfBtn.classList.contains('btn')).toBe(true);
            expect(generateFromPdfBtn.classList.contains('btn-primary')).toBe(true);
            expect(generateFromPdfBtn.classList.contains('ai-generate-btn')).toBe(true);
        });

        test('should open text generation modal when button clicked', async () => {
            await quizCreator.init(container);
            
            const generateFromTextBtn = container.querySelector('#generate-from-text');
            generateFromTextBtn.click();
            
            // Check if modal is created
            const modal = document.querySelector('.modal-overlay');
            expect(modal).toBeTruthy();
            
            const modalTitle = modal.querySelector('.modal-title');
            expect(modalTitle.textContent).toBe('Generate Quiz from Text');
            
            const textArea = modal.querySelector('#source-text');
            expect(textArea).toBeTruthy();
            expect(textArea.placeholder).toContain('Paste your text content here');
            
            // Clean up modal
            modal.remove();
        });

        test('should open PDF generation modal when button clicked', async () => {
            await quizCreator.init(container);
            
            const generateFromPdfBtn = container.querySelector('#generate-from-pdf');
            generateFromPdfBtn.click();
            
            // Check if modal is created
            const modal = document.querySelector('.modal-overlay');
            expect(modal).toBeTruthy();
            
            const modalTitle = modal.querySelector('.modal-title');
            expect(modalTitle.textContent).toBe('Generate Quiz from PDF');
            
            const fileInput = modal.querySelector('#pdf-file');
            expect(fileInput).toBeTruthy();
            expect(fileInput.accept).toBe('.pdf');
            
            // Clean up modal
            modal.remove();
        });

        test('should render generation options in modals', async () => {
            await quizCreator.init(container);
            
            const generateFromTextBtn = container.querySelector('#generate-from-text');
            generateFromTextBtn.click();
            
            const modal = document.querySelector('.modal-overlay');
            
            // Check generation options
            const questionCountInput = modal.querySelector('#question-count');
            const difficultySelect = modal.querySelector('#difficulty-level');
            const questionTypeCheckboxes = modal.querySelectorAll('input[name="question-types"]');
            
            expect(questionCountInput).toBeTruthy();
            expect(questionCountInput.value).toBe('5');
            expect(questionCountInput.min).toBe('1');
            expect(questionCountInput.max).toBe('20');
            
            expect(difficultySelect).toBeTruthy();
            expect(difficultySelect.value).toBe('mixed');
            
            expect(questionTypeCheckboxes.length).toBe(3);
            expect(questionTypeCheckboxes[0].value).toBe('mcq-single');
            expect(questionTypeCheckboxes[0].checked).toBe(true);
            
            // Clean up modal
            modal.remove();
        });

        test('should validate generation options', async () => {
            await quizCreator.init(container);
            
            const generateFromTextBtn = container.querySelector('#generate-from-text');
            generateFromTextBtn.click();
            
            const modal = document.querySelector('.modal-overlay');
            
            // Test invalid question count
            const questionCountInput = modal.querySelector('#question-count');
            questionCountInput.value = '25'; // Above max
            
            const options = quizCreator.getGenerationOptions(modal);
            expect(options).toBe(null);
            
            // Test no question types selected
            questionCountInput.value = '5';
            const questionTypeCheckboxes = modal.querySelectorAll('input[name="question-types"]');
            questionTypeCheckboxes.forEach(cb => cb.checked = false);
            
            const options2 = quizCreator.getGenerationOptions(modal);
            expect(options2).toBe(null);
            
            // Clean up modal
            modal.remove();
        });

        test('should format file size correctly', () => {
            expect(quizCreator.formatFileSize(0)).toBe('0 Bytes');
            expect(quizCreator.formatFileSize(1024)).toBe('1 KB');
            expect(quizCreator.formatFileSize(1048576)).toBe('1 MB');
            expect(quizCreator.formatFileSize(1536)).toBe('1.5 KB');
        });

        test('should close modals when cancel button clicked', async () => {
            await quizCreator.init(container);
            
            const generateFromTextBtn = container.querySelector('#generate-from-text');
            generateFromTextBtn.click();
            
            let modal = document.querySelector('.modal-overlay');
            expect(modal).toBeTruthy();
            
            const cancelBtn = modal.querySelector('#cancel-text-generation');
            cancelBtn.click();
            
            modal = document.querySelector('.modal-overlay');
            expect(modal).toBe(null);
        });

        test('should close modals when close button clicked', async () => {
            await quizCreator.init(container);
            
            const generateFromTextBtn = container.querySelector('#generate-from-text');
            generateFromTextBtn.click();
            
            let modal = document.querySelector('.modal-overlay');
            expect(modal).toBeTruthy();
            
            const closeBtn = modal.querySelector('.modal-close');
            closeBtn.click();
            
            modal = document.querySelector('.modal-overlay');
            expect(modal).toBe(null);
        });

        test('should show text input statistics and validation', async () => {
            await quizCreator.init(container);
            
            const generateFromTextBtn = container.querySelector('#generate-from-text');
            generateFromTextBtn.click();
            
            const modal = document.querySelector('.modal-overlay');
            const textArea = modal.querySelector('#source-text');
            const characterCount = modal.querySelector('.character-count');
            const wordCount = modal.querySelector('.word-count');
            const generateBtn = modal.querySelector('#generate-text-quiz');
            
            // Test initial state
            expect(characterCount.textContent).toBe('0 characters');
            expect(wordCount.textContent).toBe('0 words');
            expect(generateBtn.disabled).toBe(true);
            
            // Test with short text
            textArea.value = 'Short text';
            textArea.dispatchEvent(new Event('input'));
            
            expect(characterCount.textContent).toBe('10 characters');
            expect(wordCount.textContent).toBe('2 words');
            expect(generateBtn.disabled).toBe(true);
            expect(textArea.classList.contains('input-invalid')).toBe(true);
            
            // Test with sufficient text
            textArea.value = 'This is a longer text that should be sufficient for quiz generation with enough content to analyze';
            textArea.dispatchEvent(new Event('input'));
            
            expect(generateBtn.disabled).toBe(false);
            expect(textArea.classList.contains('input-valid')).toBe(true);
            
            modal.remove();
        });

        test('should show text preview when content is sufficient', async () => {
            await quizCreator.init(container);
            
            const generateFromTextBtn = container.querySelector('#generate-from-text');
            generateFromTextBtn.click();
            
            const modal = document.querySelector('.modal-overlay');
            const textArea = modal.querySelector('#source-text');
            const previewSection = modal.querySelector('.text-preview-section');
            const previewContent = modal.querySelector('.preview-content');
            
            // Initially hidden
            expect(previewSection.style.display).toBe('none');
            
            // Add sufficient text
            const longText = 'This is a comprehensive text about artificial intelligence and machine learning that contains enough content to generate meaningful quiz questions for educational purposes.';
            textArea.value = longText;
            textArea.dispatchEvent(new Event('input'));
            
            expect(previewSection.style.display).toBe('block');
            expect(previewContent.textContent).toContain('This is a comprehensive text');
            
            modal.remove();
        });

        test('should update estimated questions based on content', async () => {
            await quizCreator.init(container);
            
            const generateFromTextBtn = container.querySelector('#generate-from-text');
            generateFromTextBtn.click();
            
            const modal = document.querySelector('.modal-overlay');
            const textArea = modal.querySelector('#source-text');
            const estimatedQuestions = modal.querySelector('.estimated-questions');
            
            // Add text with sufficient content
            const text = 'Artificial intelligence is a branch of computer science that aims to create intelligent machines. Machine learning is a subset of AI that enables computers to learn and improve from experience without being explicitly programmed. Deep learning uses neural networks with multiple layers to model and understand complex patterns in data.';
            textArea.value = text;
            textArea.dispatchEvent(new Event('input'));
            
            expect(estimatedQuestions.textContent).toContain('Estimated questions:');
            expect(estimatedQuestions.textContent).toContain('max possible:');
            
            modal.remove();
        });

        test('should show progress during generation', async () => {
            // Mock AIQuizGenerator to simulate async operation
            const mockGenerateQuestions = vi.fn().mockImplementation(() => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve({
                            success: true,
                            questions: [
                                {
                                    id: 'test-1',
                                    type: 'mcq-single',
                                    question: 'Test question?',
                                    options: ['A', 'B', 'C', 'D'],
                                    correctAnswer: 0,
                                    explanation: 'Test explanation'
                                }
                            ]
                        });
                    }, 100);
                });
            });
            
            quizCreator.aiQuizGenerator.generateQuestions = mockGenerateQuestions;
            
            await quizCreator.init(container);
            
            const generateFromTextBtn = container.querySelector('#generate-from-text');
            generateFromTextBtn.click();
            
            const modal = document.querySelector('.modal-overlay');
            const textArea = modal.querySelector('#source-text');
            const generateBtn = modal.querySelector('#generate-text-quiz');
            const progressSection = modal.querySelector('.generation-progress');
            
            // Add sufficient text
            textArea.value = 'This is sufficient text content for generating quiz questions with AI assistance.';
            textArea.dispatchEvent(new Event('input'));
            
            // Start generation
            generateBtn.click();
            
            // Check progress is shown
            expect(progressSection.style.display).toBe('block');
            expect(generateBtn.disabled).toBe(true);
            
            // Wait for completion
            await new Promise(resolve => setTimeout(resolve, 150));
            
            modal.remove();
        });

        test('should handle generation errors with detailed feedback', async () => {
            // Mock AIQuizGenerator to simulate error
            const mockGenerateQuestions = vi.fn().mockRejectedValue(new Error('API key not configured'));
            quizCreator.aiQuizGenerator.generateQuestions = mockGenerateQuestions;
            
            await quizCreator.init(container);
            
            const generateFromTextBtn = container.querySelector('#generate-from-text');
            generateFromTextBtn.click();
            
            const modal = document.querySelector('.modal-overlay');
            const textArea = modal.querySelector('#source-text');
            const generateBtn = modal.querySelector('#generate-text-quiz');
            const errorSection = modal.querySelector('.generation-error');
            
            // Add sufficient text
            textArea.value = 'This is sufficient text content for generating quiz questions.';
            textArea.dispatchEvent(new Event('input'));
            
            // Start generation
            generateBtn.click();
            
            // Wait for error handling
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Check error is shown
            expect(errorSection.style.display).toBe('block');
            expect(generateBtn.disabled).toBe(false);
            
            const errorMessage = modal.querySelector('.error-message');
            expect(errorMessage.textContent).toContain('API Key Issue');
            
            modal.remove();
        });

        test('should provide helpful error suggestions', () => {
            const modal = document.createElement('div');
            modal.innerHTML = `
                <div class="generation-error" style="display: none;">
                    <div class="error-content">
                        <div class="error-message"></div>
                        <div class="error-suggestions"></div>
                    </div>
                </div>
            `;
            
            quizCreator.showGenerationError(modal, 'Test Error', 'Test message', ['Suggestion 1', 'Suggestion 2']);
            
            const errorSection = modal.querySelector('.generation-error');
            const errorSuggestions = modal.querySelector('.error-suggestions');
            
            expect(errorSection.style.display).toBe('block');
            expect(errorSuggestions.innerHTML).toContain('Suggestion 1');
            expect(errorSuggestions.innerHTML).toContain('Suggestion 2');
        });
    });

    describe('PDF Generation Features', () => {
        test('should render PDF upload area in modal', async () => {
            await quizCreator.init(container);
            
            const generateFromPdfBtn = container.querySelector('#generate-from-pdf');
            generateFromPdfBtn.click();
            
            const modal = document.querySelector('.modal-overlay');
            const uploadArea = modal.querySelector('.file-upload-area');
            const fileInput = modal.querySelector('#pdf-file');
            const uploadContent = modal.querySelector('.file-upload-content');
            const uploadIcon = modal.querySelector('.file-upload-icon');
            
            expect(uploadArea).toBeTruthy();
            expect(fileInput).toBeTruthy();
            expect(fileInput.accept).toBe('.pdf');
            expect(fileInput.hidden).toBe(true);
            expect(uploadContent).toBeTruthy();
            expect(uploadIcon.textContent).toBe('📄');
            
            modal.remove();
        });

        test('should handle file selection and validation', async () => {
            await quizCreator.init(container);
            
            const generateFromPdfBtn = container.querySelector('#generate-from-pdf');
            generateFromPdfBtn.click();
            
            const modal = document.querySelector('.modal-overlay');
            const uploadContent = modal.querySelector('.file-upload-content');
            const selectedContent = modal.querySelector('.file-upload-selected');
            const selectedFileName = modal.querySelector('.selected-file-name');
            const generateBtn = modal.querySelector('#generate-pdf-quiz');
            
            // Mock file validation
            quizCreator.pdfProcessor.validateFile = vi.fn().mockReturnValue({
                success: true,
                message: 'File is valid'
            });
            
            // Create mock file
            const mockFile = new File(['test content'], 'test.pdf', { 
                type: 'application/pdf',
                size: 1024 * 1024 // 1MB
            });
            
            // Mock formatFileSize to return expected value
            quizCreator.formatFileSize = vi.fn().mockReturnValue('1 MB');
            
            // Test file selection
            quizCreator.handleFileSelection(mockFile, uploadContent, selectedContent, selectedFileName, generateBtn);
            
            expect(uploadContent.style.display).toBe('none');
            expect(selectedContent.style.display).toBe('block');
            expect(selectedFileName.textContent).toContain('test.pdf');
            expect(selectedFileName.textContent).toContain('1 MB');
            expect(generateBtn.disabled).toBe(false);
            
            modal.remove();
        });

        test('should handle invalid file selection', async () => {
            await quizCreator.init(container);
            
            const generateFromPdfBtn = container.querySelector('#generate-from-pdf');
            generateFromPdfBtn.click();
            
            const modal = document.querySelector('.modal-overlay');
            const uploadContent = modal.querySelector('.file-upload-content');
            const selectedContent = modal.querySelector('.file-upload-selected');
            const selectedFileName = modal.querySelector('.selected-file-name');
            const generateBtn = modal.querySelector('#generate-pdf-quiz');
            
            // Mock file validation failure
            quizCreator.pdfProcessor.validateFile = vi.fn().mockReturnValue({
                success: false,
                message: 'File too large'
            });
            
            // Mock showAlert
            quizCreator.showAlert = vi.fn();
            
            // Create mock file
            const mockFile = new File(['test content'], 'large.pdf', { 
                type: 'application/pdf',
                size: 15 * 1024 * 1024 // 15MB - too large
            });
            
            // Test file selection
            quizCreator.handleFileSelection(mockFile, uploadContent, selectedContent, selectedFileName, generateBtn);
            
            expect(quizCreator.showAlert).toHaveBeenCalledWith('File too large', 'error');
            expect(uploadContent.style.display).not.toBe('none');
            expect(selectedContent.style.display).not.toBe('block');
            
            modal.remove();
        });

        test('should handle drag and drop events', async () => {
            await quizCreator.init(container);
            
            const generateFromPdfBtn = container.querySelector('#generate-from-pdf');
            generateFromPdfBtn.click();
            
            const modal = document.querySelector('.modal-overlay');
            const uploadArea = modal.querySelector('.file-upload-area');
            
            // Test drag over
            const dragOverEvent = new Event('dragover', { bubbles: true });
            Object.defineProperty(dragOverEvent, 'preventDefault', { value: vi.fn() });
            uploadArea.dispatchEvent(dragOverEvent);
            
            expect(uploadArea.classList.contains('drag-over')).toBe(true);
            
            // Test drag leave
            const dragLeaveEvent = new Event('dragleave', { bubbles: true });
            uploadArea.dispatchEvent(dragLeaveEvent);
            
            expect(uploadArea.classList.contains('drag-over')).toBe(false);
            
            modal.remove();
        });

        test('should remove selected file when remove button clicked', async () => {
            await quizCreator.init(container);
            
            const generateFromPdfBtn = container.querySelector('#generate-from-pdf');
            generateFromPdfBtn.click();
            
            const modal = document.querySelector('.modal-overlay');
            const fileInput = modal.querySelector('#pdf-file');
            const uploadContent = modal.querySelector('.file-upload-content');
            const selectedContent = modal.querySelector('.file-upload-selected');
            const removeFileBtn = modal.querySelector('.remove-file-btn');
            const generateBtn = modal.querySelector('#generate-pdf-quiz');
            
            // Simulate file selected state
            uploadContent.style.display = 'none';
            selectedContent.style.display = 'block';
            generateBtn.disabled = false;
            
            // Click remove button
            const clickEvent = new MouseEvent('click', { bubbles: true });
            Object.defineProperty(clickEvent, 'stopPropagation', { value: vi.fn() });
            removeFileBtn.dispatchEvent(clickEvent);
            
            expect(fileInput.value).toBe('');
            expect(uploadContent.style.display).toBe('block');
            expect(selectedContent.style.display).toBe('none');
            expect(generateBtn.disabled).toBe(true);
            
            modal.remove();
        });

        test('should start PDF generation progress correctly', async () => {
            const modal = document.createElement('div');
            modal.innerHTML = `
                <div class="progress-fill"></div>
                <div class="progress-status"></div>
            `;
            
            quizCreator.startPdfGenerationProgress(modal);
            
            const progressFill = modal.querySelector('.progress-fill');
            const progressStatus = modal.querySelector('.progress-status');
            
            expect(progressFill.style.width).toBe('0%');
            expect(progressStatus.textContent).toBe('Preparing PDF processing...');
            expect(progressFill.classList.contains('progress-pdf')).toBe(true);
            expect(progressFill.classList.contains('progress-success')).toBe(false);
        });

        test('should update PDF progress status', async () => {
            const modal = document.createElement('div');
            modal.innerHTML = `
                <div class="progress-fill"></div>
                <div class="progress-status"></div>
            `;
            
            quizCreator.updatePdfProgressStatus(modal, 'Processing pages...');
            
            const progressFill = modal.querySelector('.progress-fill');
            const progressStatus = modal.querySelector('.progress-status');
            
            expect(progressStatus.textContent).toBe('Processing pages...');
            expect(progressFill.style.width).toBe('70%');
        });

        test('should complete PDF generation progress', async () => {
            const modal = document.createElement('div');
            modal.innerHTML = `
                <div class="progress-fill progress-pdf"></div>
                <div class="progress-status"></div>
            `;
            
            quizCreator.completePdfGenerationProgress(modal);
            
            const progressFill = modal.querySelector('.progress-fill');
            const progressStatus = modal.querySelector('.progress-status');
            
            expect(progressFill.style.width).toBe('100%');
            expect(progressStatus.textContent).toBe('PDF processing complete!');
            expect(progressFill.classList.contains('progress-pdf')).toBe(false);
            expect(progressFill.classList.contains('progress-success')).toBe(true);
        });

        test('should extract PDF with progress tracking', async () => {
            const modal = document.createElement('div');
            modal.innerHTML = `
                <div class="progress-fill"></div>
                <div class="progress-status"></div>
            `;
            
            // Mock PDF processor
            quizCreator.pdfProcessor.extractText = vi.fn().mockResolvedValue({
                success: true,
                text: 'Extracted PDF text content for quiz generation',
                metadata: { pageCount: 5 }
            });
            
            const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
            
            const result = await quizCreator.extractPdfWithProgress(mockFile, modal);
            
            expect(result.success).toBe(true);
            expect(result.text).toContain('Extracted PDF text');
            expect(quizCreator.pdfProcessor.extractText).toHaveBeenCalledWith(mockFile);
            
            const progressStatus = modal.querySelector('.progress-status');
            expect(progressStatus.textContent).toBe('Text extraction complete...');
        });

        test('should handle PDF extraction errors', async () => {
            const modal = document.createElement('div');
            modal.innerHTML = `
                <div class="progress-fill"></div>
                <div class="progress-status"></div>
            `;
            
            // Mock PDF processor to fail
            quizCreator.pdfProcessor.extractText = vi.fn().mockResolvedValue({
                success: false,
                error: 'Failed to read PDF file'
            });
            
            const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
            
            const result = await quizCreator.extractPdfWithProgress(mockFile, modal);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Failed to read PDF file');
        });

        test('should handle PDF generation errors with specific messages', async () => {
            const modal = document.createElement('div');
            modal.innerHTML = `
                <div class="generation-progress"></div>
                <div class="generation-error" style="display: none;">
                    <div class="error-content">
                        <div class="error-message"></div>
                        <div class="error-suggestions"></div>
                    </div>
                </div>
                <button id="generate-pdf-quiz"></button>
            `;
            
            // Mock toggleFormInputs
            quizCreator.toggleFormInputs = vi.fn();
            quizCreator.showGenerationError = vi.fn();
            
            // Test different error types
            const errors = [
                { message: 'File must be a PDF', expectedTitle: 'Invalid File Type' },
                { message: 'File size must be less than', expectedTitle: 'File Too Large' },
                { message: 'not contain enough readable text', expectedTitle: 'Insufficient Text Content' },
                { message: 'Failed to extract text', expectedTitle: 'Text Extraction Failed' },
                { message: 'API key not configured', expectedTitle: 'AI Service Configuration' },
                { message: 'quota exceeded', expectedTitle: 'Usage Limit Reached' },
                { message: 'network error', expectedTitle: 'Connection Error' }
            ];
            
            for (const errorCase of errors) {
                const error = new Error(errorCase.message);
                quizCreator.handlePdfGenerationError(modal, error);
                
                expect(quizCreator.showGenerationError).toHaveBeenCalledWith(
                    modal,
                    errorCase.expectedTitle,
                    expect.any(String),
                    expect.any(Array)
                );
            }
        });

        test('should have PDF generation methods implemented', () => {
            expect(typeof quizCreator.extractPdfWithProgress).toBe('function');
            expect(typeof quizCreator.startPdfGenerationProgress).toBe('function');
            expect(typeof quizCreator.updatePdfProgressStatus).toBe('function');
            expect(typeof quizCreator.completePdfGenerationProgress).toBe('function');
            expect(typeof quizCreator.handlePdfGenerationError).toBe('function');
        });
    });
});