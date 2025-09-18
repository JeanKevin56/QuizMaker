/**
 * AI Quiz Generation Service
 * Uses Google Gemini API to generate quiz questions from content
 */

import { GeminiAPIService } from './GeminiAPIService.js';
import { QUESTION_TYPES } from '../models/types.js';
import { validateQuestion } from '../models/validation.js';

/**
 * Quiz generation templates and prompts
 */
const GENERATION_PROMPTS = {
  MULTIPLE_CHOICE: `Generate multiple choice questions from the following content. 

Content:
{content}

Requirements:
- Generate {questionCount} multiple choice questions
- Each question should have exactly 4 options (A, B, C, D)
- Only one correct answer per question
- Include clear explanations for correct answers
- Questions should test understanding, not just memorization
- Vary difficulty levels appropriately

Format your response as valid JSON with this exact structure:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Explanation of why this answer is correct"
    }
  ]
}

Important: Return ONLY the JSON, no additional text or formatting.`,

  MIXED_QUESTIONS: `Generate a mix of question types from the following content.

Content:
{content}

Requirements:
- Generate {questionCount} questions total
- Include multiple choice (single answer), multiple choice (multiple answers), and text input questions
- Distribute question types evenly
- Each multiple choice question should have 4 options
- Text input questions should have clear, specific answers
- Include explanations for all questions
- Test different levels of understanding

Format your response as valid JSON with this exact structure:
{
  "questions": [
    {
      "type": "mcq-single",
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Explanation text"
    },
    {
      "type": "mcq-multiple", 
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswers": [0, 2],
      "explanation": "Explanation text"
    },
    {
      "type": "text-input",
      "question": "Question text?",
      "correctAnswer": "Expected answer",
      "caseSensitive": false,
      "explanation": "Explanation text"
    }
  ]
}

Important: Return ONLY the JSON, no additional text or formatting.`,

  TEXT_INPUT: `Generate text input questions from the following content.

Content:
{content}

Requirements:
- Generate {questionCount} text input questions
- Questions should have specific, clear answers
- Avoid overly subjective questions
- Include explanations
- Mix short answer and fill-in-the-blank style questions

Format your response as valid JSON with this exact structure:
{
  "questions": [
    {
      "question": "Question text here?",
      "correctAnswer": "Expected answer",
      "caseSensitive": false,
      "explanation": "Explanation of the answer"
    }
  ]
}

Important: Return ONLY the JSON, no additional text or formatting.`
};

/**
 * AI Quiz Generator Class
 */
export class AIQuizGenerator {
  constructor() {
    this.geminiService = new GeminiAPIService();
    this.maxContentLength = 8000; // Character limit for content
    this.maxQuestions = 20;
    this.minQuestions = 1;
  }

  /**
   * Generate quiz questions from text content
   * @param {string} content - Source content for questions
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Generated questions and metadata
   */
  async generateQuestions(content, options = {}) {
    try {
      // Validate and prepare content
      const processedContent = this.preprocessContent(content);
      if (!processedContent) {
        throw new Error('Content is empty or invalid');
      }

      // Validate options
      const validatedOptions = this.validateOptions(options);
      
      // Generate questions using AI
      const prompt = this.buildPrompt(processedContent, validatedOptions);
      const aiResponse = await this.geminiService.makeRequest({
        contents: [{
          parts: [{ text: prompt }]
        }]
      });

      // Parse and validate AI response
      const generatedQuestions = await this.parseAIResponse(aiResponse);
      
      // Post-process and validate questions
      const processedQuestions = this.postProcessQuestions(generatedQuestions);
      
      return {
        success: true,
        questions: processedQuestions,
        metadata: {
          sourceContentLength: content.length,
          processedContentLength: processedContent.length,
          requestedCount: validatedOptions.questionCount,
          generatedCount: processedQuestions.length,
          questionTypes: validatedOptions.questionTypes,
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Quiz generation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate questions',
        questions: [],
        metadata: null
      };
    }
  }

  /**
   * Preprocess content for AI generation
   * @param {string} content - Raw content
   * @returns {string} - Processed content
   * @private
   */
  preprocessContent(content) {
    if (!content || typeof content !== 'string') {
      return '';
    }

    let processed = content
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove special characters that might confuse AI
      .replace(/[^\w\s.,!?;:()\-"']/g, ' ')
      // Normalize line breaks
      .replace(/\n+/g, '\n')
      .trim();

    // Truncate if too long
    if (processed.length > this.maxContentLength) {
      processed = processed.substring(0, this.maxContentLength);
      // Try to end at a sentence boundary
      const lastSentence = processed.lastIndexOf('.');
      if (lastSentence > this.maxContentLength * 0.8) {
        processed = processed.substring(0, lastSentence + 1);
      }
    }

    return processed;
  }

  /**
   * Validate and normalize generation options
   * @param {Object} options - Raw options
   * @returns {Object} - Validated options
   * @private
   */
  validateOptions(options) {
    const defaults = {
      questionCount: 5,
      questionTypes: ['mcq-single'],
      difficulty: 'mixed'
    };

    const validated = { ...defaults, ...options };

    // Validate question count
    validated.questionCount = Math.max(
      this.minQuestions,
      Math.min(this.maxQuestions, parseInt(validated.questionCount) || defaults.questionCount)
    );

    // Validate question types
    if (!Array.isArray(validated.questionTypes) || validated.questionTypes.length === 0) {
      validated.questionTypes = defaults.questionTypes;
    }

    // Filter valid question types
    validated.questionTypes = validated.questionTypes.filter(type => 
      Object.values(QUESTION_TYPES).includes(type)
    );

    if (validated.questionTypes.length === 0) {
      validated.questionTypes = defaults.questionTypes;
    }

    return validated;
  }

  /**
   * Build AI prompt based on options
   * @param {string} content - Processed content
   * @param {Object} options - Validated options
   * @returns {string} - Complete prompt
   * @private
   */
  buildPrompt(content, options) {
    let template;

    // Select appropriate template
    if (options.questionTypes.length === 1) {
      switch (options.questionTypes[0]) {
        case QUESTION_TYPES.MCQ_SINGLE:
          template = GENERATION_PROMPTS.MULTIPLE_CHOICE;
          break;
        case QUESTION_TYPES.TEXT_INPUT:
          template = GENERATION_PROMPTS.TEXT_INPUT;
          break;
        default:
          template = GENERATION_PROMPTS.MIXED_QUESTIONS;
      }
    } else {
      template = GENERATION_PROMPTS.MIXED_QUESTIONS;
    }

    // Replace placeholders
    return template
      .replace('{content}', content)
      .replace('{questionCount}', options.questionCount);
  }

  /**
   * Parse AI response and extract questions
   * @param {Object} aiResponse - Raw AI response
   * @returns {Array} - Parsed questions
   * @private
   */
  async parseAIResponse(aiResponse) {
    try {
      const responseText = this.geminiService.extractTextFromResponse(aiResponse);
      
      // Clean up response text (remove markdown formatting, etc.)
      const cleanedText = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      // Parse JSON
      const parsed = JSON.parse(cleanedText);
      
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Invalid response format: missing questions array');
      }

      return parsed.questions;

    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error('Failed to parse AI response. Please try again.');
    }
  }

  /**
   * Post-process and validate generated questions
   * @param {Array} questions - Raw generated questions
   * @returns {Array} - Validated and processed questions
   * @private
   */
  postProcessQuestions(questions) {
    const processed = [];

    for (let i = 0; i < questions.length; i++) {
      try {
        const question = this.processSingleQuestion(questions[i], i);
        if (question) {
          processed.push(question);
        }
      } catch (error) {
        console.warn(`Skipping invalid question ${i + 1}:`, error.message);
      }
    }

    return processed;
  }

  /**
   * Process and validate a single question
   * @param {Object} rawQuestion - Raw question from AI
   * @param {number} index - Question index
   * @returns {Object} - Processed question
   * @private
   */
  processSingleQuestion(rawQuestion, index) {
    // Generate unique ID
    const id = `ai_q_${Date.now()}_${index}`;
    
    // Determine question type
    let type = rawQuestion.type || QUESTION_TYPES.MCQ_SINGLE;
    if (!Object.values(QUESTION_TYPES).includes(type)) {
      type = QUESTION_TYPES.MCQ_SINGLE;
    }

    // Build question object based on type
    let question = {
      id,
      type,
      question: this.cleanQuestionText(rawQuestion.question),
      explanation: this.cleanExplanationText(rawQuestion.explanation)
    };

    // Add type-specific properties
    switch (type) {
      case QUESTION_TYPES.MCQ_SINGLE:
        question.options = this.validateOptions(rawQuestion.options);
        question.correctAnswer = this.validateCorrectAnswer(rawQuestion.correctAnswer, question.options.length);
        break;

      case QUESTION_TYPES.MCQ_MULTIPLE:
        question.options = this.validateOptions(rawQuestion.options);
        question.correctAnswers = this.validateCorrectAnswers(rawQuestion.correctAnswers, question.options.length);
        break;

      case QUESTION_TYPES.TEXT_INPUT:
        question.correctAnswer = this.cleanAnswerText(rawQuestion.correctAnswer);
        question.caseSensitive = Boolean(rawQuestion.caseSensitive);
        break;
    }

    // Validate the complete question
    const validation = validateQuestion(question);
    if (!validation.isValid) {
      throw new Error(`Question validation failed: ${validation.errors.join(', ')}`);
    }

    return question;
  }

  /**
   * Clean and validate question text
   * @param {string} text - Raw question text
   * @returns {string} - Cleaned text
   * @private
   */
  cleanQuestionText(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('Question text is required');
    }

    const cleaned = text.trim();
    if (cleaned.length < 10) {
      throw new Error('Question text is too short');
    }

    return cleaned;
  }

  /**
   * Clean and validate explanation text
   * @param {string} text - Raw explanation text
   * @returns {string} - Cleaned text
   * @private
   */
  cleanExplanationText(text) {
    if (!text || typeof text !== 'string') {
      return 'No explanation provided.';
    }

    return text.trim() || 'No explanation provided.';
  }

  /**
   * Clean and validate answer text
   * @param {string} text - Raw answer text
   * @returns {string} - Cleaned text
   * @private
   */
  cleanAnswerText(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('Answer text is required');
    }

    const cleaned = text.trim();
    if (cleaned.length === 0) {
      throw new Error('Answer cannot be empty');
    }

    return cleaned;
  }

  /**
   * Validate multiple choice options
   * @param {Array} options - Raw options array
   * @returns {Array} - Validated options
   * @private
   */
  validateOptions(options) {
    if (!Array.isArray(options) || options.length < 2) {
      throw new Error('At least 2 options are required');
    }

    const cleaned = options
      .map(opt => typeof opt === 'string' ? opt.trim() : '')
      .filter(opt => opt.length > 0);

    if (cleaned.length < 2) {
      throw new Error('At least 2 valid options are required');
    }

    return cleaned;
  }

  /**
   * Validate single correct answer index
   * @param {number} answer - Answer index
   * @param {number} optionCount - Number of options
   * @returns {number} - Validated answer index
   * @private
   */
  validateCorrectAnswer(answer, optionCount) {
    const index = parseInt(answer);
    if (isNaN(index) || index < 0 || index >= optionCount) {
      throw new Error('Invalid correct answer index');
    }
    return index;
  }

  /**
   * Validate multiple correct answer indices
   * @param {Array} answers - Answer indices array
   * @param {number} optionCount - Number of options
   * @returns {Array} - Validated answer indices
   * @private
   */
  validateCorrectAnswers(answers, optionCount) {
    if (!Array.isArray(answers) || answers.length === 0) {
      throw new Error('At least one correct answer is required');
    }

    const validated = answers
      .map(ans => parseInt(ans))
      .filter(ans => !isNaN(ans) && ans >= 0 && ans < optionCount);

    if (validated.length === 0) {
      throw new Error('No valid correct answers provided');
    }

    // Remove duplicates and sort
    return [...new Set(validated)].sort();
  }

  /**
   * Get generation capabilities and limits
   * @returns {Object} - Service capabilities
   */
  getCapabilities() {
    return {
      maxContentLength: this.maxContentLength,
      maxQuestions: this.maxQuestions,
      minQuestions: this.minQuestions,
      supportedTypes: Object.values(QUESTION_TYPES),
      apiKeyStatus: this.geminiService.getAPIKeyStatus()
    };
  }

  /**
   * Test AI service connectivity
   * @returns {Promise<boolean>} - True if service is available
   */
  async testConnection() {
    try {
      const testResponse = await this.geminiService.makeRequest({
        contents: [{
          parts: [{ text: 'Hello, please respond with "OK"' }]
        }]
      });

      const responseText = this.geminiService.extractTextFromResponse(testResponse);
      return responseText.toLowerCase().includes('ok');
    } catch (error) {
      console.error('AI service test failed:', error);
      return false;
    }
  }
}