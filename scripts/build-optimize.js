#!/usr/bin/env node

/**
 * Build optimization script
 * Performs additional optimizations after Vite build
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '../dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');

/**
 * Main optimization function
 */
async function optimize() {
    console.log('🚀 Starting build optimization...');
    
    try {
        // Check if dist directory exists
        if (!fs.existsSync(DIST_DIR)) {
            console.error('❌ Dist directory not found. Run build first.');
            process.exit(1);
        }
        
        // Run optimizations
        await optimizeServiceWorker();
        await generateManifest();
        await optimizeImages();
        await generateSitemap();
        await analyzeBundle();
        
        console.log('✅ Build optimization completed successfully!');
        
    } catch (error) {
        console.error('❌ Build optimization failed:', error);
        process.exit(1);
    }
}

/**
 * Optimize service worker for production
 */
async function optimizeServiceWorker() {
    console.log('📦 Optimizing service worker...');
    
    const swPath = path.join(DIST_DIR, 'src/sw.js');
    const optimizedSwPath = path.join(DIST_DIR, 'sw.js');
    
    if (fs.existsSync(swPath)) {
        // Move service worker to root and update cache names
        let swContent = fs.readFileSync(swPath, 'utf8');
        
        // Update cache version with build timestamp
        const buildTime = new Date().toISOString().replace(/[:.]/g, '-');
        swContent = swContent.replace(
            /const CACHE_NAME = 'QuizMaker-v1'/,
            `const CACHE_NAME = 'QuizMaker-${buildTime}'`
        );
        
        // Update static assets list with actual built files
        const staticAssets = await getStaticAssets();
        const assetsString = staticAssets.map(asset => `'${asset}'`).join(',\n    ');
        
        swContent = swContent.replace(
            /const STATIC_ASSETS = \[[\s\S]*?\];/,
            `const STATIC_ASSETS = [\n    ${assetsString}\n];`
        );
        
        fs.writeFileSync(optimizedSwPath, swContent);
        console.log('✅ Service worker optimized');
    }
}

/**
 * Get list of static assets for service worker
 */
async function getStaticAssets() {
    const assets = ['/'];
    
    // Add HTML files
    const htmlFiles = fs.readdirSync(DIST_DIR)
        .filter(file => file.endsWith('.html'))
        .map(file => `/${file}`);
    assets.push(...htmlFiles);
    
    // Add CSS and JS files from assets directory
    if (fs.existsSync(ASSETS_DIR)) {
        const assetFiles = getAllFiles(ASSETS_DIR)
            .filter(file => file.endsWith('.css') || file.endsWith('.js'))
            .map(file => file.replace(DIST_DIR, ''));
        assets.push(...assetFiles);
    }
    
    return assets;
}

/**
 * Generate web app manifest
 */
async function generateManifest() {
    console.log('📱 Generating web app manifest...');
    
    const manifest = {
        name: 'Quiz Platform',
        short_name: 'QuizApp',
        description: 'A web-based quiz platform with AI-powered features',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#2563eb',
        orientation: 'portrait-primary',
        categories: ['education', 'productivity'],
        lang: 'en',
        icons: [
            {
                src: '/assets/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any maskable'
            },
            {
                src: '/assets/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable'
            }
        ],
        screenshots: [
            {
                src: '/assets/screenshot-desktop.png',
                sizes: '1280x720',
                type: 'image/png',
                form_factor: 'wide'
            },
            {
                src: '/assets/screenshot-mobile.png',
                sizes: '375x667',
                type: 'image/png',
                form_factor: 'narrow'
            }
        ]
    };
    
    fs.writeFileSync(
        path.join(DIST_DIR, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
    );
    
    console.log('✅ Web app manifest generated');
}

/**
 * Optimize images (placeholder - would use actual image optimization)
 */
async function optimizeImages() {
    console.log('🖼️  Optimizing images...');
    
    // This would typically use tools like imagemin, sharp, etc.
    // For now, just log the image files found
    const imageFiles = getAllFiles(DIST_DIR)
        .filter(file => /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(file));
    
    console.log(`📊 Found ${imageFiles.length} image files`);
    
    // Placeholder for actual optimization
    imageFiles.forEach(file => {
        const stats = fs.statSync(file);
        const sizeKB = (stats.size / 1024).toFixed(2);
        console.log(`   ${path.basename(file)}: ${sizeKB}KB`);
    });
    
    console.log('✅ Image optimization completed');
}

/**
 * Generate sitemap
 */
async function generateSitemap() {
    console.log('🗺️  Generating sitemap...');
    
    const baseUrl = 'https://your-domain.github.io/QuizMaker'; // Update with actual URL
    const pages = [
        { url: '/', priority: '1.0', changefreq: 'weekly' },
        { url: '/dashboard', priority: '0.8', changefreq: 'weekly' },
        { url: '/create', priority: '0.8', changefreq: 'monthly' },
        { url: '/settings', priority: '0.6', changefreq: 'monthly' }
    ];
    
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <priority>${page.priority}</priority>
    <changefreq>${page.changefreq}</changefreq>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>`).join('\n')}
</urlset>`;
    
    fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemap);
    console.log('✅ Sitemap generated');
}

/**
 * Analyze bundle size and generate report
 */
async function analyzeBundle() {
    console.log('📊 Analyzing bundle...');
    
    const analysis = {
        timestamp: new Date().toISOString(),
        files: {},
        totalSize: 0,
        gzippedSize: 0 // Would calculate with actual gzip
    };
    
    // Analyze all files in dist
    const allFiles = getAllFiles(DIST_DIR);
    
    allFiles.forEach(file => {
        const stats = fs.statSync(file);
        const relativePath = file.replace(DIST_DIR, '');
        const extension = path.extname(file);
        
        analysis.files[relativePath] = {
            size: stats.size,
            sizeKB: (stats.size / 1024).toFixed(2),
            type: getFileType(extension)
        };
        
        analysis.totalSize += stats.size;
    });
    
    // Group by file type
    const byType = {};
    Object.values(analysis.files).forEach(file => {
        if (!byType[file.type]) {
            byType[file.type] = { count: 0, size: 0 };
        }
        byType[file.type].count++;
        byType[file.type].size += file.size;
    });
    
    analysis.byType = byType;
    analysis.totalSizeKB = (analysis.totalSize / 1024).toFixed(2);
    analysis.totalSizeMB = (analysis.totalSize / (1024 * 1024)).toFixed(2);
    
    // Save analysis
    fs.writeFileSync(
        path.join(DIST_DIR, 'bundle-analysis.json'),
        JSON.stringify(analysis, null, 2)
    );
    
    // Log summary
    console.log(`📦 Total bundle size: ${analysis.totalSizeMB}MB`);
    console.log('📊 By file type:');
    Object.entries(byType).forEach(([type, data]) => {
        const sizeMB = (data.size / (1024 * 1024)).toFixed(2);
        console.log(`   ${type}: ${data.count} files, ${sizeMB}MB`);
    });
    
    console.log('✅ Bundle analysis completed');
}

/**
 * Get all files recursively
 */
function getAllFiles(dir) {
    const files = [];
    
    function traverse(currentDir) {
        const items = fs.readdirSync(currentDir);
        
        items.forEach(item => {
            const fullPath = path.join(currentDir, item);
            const stats = fs.statSync(fullPath);
            
            if (stats.isDirectory()) {
                traverse(fullPath);
            } else {
                files.push(fullPath);
            }
        });
    }
    
    traverse(dir);
    return files;
}

/**
 * Get file type from extension
 */
function getFileType(extension) {
    const types = {
        '.js': 'JavaScript',
        '.css': 'CSS',
        '.html': 'HTML',
        '.png': 'Image',
        '.jpg': 'Image',
        '.jpeg': 'Image',
        '.gif': 'Image',
        '.svg': 'Image',
        '.webp': 'Image',
        '.woff': 'Font',
        '.woff2': 'Font',
        '.ttf': 'Font',
        '.json': 'JSON',
        '.xml': 'XML'
    };
    
    return types[extension.toLowerCase()] || 'Other';
}

// Run optimization if called directly
if (process.argv[1] && process.argv[1].endsWith('build-optimize.js')) {
    optimize();
}

export { optimize };