// Deployment Configuration
export const deployConfig = {
  // GitHub Pages specific settings
  githubPages: {
    // Repository name (update this to match your repository)
    repoName: 'QuizMaker',
    // GitHub username (update this to match your username)
    username: 'JeanKevin56',
    // Branch to deploy from
    sourceBranch: 'main',
    // Branch to deploy to (GitHub Pages)
    targetBranch: 'gh-pages',
    // Custom domain (optional)
    customDomain: null, // e.g., 'quiz.yourdomain.com'
  },
  
  // Build settings
  build: {
    // Output directory
    outDir: 'dist',
    // Base URL for assets
    publicPath: '/QuizMaker/',
    // Enable source maps in production
    sourcemap: false,
    // Enable minification
    minify: true,
  },
  
  // Environment-specific settings
  environments: {
    development: {
      apiEndpoint: 'http://localhost:3000',
      enableDebug: true,
      enableConsole: true,
    },
    production: {
      apiEndpoint: 'https://JeanKevin56.github.io/',
      enableDebug: false,
      enableConsole: false,
    },
  },
  
  // Feature flags
  features: {
    // Enable service worker for offline functionality
    serviceWorker: true,
    // Enable PWA features
    pwa: true,
    // Enable analytics (set to your analytics ID)
    analytics: null,
  },
  
  // Security settings
  security: {
    // Content Security Policy
    csp: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", 'https://generativelanguage.googleapis.com'],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'blob:'],
      'connect-src': ["'self'", 'https://generativelanguage.googleapis.com'],
      'font-src': ["'self'"],
      'object-src': ["'none'"],
      'media-src': ["'self'"],
      'frame-src': ["'none'"],
    },
  },
};

export default deployConfig;