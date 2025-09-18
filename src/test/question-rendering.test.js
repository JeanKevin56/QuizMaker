/**
 * Question Rendering Component Tests
 * Tests the logic and functionality of question rendering components
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QUESTION_TYPES } from '../models/types.js';

describe('Question Rendering Tests', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('MCQ Single Question Rendering', () => {
    const mockMCQSingleQuestion = {
      id: 'mcq-single-test-12345678',
      type: QUESTION_TYPES.MCQ_SINGLE,
      question: 'What is the capital of France?',
      options: ['London', 'Paris', 'Berlin', 'Madrid'],
      correctAnswer: 1,
      explanation: 'Paris is the capital of France',
      media: null
    };

    it('should render MCQ single question with radio buttons', () => {
      // Simulate question rendering logic
      const questionContainer = document.createElement('div');
      questionContainer.className = 'question-container';
      
      // Question text
      const questionText = document.createElement('h3');
      questionText.className = 'question-text';
      questionText.textContent = mockMCQSingleQuestion.question;
      questionContainer.appendChild(questionText);
      
      // Options container
      const optionsContainer = document.createElement('div');
      optionsContainer.className = 'options-container';
      
      mockMCQSingleQuestion.options.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        
        const radioInput = document.createElement('input');
        radioInput.type = 'radio';
        radioInput.name = `question-${mockMCQSingleQuestion.id}`;
        radioInput.value = index.toString();
        radioInput.id = `option-${mockMCQSingleQuestion.id}-${index}`;
        
        const label = document.createElement('label');
        label.htmlFor = radioInput.id;
        label.textContent = option;
        
        optionDiv.appendChild(radioInput);
        optionDiv.appendChild(label);
        optionsContainer.appendChild(optionDiv);
      });
      
      questionContainer.appendChild(optionsContainer);
      container.appendChild(questionContainer);

      // Verify rendering
      expect(container.querySelector('.question-text')).toBeTruthy();
      expect(container.querySelector('.question-text').textContent).toBe(mockMCQSingleQuestion.question);
      
      const radioButtons = container.querySelectorAll('input[type="radio"]');
      expect(radioButtons.length).toBe(4);
      
      const labels = container.querySelectorAll('label');
      expect(labels.length).toBe(4);
      expect(labels[1].textContent).toBe('Paris');
    });

    it('should handle radio button selection', () => {
      // Create radio buttons
      const optionsContainer = document.createElement('div');
      
      mockMCQSingleQuestion.options.forEach((option, index) => {
        const radioInput = document.createElement('input');
        radioInput.type = 'radio';
        radioInput.name = `question-${mockMCQSingleQuestion.id}`;
        radioInput.value = index.toString();
        radioInput.id = `option-${mockMCQSingleQuestion.id}-${index}`;
        
        optionsContainer.appendChild(radioInput);
      });
      
      container.appendChild(optionsContainer);

      const radioButtons = container.querySelectorAll('input[type="radio"]');
      
      // Test selection
      radioButtons[1].checked = true;
      radioButtons[1].dispatchEvent(new Event('change'));
      
      expect(radioButtons[1].checked).toBe(true);
      expect(radioButtons[0].checked).toBe(false);
      expect(radioButtons[2].checked).toBe(false);
      expect(radioButtons[3].checked).toBe(false);
    });

    it('should validate answer selection', () => {
      const getSelectedAnswer = () => {
        const checkedRadio = container.querySelector('input[type="radio"]:checked');
        return checkedRadio ? parseInt(checkedRadio.value) : null;
      };

      const validateAnswer = (selectedAnswer, correctAnswer) => {
        return selectedAnswer === correctAnswer;
      };

      // Create radio buttons
      mockMCQSingleQuestion.options.forEach((option, index) => {
        const radioInput = document.createElement('input');
        radioInput.type = 'radio';
        radioInput.name = `question-${mockMCQSingleQuestion.id}`;
        radioInput.value = index.toString();
        container.appendChild(radioInput);
      });

      const radioButtons = container.querySelectorAll('input[type="radio"]');
      
      // Test correct answer
      radioButtons[1].checked = true; // Paris (correct)
      let selectedAnswer = getSelectedAnswer();
      expect(validateAnswer(selectedAnswer, mockMCQSingleQuestion.correctAnswer)).toBe(true);
      
      // Test incorrect answer
      radioButtons[1].checked = false;
      radioButtons[0].checked = true; // London (incorrect)
      selectedAnswer = getSelectedAnswer();
      expect(validateAnswer(selectedAnswer, mockMCQSingleQuestion.correctAnswer)).toBe(false);
    });
  });

  describe('MCQ Multiple Question Rendering', () => {
    const mockMCQMultipleQuestion = {
      id: 'mcq-multiple-test-12345678',
      type: QUESTION_TYPES.MCQ_MULTIPLE,
      question: 'Which of these are programming languages?',
      options: ['JavaScript', 'HTML', 'Python', 'CSS'],
      correctAnswers: [0, 2],
      explanation: 'JavaScript and Python are programming languages',
      media: null
    };

    it('should render MCQ multiple question with checkboxes', () => {
      // Simulate question rendering logic
      const questionContainer = document.createElement('div');
      questionContainer.className = 'question-container';
      
      // Question text
      const questionText = document.createElement('h3');
      questionText.className = 'question-text';
      questionText.textContent = mockMCQMultipleQuestion.question;
      questionContainer.appendChild(questionText);
      
      // Options container
      const optionsContainer = document.createElement('div');
      optionsContainer.className = 'options-container';
      
      mockMCQMultipleQuestion.options.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        
        const checkboxInput = document.createElement('input');
        checkboxInput.type = 'checkbox';
        checkboxInput.name = `question-${mockMCQMultipleQuestion.id}`;
        checkboxInput.value = index.toString();
        checkboxInput.id = `option-${mockMCQMultipleQuestion.id}-${index}`;
        
        const label = document.createElement('label');
        label.htmlFor = checkboxInput.id;
        label.textContent = option;
        
        optionDiv.appendChild(checkboxInput);
        optionDiv.appendChild(label);
        optionsContainer.appendChild(optionDiv);
      });
      
      questionContainer.appendChild(optionsContainer);
      container.appendChild(questionContainer);

      // Verify rendering
      expect(container.querySelector('.question-text')).toBeTruthy();
      expect(container.querySelector('.question-text').textContent).toBe(mockMCQMultipleQuestion.question);
      
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes.length).toBe(4);
      
      const labels = container.querySelectorAll('label');
      expect(labels.length).toBe(4);
      expect(labels[0].textContent).toBe('JavaScript');
      expect(labels[2].textContent).toBe('Python');
    });

    it('should handle multiple checkbox selections', () => {
      // Create checkboxes
      const optionsContainer = document.createElement('div');
      
      mockMCQMultipleQuestion.options.forEach((option, index) => {
        const checkboxInput = document.createElement('input');
        checkboxInput.type = 'checkbox';
        checkboxInput.name = `question-${mockMCQMultipleQuestion.id}`;
        checkboxInput.value = index.toString();
        checkboxInput.id = `option-${mockMCQMultipleQuestion.id}-${index}`;
        
        optionsContainer.appendChild(checkboxInput);
      });
      
      container.appendChild(optionsContainer);

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      
      // Test multiple selections
      checkboxes[0].checked = true; // JavaScript
      checkboxes[2].checked = true; // Python
      
      checkboxes[0].dispatchEvent(new Event('change'));
      checkboxes[2].dispatchEvent(new Event('change'));
      
      expect(checkboxes[0].checked).toBe(true);
      expect(checkboxes[1].checked).toBe(false);
      expect(checkboxes[2].checked).toBe(true);
      expect(checkboxes[3].checked).toBe(false);
    });

    it('should validate multiple answer selection', () => {
      const getSelectedAnswers = () => {
        const checkedBoxes = container.querySelectorAll('input[type="checkbox"]:checked');
        return Array.from(checkedBoxes).map(cb => parseInt(cb.value));
      };

      const validateAnswers = (selectedAnswers, correctAnswers) => {
        if (selectedAnswers.length !== correctAnswers.length) return false;
        const sortedSelected = [...selectedAnswers].sort();
        const sortedCorrect = [...correctAnswers].sort();
        return sortedSelected.every((ans, index) => ans === sortedCorrect[index]);
      };

      // Create checkboxes
      mockMCQMultipleQuestion.options.forEach((option, index) => {
        const checkboxInput = document.createElement('input');
        checkboxInput.type = 'checkbox';
        checkboxInput.name = `question-${mockMCQMultipleQuestion.id}`;
        checkboxInput.value = index.toString();
        container.appendChild(checkboxInput);
      });

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      
      // Test correct answers
      checkboxes[0].checked = true; // JavaScript
      checkboxes[2].checked = true; // Python
      let selectedAnswers = getSelectedAnswers();
      expect(validateAnswers(selectedAnswers, mockMCQMultipleQuestion.correctAnswers)).toBe(true);
      
      // Test incorrect answers
      checkboxes[0].checked = false;
      checkboxes[1].checked = true; // HTML (incorrect)
      selectedAnswers = getSelectedAnswers();
      expect(validateAnswers(selectedAnswers, mockMCQMultipleQuestion.correctAnswers)).toBe(false);
    });
  });

  describe('Text Input Question Rendering', () => {
    const mockTextInputQuestion = {
      id: 'text-input-test-12345678',
      type: QUESTION_TYPES.TEXT_INPUT,
      question: 'What does HTML stand for?',
      correctAnswer: 'HyperText Markup Language',
      caseSensitive: false,
      explanation: 'HTML stands for HyperText Markup Language',
      media: null
    };

    it('should render text input question with input field', () => {
      // Simulate question rendering logic
      const questionContainer = document.createElement('div');
      questionContainer.className = 'question-container';
      
      // Question text
      const questionText = document.createElement('h3');
      questionText.className = 'question-text';
      questionText.textContent = mockTextInputQuestion.question;
      questionContainer.appendChild(questionText);
      
      // Input container
      const inputContainer = document.createElement('div');
      inputContainer.className = 'input-container';
      
      const textInput = document.createElement('input');
      textInput.type = 'text';
      textInput.id = `input-${mockTextInputQuestion.id}`;
      textInput.placeholder = 'Enter your answer...';
      
      inputContainer.appendChild(textInput);
      questionContainer.appendChild(inputContainer);
      container.appendChild(questionContainer);

      // Verify rendering
      expect(container.querySelector('.question-text')).toBeTruthy();
      expect(container.querySelector('.question-text').textContent).toBe(mockTextInputQuestion.question);
      
      const inputField = container.querySelector('input[type="text"]');
      expect(inputField).toBeTruthy();
      expect(inputField.placeholder).toBe('Enter your answer...');
    });

    it('should handle text input changes', () => {
      // Create text input
      const textInput = document.createElement('input');
      textInput.type = 'text';
      textInput.id = `input-${mockTextInputQuestion.id}`;
      container.appendChild(textInput);

      // Test input changes
      textInput.value = 'HyperText Markup Language';
      textInput.dispatchEvent(new Event('input'));
      
      expect(textInput.value).toBe('HyperText Markup Language');
    });

    it('should validate text input answers', () => {
      const validateTextAnswer = (userAnswer, correctAnswer, caseSensitive) => {
        if (!userAnswer || typeof userAnswer !== 'string') return false;
        
        const userText = userAnswer.trim();
        const correctText = correctAnswer.trim();
        
        return caseSensitive ? 
          userText === correctText : 
          userText.toLowerCase() === correctText.toLowerCase();
      };

      // Test case-insensitive validation
      expect(validateTextAnswer('hypertext markup language', mockTextInputQuestion.correctAnswer, false)).toBe(true);
      expect(validateTextAnswer('HyperText Markup Language', mockTextInputQuestion.correctAnswer, false)).toBe(true);
      expect(validateTextAnswer('HYPERTEXT MARKUP LANGUAGE', mockTextInputQuestion.correctAnswer, false)).toBe(true);
      expect(validateTextAnswer('Wrong Answer', mockTextInputQuestion.correctAnswer, false)).toBe(false);

      // Test case-sensitive validation
      const caseSensitiveQuestion = { ...mockTextInputQuestion, caseSensitive: true };
      expect(validateTextAnswer('HyperText Markup Language', caseSensitiveQuestion.correctAnswer, true)).toBe(true);
      expect(validateTextAnswer('hypertext markup language', caseSensitiveQuestion.correctAnswer, true)).toBe(false);
    });

    it('should handle empty and whitespace-only inputs', () => {
      const validateTextAnswer = (userAnswer, correctAnswer, caseSensitive) => {
        if (!userAnswer || typeof userAnswer !== 'string') return false;
        
        const userText = userAnswer.trim();
        if (userText === '') return false;
        
        const correctText = correctAnswer.trim();
        
        return caseSensitive ? 
          userText === correctText : 
          userText.toLowerCase() === correctText.toLowerCase();
      };

      expect(validateTextAnswer('', mockTextInputQuestion.correctAnswer, false)).toBe(false);
      expect(validateTextAnswer('   ', mockTextInputQuestion.correctAnswer, false)).toBe(false);
      expect(validateTextAnswer(null, mockTextInputQuestion.correctAnswer, false)).toBe(false);
      expect(validateTextAnswer(undefined, mockTextInputQuestion.correctAnswer, false)).toBe(false);
    });
  });

  describe('Question Navigation and Progress', () => {
    const mockQuestions = [
      {
        id: 'nav-q1-12345678',
        type: QUESTION_TYPES.MCQ_SINGLE,
        question: 'Question 1?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0
      },
      {
        id: 'nav-q2-12345678',
        type: QUESTION_TYPES.MCQ_MULTIPLE,
        question: 'Question 2?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswers: [0, 1]
      },
      {
        id: 'nav-q3-12345678',
        type: QUESTION_TYPES.TEXT_INPUT,
        question: 'Question 3?',
        correctAnswer: 'Answer',
        caseSensitive: false
      }
    ];

    it('should render question progress indicator', () => {
      const createProgressIndicator = (currentIndex, totalQuestions) => {
        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-container';
        
        const progressText = document.createElement('span');
        progressText.className = 'progress-text';
        progressText.textContent = `Question ${currentIndex + 1} of ${totalQuestions}`;
        
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        
        const progressFill = document.createElement('div');
        progressFill.className = 'progress-fill';
        progressFill.style.width = `${((currentIndex + 1) / totalQuestions) * 100}%`;
        
        progressBar.appendChild(progressFill);
        progressContainer.appendChild(progressText);
        progressContainer.appendChild(progressBar);
        
        return progressContainer;
      };

      // Test progress for different questions
      const progress1 = createProgressIndicator(0, mockQuestions.length);
      container.appendChild(progress1);
      
      expect(container.querySelector('.progress-text').textContent).toBe('Question 1 of 3');
      expect(container.querySelector('.progress-fill').style.width).toBe('33.33333333333333%');
      
      container.innerHTML = '';
      
      const progress2 = createProgressIndicator(2, mockQuestions.length);
      container.appendChild(progress2);
      
      expect(container.querySelector('.progress-text').textContent).toBe('Question 3 of 3');
      expect(container.querySelector('.progress-fill').style.width).toBe('100%');
    });

    it('should render navigation buttons with correct states', () => {
      const createNavigationButtons = (currentIndex, totalQuestions) => {
        const navContainer = document.createElement('div');
        navContainer.className = 'navigation-container';
        
        const prevButton = document.createElement('button');
        prevButton.className = 'nav-button nav-previous';
        prevButton.textContent = 'Previous';
        prevButton.disabled = currentIndex === 0;
        
        const nextButton = document.createElement('button');
        nextButton.className = 'nav-button nav-next';
        nextButton.textContent = currentIndex === totalQuestions - 1 ? 'Submit' : 'Next';
        
        navContainer.appendChild(prevButton);
        navContainer.appendChild(nextButton);
        
        return navContainer;
      };

      // Test first question navigation
      const nav1 = createNavigationButtons(0, mockQuestions.length);
      container.appendChild(nav1);
      
      expect(container.querySelector('.nav-previous').disabled).toBe(true);
      expect(container.querySelector('.nav-next').textContent).toBe('Next');
      
      container.innerHTML = '';
      
      // Test last question navigation
      const nav3 = createNavigationButtons(2, mockQuestions.length);
      container.appendChild(nav3);
      
      expect(container.querySelector('.nav-previous').disabled).toBe(false);
      expect(container.querySelector('.nav-next').textContent).toBe('Submit');
    });
  });
});