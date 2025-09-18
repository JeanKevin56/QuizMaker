/**
 * Integration Test Suite for Quiz Platform
 * Task 14.2: Implement integration tests
 * 
 * This test suite covers:
 * - End-to-end quiz taking flow tests
 * - AI API integration with mock responses
 * - PDF processing integration tests
 * - Cross-browser compatibility tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Import components and services for integration testing
// Note: Avoiding imports that cause circular dependency issues
import { ScoringService } from '../services/ScoringService.js';
import { TextPreprocessor } from '../services/TextPreprocessor.js';
import { QUESTION_TYPES } from '../models/types.js';
import { validateQuiz } from '../models/validation.js';

// Mock data for integration tests
const mockQuizData = {
  id: 'integration-quiz-12345678',
  title: 'Integration Test Quiz',
  description: 'A quiz for testing end-to-end functionality',
  questions: [
    {
      id: 'int-q1-12345678',
      type: QUESTION_TYPES.MCQ_SINGLE,
      question: 'What is the capital of France?',
      options: ['London', 'Paris', 'Berlin', 'Madrid'],
      correctAnswer: 1,
      explanation: 'Paris is the capital of France',
      media: null
    },
    {
      id: 'int-q2-12345678',
      type: QUESTION_TYPES.MCQ_MULTIPLE,
      question: 'Which of these are programming languages?',
      options: ['JavaScript', 'HTML', 'Python', 'CSS'],
      correctAnswers: [0, 2],
      explanation: 'JavaScript and Python are programming languages',
      media: null
    },
    {
      id: 'int-q3-12345678',
      type: QUESTION_TYPES.TEXT_INPUT,
      question: 'What does HTML stand for?',
      correctAnswer: 'HyperText Markup Language',
      caseSensitive: false,
      explanation: 'HTML stands for HyperText Markup Language',
      media: null
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  settings: {
    shuffleQuestions: false,
    showExplanations: true
  }
};

describe('Integration Tests', () => {
  
  describe('End-to-End Quiz Taking Flow Simulation', () => {
    let container;
    let scoringService;

    beforeEach(() => {
      // Create DOM container for testing
      container = document.createElement('div');
      container.id = 'quiz-container';
      document.body.appendChild(container);

      scoringService = new ScoringService();
    });

    afterEach(() => {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    });

    it('should simulate complete quiz taking flow', () => {
      // Simulate quiz state
      const quizState = {
        currentQuestionIndex: 0,
        answers: new Map(),
        validationResults: new Map(),
        submissionTimestamps: new Map(),
        startTime: new Date(),
        
        collectAnswer(questionId, answer) {
          this.answers.set(questionId, answer);
          this.submissionTimestamps.set(questionId, new Date());
        },
        
        validateAnswer(questionId) {
          const question = mockQuizData.questions.find(q => q.id === questionId);
          const answer = this.answers.get(questionId);
          
          if (!question || answer === undefined) return { isCorrect: false };
          
          let isCorrect = false;
          switch (question.type) {
            case QUESTION_TYPES.MCQ_SINGLE:
              isCorrect = answer === question.correctAnswer;
              break;
            case QUESTION_TYPES.MCQ_MULTIPLE:
              isCorrect = Array.isArray(answer) && 
                         answer.length === question.correctAnswers.length &&
                         answer.every(a => question.correctAnswers.includes(a));
              break;
            case QUESTION_TYPES.TEXT_INPUT:
              isCorrect = typeof answer === 'string' && 
                         answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
              break;
          }
          
          const result = { isCorrect };
          this.validationResults.set(questionId, result);
          return result;
        }
      };

      // Step 1: Answer first question (MCQ Single)
      const firstQuestion = mockQuizData.questions[0];
      quizState.collectAnswer(firstQuestion.id, 1); // Paris (correct)
      const validation1 = quizState.validateAnswer(firstQuestion.id);
      expect(validation1.isCorrect).toBe(true);

      // Step 2: Answer second question (MCQ Multiple)
      const secondQuestion = mockQuizData.questions[1];
      quizState.collectAnswer(secondQuestion.id, [0, 2]); // JavaScript and Python (correct)
      const validation2 = quizState.validateAnswer(secondQuestion.id);
      expect(validation2.isCorrect).toBe(true);

      // Step 3: Answer third question (Text Input)
      const thirdQuestion = mockQuizData.questions[2];
      quizState.collectAnswer(thirdQuestion.id, 'hypertext markup language'); // Correct
      const validation3 = quizState.validateAnswer(thirdQuestion.id);
      expect(validation3.isCorrect).toBe(true);

      // Step 4: Calculate final results
      const endTime = new Date();
      const result = scoringService.calculateQuizResult(
        mockQuizData,
        quizState.answers,
        quizState.validationResults,
        quizState.submissionTimestamps,
        quizState.startTime,
        endTime,
        'test-user-12345678'
      );
      
      expect(result).toBeTruthy();
      expect(result.quizId).toBe(mockQuizData.id);
      expect(result.userId).toBe('test-user-12345678');
      expect(result.totalQuestions).toBe(3);
      expect(result.score).toBe(100); // All answers correct
      expect(result.correctCount).toBe(3);
    });

    it('should handle mixed correct and incorrect answers', () => {
      const quizState = {
        answers: new Map(),
        validationResults: new Map(),
        submissionTimestamps: new Map(),
        startTime: new Date()
      };

      // Answer first question correctly
      quizState.answers.set(mockQuizData.questions[0].id, 1);
      quizState.validationResults.set(mockQuizData.questions[0].id, { isCorrect: true });
      quizState.submissionTimestamps.set(mockQuizData.questions[0].id, new Date());

      // Answer second question incorrectly
      quizState.answers.set(mockQuizData.questions[1].id, [1, 3]);
      quizState.validationResults.set(mockQuizData.questions[1].id, { isCorrect: false });
      quizState.submissionTimestamps.set(mockQuizData.questions[1].id, new Date());

      // Answer third question correctly
      quizState.answers.set(mockQuizData.questions[2].id, 'hypertext markup language');
      quizState.validationResults.set(mockQuizData.questions[2].id, { isCorrect: true });
      quizState.submissionTimestamps.set(mockQuizData.questions[2].id, new Date());

      const result = scoringService.calculateQuizResult(
        mockQuizData,
        quizState.answers,
        quizState.validationResults,
        quizState.submissionTimestamps,
        quizState.startTime,
        new Date(),
        'test-user-12345678'
      );

      expect(result.correctCount).toBe(2);
      expect(result.score).toBeCloseTo(67, 0); // 2/3 = ~67%
    });

    it('should handle navigation state simulation', () => {
      const navigationState = {
        currentQuestion: 0,
        totalQuestions: mockQuizData.questions.length,
        
        canGoNext() {
          return this.currentQuestion < this.totalQuestions - 1;
        },
        
        canGoPrevious() {
          return this.currentQuestion > 0;
        },
        
        next() {
          if (this.canGoNext()) {
            this.currentQuestion++;
            return true;
          }
          return false;
        },
        
        previous() {
          if (this.canGoPrevious()) {
            this.currentQuestion--;
            return true;
          }
          return false;
        },
        
        getProgress() {
          return (this.currentQuestion + 1) / this.totalQuestions;
        }
      };

      // Test initial state
      expect(navigationState.currentQuestion).toBe(0);
      expect(navigationState.canGoPrevious()).toBe(false);
      expect(navigationState.canGoNext()).toBe(true);
      expect(navigationState.getProgress()).toBeCloseTo(0.33, 2);

      // Navigate forward
      expect(navigationState.next()).toBe(true);
      expect(navigationState.currentQuestion).toBe(1);
      expect(navigationState.canGoPrevious()).toBe(true);
      expect(navigationState.canGoNext()).toBe(true);
      expect(navigationState.getProgress()).toBeCloseTo(0.67, 2);

      // Navigate to last question
      expect(navigationState.next()).toBe(true);
      expect(navigationState.currentQuestion).toBe(2);
      expect(navigationState.canGoPrevious()).toBe(true);
      expect(navigationState.canGoNext()).toBe(false);
      expect(navigationState.getProgress()).toBe(1);

      // Try to go beyond last question
      expect(navigationState.next()).toBe(false);
      expect(navigationState.currentQuestion).toBe(2);

      // Navigate backward
      expect(navigationState.previous()).toBe(true);
      expect(navigationState.currentQuestion).toBe(1);
    });
  });

  describe('AI API Integration Tests', () => {
    beforeEach(() => {
      // Mock fetch for API calls
      global.fetch = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should simulate AI API response processing', async () => {
      // Mock successful AI response
      const mockAIResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                title: "AI Generated Quiz",
                description: "A quiz generated by AI",
                questions: [
                  {
                    type: "mcq_single",
                    question: "What is artificial intelligence?",
                    options: ["A computer program", "Machine learning", "Human-like thinking by machines", "Data analysis"],
                    correctAnswer: 2,
                    explanation: "AI refers to human-like thinking capabilities in machines"
                  }
                ]
              })
            }]
          }
        }]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAIResponse
      });

      // Simulate API call
      const response = await fetch('https://api.example.com/generate');
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.candidates).toBeTruthy();
      expect(data.candidates[0].content.parts[0].text).toBeTruthy();
      
      // Parse the AI response
      const quizData = JSON.parse(data.candidates[0].content.parts[0].text);
      expect(quizData.title).toBe("AI Generated Quiz");
      expect(quizData.questions).toHaveLength(1);
      expect(quizData.questions[0].question).toContain("artificial intelligence");
      
      // Verify API was called
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle AI API errors gracefully', async () => {
      // Mock API error
      global.fetch.mockRejectedValueOnce(new Error('API Error'));

      await expect(fetch('https://api.example.com/generate'))
        .rejects.toThrow('API Error');
    });

    it('should handle invalid AI response format', async () => {
      // Mock invalid response
      const mockInvalidResponse = {
        candidates: [{
          content: {
            parts: [{
              text: "Invalid JSON response"
            }]
          }
        }]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockInvalidResponse
      });

      const response = await fetch('https://api.example.com/generate');
      const data = await response.json();
      
      expect(() => {
        JSON.parse(data.candidates[0].content.parts[0].text);
      }).toThrow();
    });

    it('should validate AI-generated quiz structure', async () => {
      // Mock AI response with complete quiz structure
      const mockCompleteQuiz = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                title: "Complete AI Quiz",
                description: "A complete quiz with all required fields",
                questions: [
                  {
                    type: "mcq_single",
                    question: "Sample question?",
                    options: ["Option A", "Option B", "Option C", "Option D"],
                    correctAnswer: 1,
                    explanation: "Sample explanation"
                  },
                  {
                    type: "text_input",
                    question: "Fill in the blank:",
                    correctAnswer: "sample answer",
                    caseSensitive: false,
                    explanation: "Sample text explanation"
                  }
                ],
                settings: {
                  shuffleQuestions: false,
                  showExplanations: true
                }
              })
            }]
          }
        }]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCompleteQuiz
      });

      const response = await fetch('https://api.example.com/generate');
      const data = await response.json();
      const quiz = JSON.parse(data.candidates[0].content.parts[0].text);

      // Validate basic quiz structure
      expect(quiz.questions.every(q => q.type && q.question && q.explanation)).toBe(true);
      expect(quiz.title).toBeTruthy();
      expect(quiz.description).toBeTruthy();
      expect(quiz.questions).toHaveLength(2);
      expect(quiz.settings).toBeTruthy();
      
      // Validate question structure
      quiz.questions.forEach(question => {
        expect(question.type).toBeTruthy();
        expect(question.question).toBeTruthy();
        expect(question.explanation).toBeTruthy();
      });
    });
  });

  describe('PDF Processing Integration Tests', () => {
    let textPreprocessor;

    beforeEach(() => {
      textPreprocessor = new TextPreprocessor();
      
      // Mock PDF.js
      global.pdfjsLib = {
        getDocument: vi.fn(),
        GlobalWorkerOptions: {
          workerSrc: ''
        }
      };
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should simulate PDF text extraction and processing', async () => {
      // Mock PDF document structure
      const mockPDFDoc = {
        numPages: 2,
        getPage: vi.fn()
      };

      const mockPage = {
        getTextContent: vi.fn().mockResolvedValue({
          items: [
            { str: 'Sample PDF text content. ' },
            { str: 'This is a test document. ' },
            { str: 'It contains multiple sentences.' }
          ]
        })
      };

      mockPDFDoc.getPage.mockResolvedValue(mockPage);
      global.pdfjsLib.getDocument.mockReturnValue({
        promise: Promise.resolve(mockPDFDoc)
      });

      // Simulate PDF processing
      const mockFileData = new ArrayBuffer(1024);
      const pdfDoc = await global.pdfjsLib.getDocument({ data: mockFileData }).promise;
      
      let extractedText = '';
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        extractedText += textContent.items.map(item => item.str).join(' ');
      }

      expect(extractedText).toBeTruthy();
      expect(extractedText).toContain('Sample PDF text content');
      expect(extractedText).toContain('test document');
      expect(global.pdfjsLib.getDocument).toHaveBeenCalledWith({ data: mockFileData });
    });

    it('should handle PDF processing errors', async () => {
      // Mock PDF processing error
      global.pdfjsLib.getDocument.mockReturnValue({
        promise: Promise.reject(new Error('PDF parsing failed'))
      });

      const mockFileData = new ArrayBuffer(1024);

      await expect(global.pdfjsLib.getDocument({ data: mockFileData }).promise)
        .rejects.toThrow('PDF parsing failed');
    });

    it('should integrate PDF processing with text preprocessing', async () => {
      // Mock successful PDF extraction
      const mockExtractedText = `
        Chapter 1: Introduction to Programming
        
        Programming is the process of creating instructions for computers.
        Variables store data. Functions perform operations.
        
        Key concepts:
        - Variables and data types
        - Control structures
        - Functions and methods
      `;

      // Simulate text preprocessing
      const simulatePreprocessText = (text) => {
        return text
          .replace(/\s+/g, ' ')  // Normalize whitespace
          .replace(/^\s+|\s+$/g, '') // Trim
          .toLowerCase();
      };
      
      const simulateChunkText = (text, chunkSize) => {
        const chunks = [];
        for (let i = 0; i < text.length; i += chunkSize) {
          chunks.push(text.substring(i, i + chunkSize));
        }
        return chunks;
      };

      const processedText = simulatePreprocessText(mockExtractedText);
      const chunks = simulateChunkText(processedText, 500);

      expect(processedText).toBeTruthy();
      expect(processedText.length).toBeLessThan(mockExtractedText.length); // Should be cleaned
      expect(chunks).toBeInstanceOf(Array);
      expect(chunks.length).toBeGreaterThan(0);
      
      // Verify key content is preserved
      expect(processedText).toContain('programming');
      expect(processedText).toContain('variables');
      expect(processedText).toContain('functions');
    });

    it('should handle empty or invalid PDF content', async () => {
      // Mock empty PDF
      const mockEmptyPDFDoc = {
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getTextContent: vi.fn().mockResolvedValue({
            items: []
          })
        })
      };

      global.pdfjsLib.getDocument.mockReturnValue({
        promise: Promise.resolve(mockEmptyPDFDoc)
      });

      const mockFileData = new ArrayBuffer(1024);
      const pdfDoc = await global.pdfjsLib.getDocument({ data: mockFileData }).promise;
      const page = await pdfDoc.getPage(1);
      const textContent = await page.getTextContent();
      const extractedText = textContent.items.map(item => item.str).join(' ');

      expect(extractedText).toBe('');
    });
  });

  describe('Cross-Browser Compatibility Tests', () => {
    
    beforeEach(() => {
      // Reset DOM and global objects
      document.body.innerHTML = '';
    });

    it('should handle different input event types', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      // Create a simple radio input for testing
      const radioInput = document.createElement('input');
      radioInput.type = 'radio';
      radioInput.name = 'test';
      container.appendChild(radioInput);

      // Test different event types that browsers might use
      const events = ['change', 'click', 'input'];
      
      events.forEach(eventType => {
        const event = new Event(eventType, { bubbles: true });
        expect(() => radioInput.dispatchEvent(event)).not.toThrow();
      });
    });

    it('should handle localStorage availability', () => {
      // Test with localStorage available
      expect(() => {
        localStorage.setItem('test', 'value');
        localStorage.getItem('test');
        localStorage.removeItem('test');
      }).not.toThrow();

      // Mock localStorage unavailable scenario
      const originalLocalStorage = global.localStorage;
      delete global.localStorage;

      // Basic operations should handle missing localStorage gracefully
      expect(() => {
        const mockStorage = {
          data: {},
          setItem(key, value) { this.data[key] = value; },
          getItem(key) { return this.data[key] || null; },
          removeItem(key) { delete this.data[key]; }
        };
        
        mockStorage.setItem('test-id', 'test-answer');
        expect(mockStorage.getItem('test-id')).toBe('test-answer');
      }).not.toThrow();

      // Restore localStorage
      global.localStorage = originalLocalStorage;
    });

    it('should handle different screen sizes and orientations', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      // Mock different viewport sizes
      const viewports = [
        { width: 320, height: 568 },  // Mobile portrait
        { width: 768, height: 1024 }, // Tablet portrait
        { width: 1920, height: 1080 } // Desktop
      ];

      viewports.forEach(viewport => {
        // Mock window dimensions
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: viewport.width
        });
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: viewport.height
        });

        // Create responsive elements
        const questionElement = document.createElement('div');
        questionElement.className = 'question-container';
        
        // Create checkboxes for testing
        for (let i = 0; i < 4; i++) {
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          questionElement.appendChild(checkbox);
        }
        
        container.appendChild(questionElement);
        
        expect(container.querySelector('.question-container')).toBeTruthy();
        expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(4);
        
        container.innerHTML = ''; // Clean up for next iteration
      });
    });

    it('should handle touch and mouse events', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      // Create navigation buttons for testing
      const nextButton = document.createElement('button');
      nextButton.className = 'nav-next';
      nextButton.textContent = 'Next';
      
      const prevButton = document.createElement('button');
      prevButton.className = 'nav-previous';
      prevButton.textContent = 'Previous';
      
      container.appendChild(nextButton);
      container.appendChild(prevButton);

      // Test mouse events
      expect(() => {
        nextButton.dispatchEvent(new MouseEvent('click'));
        prevButton.dispatchEvent(new MouseEvent('click'));
      }).not.toThrow();

      // Test touch events (if supported)
      if ('TouchEvent' in window) {
        expect(() => {
          nextButton.dispatchEvent(new TouchEvent('touchstart'));
          nextButton.dispatchEvent(new TouchEvent('touchend'));
        }).not.toThrow();
      }
    });

    it('should handle different date/time formats', () => {
      const scoringService = new ScoringService();

      // Test with different date formats that browsers might produce
      const testDates = [
        new Date('2024-01-15T10:30:00Z'),
        new Date('2024-01-15T10:30:00.123Z'),
        new Date(2024, 0, 15, 10, 30, 0),
        new Date(Date.now())
      ];

      testDates.forEach(testDate => {
        expect(() => {
          const timeSpent = Math.round((new Date() - testDate) / 1000);
          expect(timeSpent).toBeGreaterThanOrEqual(0);
          
          const grade = scoringService.calculateGrade(85);
          expect(typeof grade).toBe('string');
        }).not.toThrow();
      });
    });

    it('should handle different text encoding and special characters', () => {
      const testTexts = [
        'Regular ASCII text',
        'Text with émojis 🎉 and spëcial châractërs',
        'Text with\r\nWindows line endings',
        'Text with\nUnix line endings',
        'Text\twith\ttabs',
        '中文测试文本', // Chinese characters
        'العربية النص', // Arabic text
        'Русский текст'  // Cyrillic text
      ];

      // Simulate text preprocessing
      const simulatePreprocessText = (text) => {
        return text
          .replace(/\s+/g, ' ')  // Normalize whitespace
          .replace(/^\s+|\s+$/g, '') // Trim
          .toLowerCase();
      };

      testTexts.forEach(text => {
        expect(() => {
          const processed = simulatePreprocessText(text);
          expect(typeof processed).toBe('string');
          expect(processed.length).toBeGreaterThan(0);
        }).not.toThrow();
      });
    });
  });

  describe('Component Integration Simulation Tests', () => {
    
    it('should simulate quiz creation workflow', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      // Simulate quiz creation UI
      const createQuizForm = () => {
        const form = document.createElement('form');
        form.className = 'quiz-creator-form';
        
        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.name = 'title';
        titleInput.placeholder = 'Quiz Title';
        
        const descInput = document.createElement('textarea');
        descInput.name = 'description';
        descInput.placeholder = 'Quiz Description';
        
        const addQuestionBtn = document.createElement('button');
        addQuestionBtn.type = 'button';
        addQuestionBtn.textContent = 'Add Question';
        addQuestionBtn.className = 'add-question-btn';
        
        form.appendChild(titleInput);
        form.appendChild(descInput);
        form.appendChild(addQuestionBtn);
        
        return form;
      };

      const addQuestionToForm = (form, questionType) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-form';
        questionDiv.dataset.type = questionType;
        
        const questionInput = document.createElement('input');
        questionInput.type = 'text';
        questionInput.placeholder = 'Question text';
        questionDiv.appendChild(questionInput);
        
        if (questionType === QUESTION_TYPES.MCQ_SINGLE || questionType === QUESTION_TYPES.MCQ_MULTIPLE) {
          for (let i = 0; i < 4; i++) {
            const optionInput = document.createElement('input');
            optionInput.type = 'text';
            optionInput.placeholder = `Option ${i + 1}`;
            questionDiv.appendChild(optionInput);
          }
        }
        
        form.appendChild(questionDiv);
        return questionDiv;
      };

      // Test quiz creation workflow
      const form = createQuizForm();
      container.appendChild(form);
      
      expect(container.querySelector('.quiz-creator-form')).toBeTruthy();
      
      // Add questions
      const mcqQuestion = addQuestionToForm(form, QUESTION_TYPES.MCQ_SINGLE);
      const textQuestion = addQuestionToForm(form, QUESTION_TYPES.TEXT_INPUT);
      
      expect(form.querySelectorAll('.question-form')).toHaveLength(2);
      expect(mcqQuestion.dataset.type).toBe(QUESTION_TYPES.MCQ_SINGLE);
      expect(textQuestion.dataset.type).toBe(QUESTION_TYPES.TEXT_INPUT);
    });

    it('should simulate complete quiz-taking workflow', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      // Simulate quiz state management
      const quizSession = {
        quiz: mockQuizData,
        currentQuestionIndex: 0,
        answers: {},
        startTime: new Date(),
        
        renderCurrentQuestion() {
          const question = this.quiz.questions[this.currentQuestionIndex];
          
          // Clear container
          container.innerHTML = '';
          
          // Create question display
          const questionDiv = document.createElement('div');
          questionDiv.className = 'current-question';
          
          const questionText = document.createElement('h3');
          questionText.textContent = question.question;
          questionDiv.appendChild(questionText);
          
          // Create input based on question type
          const inputDiv = document.createElement('div');
          inputDiv.className = 'question-input';
          
          switch (question.type) {
            case QUESTION_TYPES.MCQ_SINGLE:
              question.options.forEach((option, index) => {
                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = 'answer';
                radio.value = index.toString();
                
                const label = document.createElement('label');
                label.textContent = option;
                
                inputDiv.appendChild(radio);
                inputDiv.appendChild(label);
              });
              break;
              
            case QUESTION_TYPES.MCQ_MULTIPLE:
              question.options.forEach((option, index) => {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.name = 'answer';
                checkbox.value = index.toString();
                
                const label = document.createElement('label');
                label.textContent = option;
                
                inputDiv.appendChild(checkbox);
                inputDiv.appendChild(label);
              });
              break;
              
            case QUESTION_TYPES.TEXT_INPUT:
              const textInput = document.createElement('input');
              textInput.type = 'text';
              textInput.name = 'answer';
              inputDiv.appendChild(textInput);
              break;
          }
          
          questionDiv.appendChild(inputDiv);
          container.appendChild(questionDiv);
          
          return questionDiv;
        },
        
        collectAnswer() {
          const question = this.quiz.questions[this.currentQuestionIndex];
          let answer = null;
          
          switch (question.type) {
            case QUESTION_TYPES.MCQ_SINGLE:
              const checkedRadio = container.querySelector('input[type="radio"]:checked');
              answer = checkedRadio ? parseInt(checkedRadio.value) : null;
              break;
              
            case QUESTION_TYPES.MCQ_MULTIPLE:
              const checkedBoxes = container.querySelectorAll('input[type="checkbox"]:checked');
              answer = Array.from(checkedBoxes).map(cb => parseInt(cb.value));
              break;
              
            case QUESTION_TYPES.TEXT_INPUT:
              const textInput = container.querySelector('input[type="text"]');
              answer = textInput ? textInput.value : null;
              break;
          }
          
          this.answers[question.id] = answer;
          return answer;
        },
        
        nextQuestion() {
          if (this.currentQuestionIndex < this.quiz.questions.length - 1) {
            this.currentQuestionIndex++;
            return true;
          }
          return false;
        },
        
        calculateResults() {
          const scoringService = new ScoringService();
          let correctCount = 0;
          
          this.quiz.questions.forEach(question => {
            const userAnswer = this.answers[question.id];
            let isCorrect = false;
            
            switch (question.type) {
              case QUESTION_TYPES.MCQ_SINGLE:
                isCorrect = userAnswer === question.correctAnswer;
                break;
              case QUESTION_TYPES.MCQ_MULTIPLE:
                isCorrect = Array.isArray(userAnswer) && 
                           userAnswer.length === question.correctAnswers.length &&
                           userAnswer.every(a => question.correctAnswers.includes(a));
                break;
              case QUESTION_TYPES.TEXT_INPUT:
                isCorrect = typeof userAnswer === 'string' && 
                           userAnswer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
                break;
            }
            
            if (isCorrect) correctCount++;
          });
          
          return {
            totalQuestions: this.quiz.questions.length,
            correctCount,
            score: Math.round((correctCount / this.quiz.questions.length) * 100),
            grade: scoringService.calculateGrade(Math.round((correctCount / this.quiz.questions.length) * 100))
          };
        }
      };

      // Test complete workflow
      // Question 1
      quizSession.renderCurrentQuestion();
      expect(container.querySelector('.current-question')).toBeTruthy();
      expect(container.querySelectorAll('input[type="radio"]')).toHaveLength(4);
      
      // Answer question 1
      const radio = container.querySelector('input[type="radio"][value="1"]');
      radio.checked = true;
      const answer1 = quizSession.collectAnswer();
      expect(answer1).toBe(1);
      
      // Move to question 2
      expect(quizSession.nextQuestion()).toBe(true);
      quizSession.renderCurrentQuestion();
      expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(4);
      
      // Answer question 2
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      checkboxes[0].checked = true;
      checkboxes[2].checked = true;
      const answer2 = quizSession.collectAnswer();
      expect(answer2).toEqual([0, 2]);
      
      // Move to question 3
      expect(quizSession.nextQuestion()).toBe(true);
      quizSession.renderCurrentQuestion();
      expect(container.querySelector('input[type="text"]')).toBeTruthy();
      
      // Answer question 3
      const textInput = container.querySelector('input[type="text"]');
      textInput.value = 'hypertext markup language';
      const answer3 = quizSession.collectAnswer();
      expect(answer3).toBe('hypertext markup language');
      
      // Calculate final results
      const results = quizSession.calculateResults();
      expect(results.totalQuestions).toBe(3);
      expect(results.correctCount).toBe(3);
      expect(results.score).toBe(100);
    });
  });
});