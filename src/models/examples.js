/**
 * Example usage of Quiz Platform data models
 * This file demonstrates how to create and validate data models
 */

import {
  QUESTION_TYPES,
  THEMES,
  generateId,
  isValidQuiz,
  isValidQuestion,
  isValidResult,
  isValidUserPreferences,
  isAnswerCorrect,
  calculateScore,
  createDefaultQuizSettings,
  createDefaultUserPreferences,
  sanitizeQuestion
} from './index.js';

/**
 * Example: Creating a multiple choice single question
 */
export function createExampleMCQSingleQuestion() {
  return {
    id: generateId(),
    type: QUESTION_TYPES.MCQ_SINGLE,
    question: 'What is the capital of France?',
    explanation: 'Paris is the capital and largest city of France.',
    options: ['London', 'Berlin', 'Paris', 'Madrid'],
    correctAnswer: 2,
    media: {
      type: 'image',
      url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    }
  };
}

/**
 * Example: Creating a multiple choice multiple question
 */
export function createExampleMCQMultipleQuestion() {
  return {
    id: generateId(),
    type: QUESTION_TYPES.MCQ_MULTIPLE,
    question: 'Which of the following are programming languages?',
    explanation: 'JavaScript, Python, and Java are all programming languages, while HTML is a markup language.',
    options: ['JavaScript', 'HTML', 'Python', 'Java'],
    correctAnswers: [0, 2, 3]
  };
}

/**
 * Example: Creating a text input question
 */
export function createExampleTextInputQuestion() {
  return {
    id: generateId(),
    type: QUESTION_TYPES.TEXT_INPUT,
    question: 'What does "AI" stand for?',
    explanation: 'AI stands for Artificial Intelligence, which refers to computer systems that can perform tasks typically requiring human intelligence.',
    correctAnswer: 'Artificial Intelligence',
    caseSensitive: false
  };
}

/**
 * Example: Creating a complete quiz
 */
export function createExampleQuiz() {
  const quiz = {
    id: generateId(),
    title: 'General Knowledge Quiz',
    description: 'A sample quiz covering various topics including geography, programming, and technology.',
    questions: [
      createExampleMCQSingleQuestion(),
      createExampleMCQMultipleQuestion(),
      createExampleTextInputQuestion()
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    settings: {
      shuffleQuestions: true,
      showExplanations: true,
      timeLimit: 10 // 10 minutes
    }
  };

  // Validate the quiz
  if (!isValidQuiz(quiz)) {
    throw new Error('Created quiz is invalid');
  }

  return quiz;
}

/**
 * Example: Creating quiz results
 */
export function createExampleResult(quiz, userAnswers) {
  const answers = quiz.questions.map((question, index) => {
    const userAnswer = userAnswers[index];
    const isCorrect = isAnswerCorrect(question, userAnswer);
    
    return {
      questionId: question.id,
      userAnswer,
      isCorrect,
      explanation: question.explanation
    };
  });

  const correctCount = answers.filter(answer => answer.isCorrect).length;
  const score = calculateScore(correctCount, quiz.questions.length);

  const result = {
    id: generateId(),
    quizId: quiz.id,
    userId: generateId(), // In real app, this would be the actual user ID
    score,
    totalQuestions: quiz.questions.length,
    answers,
    completedAt: new Date(),
    timeSpent: 300 // 5 minutes in seconds
  };

  // Validate the result
  if (!isValidResult(result)) {
    throw new Error('Created result is invalid');
  }

  return result;
}

/**
 * Example: Creating user preferences
 */
export function createExampleUserPreferences() {
  const preferences = {
    apiKeys: {
      gemini: 'your-gemini-api-key-here'
    },
    preferences: {
      theme: THEMES.DARK,
      defaultQuizSettings: {
        shuffleQuestions: false,
        showExplanations: true,
        timeLimit: 15
      }
    }
  };

  // Validate the preferences
  if (!isValidUserPreferences(preferences)) {
    throw new Error('Created preferences are invalid');
  }

  return preferences;
}

/**
 * Example: Demonstrating question validation and sanitization
 */
export function demonstrateQuestionSafety() {
  // Create a potentially unsafe question
  const unsafeQuestion = {
    id: generateId(),
    type: QUESTION_TYPES.MCQ_SINGLE,
    question: 'What is <script>alert("XSS")</script> in web security?',
    explanation: 'This is a "dangerous" example & test.',
    options: ['Safe code', 'XSS attack', 'Normal HTML', 'CSS styling'],
    correctAnswer: 1
  };

  console.log('Original question:', unsafeQuestion.question);
  console.log('Is valid:', isValidQuestion(unsafeQuestion));

  // Sanitize the question
  const safeQuestion = sanitizeQuestion(unsafeQuestion);
  console.log('Sanitized question:', safeQuestion.question);
  console.log('Sanitized explanation:', safeQuestion.explanation);

  return safeQuestion;
}

/**
 * Example: Complete workflow demonstration
 */
export function demonstrateCompleteWorkflow() {
  console.log('=== Quiz Platform Data Models Demo ===\n');

  // 1. Create a quiz
  console.log('1. Creating a quiz...');
  const quiz = createExampleQuiz();
  console.log(`Created quiz: "${quiz.title}" with ${quiz.questions.length} questions\n`);

  // 2. Simulate user taking the quiz
  console.log('2. Simulating user answers...');
  const userAnswers = [
    2, // Correct answer for MCQ single (Paris)
    [0, 2], // Partially correct for MCQ multiple (missing Java)
    'artificial intelligence' // Correct for text input (case insensitive)
  ];

  // 3. Create results
  console.log('3. Creating quiz results...');
  const result = createExampleResult(quiz, userAnswers);
  console.log(`Quiz completed with score: ${result.score}%`);
  console.log(`Correct answers: ${result.answers.filter(a => a.isCorrect).length}/${result.totalQuestions}\n`);

  // 4. Create user preferences
  console.log('4. Creating user preferences...');
  const preferences = createExampleUserPreferences();
  console.log(`Theme: ${preferences.preferences.theme}`);
  console.log(`Default time limit: ${preferences.preferences.defaultQuizSettings.timeLimit} minutes\n`);

  // 5. Demonstrate safety features
  console.log('5. Demonstrating question sanitization...');
  demonstrateQuestionSafety();

  return {
    quiz,
    result,
    preferences
  };
}

// Export default demonstration function
export default demonstrateCompleteWorkflow;