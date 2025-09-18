# Quiz Platform User Guide

Welcome to the Quiz Platform! This guide will help you get started with creating, taking, and managing quizzes.

## Table of Contents

- [Getting Started](#getting-started)
- [Taking Quizzes](#taking-quizzes)
- [Creating Quizzes](#creating-quizzes)
- [AI-Powered Features](#ai-powered-features)
- [Managing Your Data](#managing-your-data)
- [Settings and Preferences](#settings-and-preferences)
- [Troubleshooting](#troubleshooting)

## Getting Started

### First Time Setup

1. **Open the Quiz Platform** in your web browser
2. **Configure API Settings** (optional but recommended):
   - Click the Settings icon (⚙️) in the top navigation
   - Enter your Google Gemini API key for AI features
   - Get a free API key at [Google AI Studio](https://makersuite.google.com/app/apikey)

### System Requirements

- **Modern web browser** (Chrome, Firefox, Safari, Edge)
- **JavaScript enabled**
- **Local storage** enabled for saving data
- **Internet connection** for AI features (optional for basic quiz taking)

## Taking Quizzes

### Starting a Quiz

1. **Browse available quizzes** on the dashboard
2. **Click "Take Quiz"** on any quiz card
3. **Read the instructions** and click "Start"

### Question Types

The platform supports three types of questions:

#### Multiple Choice (Single Answer)
- **Select one option** from the available choices
- **Click the radio button** next to your answer
- Only one answer can be selected

#### Multiple Choice (Multiple Answers)
- **Select multiple options** from the available choices
- **Check the boxes** next to your answers
- Multiple answers can be selected

#### Text Input
- **Type your answer** in the text field
- **Case sensitivity** may apply (check question instructions)
- **Exact matches** are typically required

### Navigation

- **Next/Previous**: Use arrow buttons to navigate between questions
- **Progress Bar**: Shows your completion progress
- **Question Counter**: Displays current question number
- **Timer**: Shows remaining time (if enabled)

### Submitting Answers

1. **Answer all questions** (or as many as you can)
2. **Click "Submit Quiz"** when finished
3. **Confirm submission** in the dialog box
4. **View your results** immediately

## Creating Quizzes

### Manual Quiz Creation

#### Step 1: Basic Information
1. **Click "Create Quiz"** on the dashboard
2. **Enter quiz title** and description
3. **Configure settings**:
   - Shuffle questions: Randomize question order
   - Show explanations: Display explanations after submission
   - Time limit: Set maximum time (optional)

#### Step 2: Adding Questions
1. **Click "Add Question"**
2. **Select question type**:
   - Multiple Choice (Single)
   - Multiple Choice (Multiple)
   - Text Input
3. **Enter question text**
4. **Add answer options** (for multiple choice)
5. **Mark correct answers**
6. **Add explanation** (optional but recommended)

#### Step 3: Adding Media
1. **Click the image icon** in the question editor
2. **Select an image file** (JPG, PNG, GIF)
3. **Preview the image** before saving
4. **Adjust image size** if needed

#### Step 4: Save and Test
1. **Click "Save Quiz"** when finished
2. **Test your quiz** by taking it yourself
3. **Edit if needed** using the quiz management tools

### AI-Powered Quiz Creation

#### From PDF Documents
1. **Click "Generate from PDF"**
2. **Upload your PDF file** (study materials, textbooks, etc.)
3. **Wait for text extraction** (may take a few moments)
4. **Review extracted text** and make edits if needed
5. **Configure generation settings**:
   - Number of questions
   - Question types to include
   - Difficulty level
6. **Click "Generate Quiz"**
7. **Review and edit** the generated questions
8. **Save the quiz**

#### From Text Content
1. **Click "Generate from Text"**
2. **Paste or type your content** in the text area
3. **Follow the same steps** as PDF generation

## AI-Powered Features

### Prerequisites
- **Google Gemini API key** configured in settings
- **Internet connection**
- **Sufficient API quota** (free tier available)

### Quiz Generation
- **Automatic question creation** from study materials
- **Mixed question types** for comprehensive testing
- **Relevant explanations** for each answer
- **Difficulty adjustment** based on content

### AI Explanations
- **Detailed explanations** for incorrect answers
- **Contextual learning** based on source material
- **Educational feedback** to improve understanding

### Best Practices for AI Features
- **Use clear, well-structured** source materials
- **Review generated content** before using
- **Edit questions** to match your specific needs
- **Test quizzes** before sharing with others

## Managing Your Data

### Quiz Management
- **View all quizzes** on the dashboard
- **Search and filter** quizzes by title or date
- **Edit existing quizzes** by clicking the edit icon
- **Duplicate quizzes** to create variations
- **Delete quizzes** you no longer need

### Results and Progress
- **View quiz results** in the Results section
- **Track your progress** over time
- **Review incorrect answers** and explanations
- **Retake quizzes** to improve scores

### Data Export/Import
1. **Export your data**:
   - Go to Settings → Data Management
   - Click "Export All Data"
   - Save the JSON file to your computer

2. **Import data**:
   - Go to Settings → Data Management
   - Click "Import Data"
   - Select your JSON file
   - Confirm the import

### Data Storage
- **All data is stored locally** in your browser
- **No data is sent to external servers** (except AI API calls)
- **Clear browser data** will delete all quizzes and results
- **Regular backups** are recommended

## Settings and Preferences

### API Configuration
- **Gemini API Key**: For AI-powered features
- **API Endpoint**: Custom endpoint (advanced users)
- **Rate Limiting**: Automatic management of API calls

### Appearance
- **Theme**: Light or dark mode
- **Font Size**: Adjust text size for readability
- **Color Scheme**: Customize interface colors

### Default Quiz Settings
- **Question Shuffling**: Default shuffle setting for new quizzes
- **Show Explanations**: Default explanation setting
- **Time Limits**: Default time limit preferences

### Privacy and Data
- **Data Retention**: How long to keep quiz results
- **Analytics**: Enable/disable usage analytics
- **Crash Reporting**: Help improve the platform

## Troubleshooting

### Common Issues

#### Quiz Won't Load
**Possible Causes**:
- Browser compatibility issues
- JavaScript disabled
- Corrupted local storage

**Solutions**:
1. **Refresh the page** and try again
2. **Clear browser cache** and reload
3. **Check browser console** for error messages
4. **Try a different browser**

#### AI Features Not Working
**Possible Causes**:
- Invalid or missing API key
- API quota exceeded
- Network connectivity issues

**Solutions**:
1. **Verify API key** in settings
2. **Check API quota** at Google AI Studio
3. **Test internet connection**
4. **Try again later** if quota exceeded

#### PDF Upload Fails
**Possible Causes**:
- File too large (>10MB limit)
- Corrupted PDF file
- Unsupported PDF format

**Solutions**:
1. **Reduce file size** or split large PDFs
2. **Try a different PDF file**
3. **Convert to text** and use text input instead

#### Data Loss
**Prevention**:
- **Export data regularly** as backup
- **Don't clear browser data** without backing up
- **Use multiple browsers** for redundancy

**Recovery**:
- **Import from backup** if available
- **Check browser history** for cached versions
- **Recreate important quizzes** from source materials

### Performance Issues

#### Slow Loading
- **Clear browser cache**
- **Close unnecessary browser tabs**
- **Check internet connection speed**
- **Disable browser extensions** temporarily

#### Memory Issues
- **Limit quiz size** (fewer than 100 questions recommended)
- **Optimize images** before uploading
- **Close other applications** while using the platform

### Getting Help

If you continue to experience issues:

1. **Check the browser console** for error messages
2. **Try the platform in incognito/private mode**
3. **Test with a different browser or device**
4. **Export your data** before troubleshooting
5. **Contact support** with specific error details

## Tips for Best Results

### Creating Effective Quizzes
- **Write clear, unambiguous questions**
- **Provide meaningful explanations**
- **Use a mix of question types**
- **Test your quizzes** before sharing

### Using AI Features
- **Provide high-quality source materials**
- **Review and edit** AI-generated content
- **Use specific, focused** content for better results
- **Monitor your API usage** to stay within limits

### Managing Your Learning
- **Take quizzes multiple times** to reinforce learning
- **Review explanations** for incorrect answers
- **Create quizzes** on topics you're studying
- **Track your progress** over time

## Advanced Features

### Keyboard Shortcuts
- **Space**: Next question
- **Enter**: Submit answer
- **Escape**: Exit quiz (with confirmation)
- **Tab**: Navigate between options

### URL Parameters
- **Direct quiz access**: `?quiz=quiz-id`
- **Auto-start**: `?quiz=quiz-id&start=true`
- **Debug mode**: `?debug=true`

### Browser Compatibility
- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support
- **Mobile browsers**: Basic support

---

**Need more help?** Check the troubleshooting section or contact support with specific details about your issue.