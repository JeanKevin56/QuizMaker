#!/usr/bin/env node

/**
 * Simplified build optimization script
 * Performs only essential optimizations to avoid timeouts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '../dist');

/**
 * Main optimization function - simplified
 */
async function optimize() {
    console.log('🚀 Starting simplified build optimization...');
    
    try {
        // Check if dist directory exists
        if (!fs.existsSync(DIST_DIR)) {
            console.error('❌ Dist directory not found. Run build first.');
            process.exit(1);
        }
        
        // Run only essential optimizations
        await generateBasicManifest();
        await logBundleSize();
        
        console.log('✅ Simplified build optimization completed!');
        
    } catch (error) {
        console.error('❌ Build optimization failed:', error);
        // Don't exit with error to avoid breaking deployment
        console.log('⚠️  Continuing deployment despite optimization issues...');
    }
}

/**
 * Generate basic web app manifest
 */
async function generateBasicManifest() {
    console.log('📱 Generating basic manifest...');
    
    const manifest = {
        name: 'Quiz Platform',
        short_name: 'QuizApp',
        description: 'AI-powered quiz platform',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#2563eb',
        icons: [
            {
                src: '/favicon.ico',
                sizes: '32x32',
                type: 'image/x-icon'
            }
        ]
    };
    
    fs.writeFileSync(
        path.join(DIST_DIR, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
    );
    
    console.log('✅ Basic manifest generated');
}

/**
 * Log bundle size without detailed analysis
 */
async function logBundleSize() {
    console.log('📊 Checking bundle size...');
    
    try {
        const stats = fs.statSync(DIST_DIR);
        console.log(`📦 Dist directory exists`);
        
        // Count files without detailed analysis
        const files = fs.readdirSync(DIST_DIR);
        console.log(`📄 Found ${files.length} files in dist`);
        
    } catch (error) {
        console.warn('⚠️  Could not analyze bundle size:', error.message);
    }
    
    console.log('✅ Bundle check completed');
}

// Run optimization if called directly
if (process.argv[1] && process.argv[1].endsWith('build-optimize-simple.js')) {
    optimize();
}

export { optimize };