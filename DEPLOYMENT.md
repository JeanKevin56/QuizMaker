# Deployment Guide

This guide covers how to deploy the Quiz Platform to GitHub Pages and other static hosting services.

## Table of Contents

- [Prerequisites](#prerequisites)
- [GitHub Pages Deployment](#github-pages-deployment)
- [Manual Deployment](#manual-deployment)
- [Environment Configuration](#environment-configuration)
- [Troubleshooting](#troubleshooting)
- [Alternative Hosting Options](#alternative-hosting-options)

## Prerequisites

Before deploying, ensure you have:

1. **Node.js 18+** installed on your development machine
2. **Git** configured with your GitHub account
3. A **GitHub repository** for your project
4. **Google Gemini API key** (free tier available)

## GitHub Pages Deployment

### Automatic Deployment (Recommended)

The project includes GitHub Actions for automatic deployment:

1. **Fork or clone** this repository to your GitHub account

2. **Update configuration** in `deploy.config.js`:
   ```javascript
   githubPages: {
     repoName: 'your-repo-name',
     username: 'your-github-username',
     // ... other settings
   }
   ```

3. **Enable GitHub Pages** in your repository:
   - Go to Settings → Pages
   - Source: "GitHub Actions"
   - Save the settings

4. **Configure secrets** (if using private API keys):
   - Go to Settings → Secrets and variables → Actions
   - Add `GEMINI_API_KEY` if you want to embed it (not recommended)

5. **Push to main branch**:
   ```bash
   git add .
   git commit -m "Configure deployment"
   git push origin main
   ```

6. **Monitor deployment**:
   - Check the "Actions" tab in your repository
   - Deployment typically takes 2-5 minutes
   - Your site will be available at `https://JeanKevin56.github.io/your-repo-name`

### Manual GitHub Pages Setup

If you prefer manual deployment:

1. **Build the project**:
   ```bash
   npm install
   npm run build:prod
   ```

2. **Deploy to gh-pages branch**:
   ```bash
   # Install gh-pages utility
   npm install -g gh-pages
   
   # Deploy
   gh-pages -d dist
   ```

## Manual Deployment

For other static hosting services:

1. **Build the project**:
   ```bash
   npm install
   npm run build:prod
   ```

2. **Upload the `dist` folder** to your hosting service:
   - **Netlify**: Drag and drop the `dist` folder
   - **Vercel**: Connect your GitHub repo or upload manually
   - **Firebase Hosting**: Use `firebase deploy`
   - **AWS S3**: Upload to S3 bucket with static website hosting

## Environment Configuration

### Development Environment

Create a `.env` file in the project root:

```env
# Copy from .env.example and fill in your values
GEMINI_API_KEY=your_actual_api_key_here
```

### Production Environment

For production deployments, you have several options:

#### Option 1: User-Provided API Keys (Recommended)
- Don't include API keys in the build
- Users enter their own API keys in the app settings
- Most secure and cost-effective approach

#### Option 2: Environment Variables
- Set `GEMINI_API_KEY` in your hosting platform's environment variables
- Update `.env.production` with your values

#### Option 3: Build-Time Injection
- Include API keys in the build (not recommended for public repos)
- Use GitHub Secrets for private repositories

### Configuration Files

- **`.env.development`**: Development-specific settings
- **`.env.production`**: Production-specific settings
- **`.env.example`**: Template for environment variables
- **`deploy.config.js`**: Deployment configuration

## Build Scripts

The project includes several build scripts:

```bash
# Development build
npm run build

# Production build with optimizations
npm run build:prod

# Build with bundle analysis
npm run build:analyze

# Clean build directory
npm run clean

# Run tests before building
npm run prebuild
```

## Troubleshooting

### Common Issues

#### 1. Build Fails on GitHub Actions

**Problem**: Build fails with dependency errors
**Solution**:
```bash
# Clear npm cache locally
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Commit the updated package-lock.json
git add package-lock.json
git commit -m "Update package-lock.json"
git push
```

#### 2. 404 Error on GitHub Pages

**Problem**: Site shows 404 error
**Solutions**:
- Check that GitHub Pages is enabled in repository settings
- Verify the base URL in `vite.config.js` matches your repository name
- Ensure the deployment branch is set correctly

#### 3. API Keys Not Working

**Problem**: Gemini API calls fail
**Solutions**:
- Verify API key is valid at [Google AI Studio](https://makersuite.google.com/app/apikey)
- Check browser console for CORS errors
- Ensure API key has proper permissions

#### 4. Large Bundle Size

**Problem**: Build size is too large
**Solutions**:
```bash
# Analyze bundle size
npm run build:analyze

# Run optimization script
npm run optimize
```

#### 5. Service Worker Issues

**Problem**: App doesn't work offline
**Solutions**:
- Check service worker registration in browser dev tools
- Clear browser cache and reload
- Verify service worker file is accessible

### Debug Mode

Enable debug mode for troubleshooting:

1. Set `VITE_ENABLE_DEBUG=true` in your environment
2. Open browser console to see detailed logs
3. Check Network tab for failed requests

## Alternative Hosting Options

### Netlify

1. Connect your GitHub repository
2. Build command: `npm run build:prod`
3. Publish directory: `dist`
4. Environment variables: Add `GEMINI_API_KEY` if needed

### Vercel

1. Import your GitHub repository
2. Framework preset: "Other"
3. Build command: `npm run build:prod`
4. Output directory: `dist`

### Firebase Hosting

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Initialize: `firebase init hosting`
3. Public directory: `dist`
4. Deploy: `firebase deploy`

### AWS S3 + CloudFront

1. Create S3 bucket with static website hosting
2. Upload `dist` folder contents
3. Configure CloudFront distribution
4. Set up custom domain (optional)

## Performance Optimization

The build process includes several optimizations:

- **Code splitting**: Separate chunks for vendors, components, services
- **Asset optimization**: Image compression, CSS minification
- **Tree shaking**: Remove unused code
- **Lazy loading**: Load components on demand
- **Service worker**: Cache resources for offline use

## Security Considerations

- **API Keys**: Never commit API keys to public repositories
- **HTTPS**: Always use HTTPS in production
- **CSP**: Content Security Policy headers are configured
- **CORS**: API calls are restricted to allowed origins

## Monitoring and Analytics

To add analytics:

1. Update `deploy.config.js`:
   ```javascript
   features: {
     analytics: 'your-analytics-id'
   }
   ```

2. The analytics code will be automatically included in production builds

## Support

If you encounter issues:

1. Check the [troubleshooting section](#troubleshooting)
2. Review GitHub Actions logs
3. Check browser console for errors
4. Verify all configuration files are correct

For additional help, create an issue in the repository with:
- Error messages
- Browser and OS information
- Steps to reproduce the problem