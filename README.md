# Quiz Platform

A web-based quiz platform with AI-powered features for educational purposes. Built with modern web technologies and designed to be deployed on static hosting services like GitHub Pages.

## Features

- 🎯 Multiple question types (Multiple Choice, Text Input)
- 🤖 AI-powered quiz generation from PDFs and text
- 📊 Detailed results with AI explanations
- 💾 Client-side data storage (LocalStorage + IndexedDB)
- 📱 Responsive design for all devices
- 🌙 Dark/Light theme support
- 🚀 Fast and lightweight

## Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/username/quiz-platform.git
cd quiz-platform
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests once
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Lint code
- `npm run format` - Format code with Prettier

### Project Structure

```
quiz-platform/
├── src/
│   ├── components/     # Reusable UI components
│   ├── services/       # Business logic and API services
│   ├── styles/         # CSS files and styling
│   ├── assets/         # Images, icons, and static files
│   ├── utils/          # Utility functions
│   ├── test/           # Test setup and utilities
│   └── main.js         # Application entry point
├── index.html          # HTML template
├── vite.config.js      # Vite configuration
└── package.json        # Project dependencies and scripts
```

## Configuration

### AI Integration

The platform uses Google Gemini API for AI features. To use AI functionality:

1. Get a free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Enter your API key in the Settings page of the application

### PDF Processing

PDF text extraction is handled client-side using PDF.js library. No additional configuration required.

## Deployment

### Quick Deploy to GitHub Pages

The easiest way to deploy is using the automated GitHub Actions workflow:

1. **Fork this repository** to your GitHub account
2. **Update configuration** in `deploy.config.js`:
   ```javascript
   githubPages: {
     repoName: 'your-repo-name',
     username: 'your-github-username'
   }
   ```
3. **Enable GitHub Pages** in repository Settings → Pages → Source: "GitHub Actions"
4. **Push to main branch** - deployment happens automatically!

Your site will be available at: `https://your-username.github.io/your-repo-name`

### Manual Deployment

For manual deployment or other hosting services:

```bash
# Build for production
npm run build:prod

# Deploy to GitHub Pages (requires gh-pages package)
npm run deploy

# Or copy the dist/ folder to your hosting service
```

### Supported Hosting Platforms

- **GitHub Pages** (recommended) - Free, automatic deployment
- **Netlify** - Drag and drop the `dist` folder
- **Vercel** - Connect your GitHub repository
- **Firebase Hosting** - Use `firebase deploy`
- **AWS S3** - Upload to S3 bucket with static website hosting

### Environment Configuration

Create environment-specific configurations:

- `.env.development` - Development settings
- `.env.production` - Production settings  
- `.env` - Your personal API keys (not committed to git)

See `DEPLOYMENT.md` for detailed deployment instructions and troubleshooting.

## Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- PDF.js for client-side PDF processing
- Google Gemini for AI capabilities
- Vite for fast development and building