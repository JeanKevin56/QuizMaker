import { defineConfig, loadEnv } from 'vite';
import legacy from '@vitejs/plugin-legacy';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Vite plugin to copy PDF.js worker files to the build output
 * This ensures PDF.js workers are served from the same origin, avoiding CORS issues
 */
function copyPdfjsWorker() {
  return {
    name: 'copy-pdfjs-worker',
    generateBundle(options, bundle) {
      try {
        const outputDir = options.dir || 'dist';
        const assetsDir = join(outputDir, 'assets', 'pdf');
        
        // Ensure the assets/pdf directory exists
        if (!existsSync(assetsDir)) {
          mkdirSync(assetsDir, { recursive: true });
        }

        // Define source and destination paths for worker files
        const workerFiles = [
          {
            src: 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
            dest: join(assetsDir, 'pdf.worker.min.mjs')
          },
          {
            src: 'node_modules/pdfjs-dist/build/pdf.worker.mjs',
            dest: join(assetsDir, 'pdf.worker.mjs')
          },
          {
            src: 'node_modules/pdfjs-dist/build/pdf.worker.mjs.map',
            dest: join(assetsDir, 'pdf.worker.mjs.map')
          }
        ];

        // Copy each worker file
        let copiedFiles = 0;
        for (const { src, dest } of workerFiles) {
          try {
            if (existsSync(src)) {
              copyFileSync(src, dest);
              copiedFiles++;
              console.log(`✓ Copied PDF.js worker: ${src} → ${dest}`);
            } else {
              console.warn(`⚠ PDF.js worker file not found: ${src}`);
            }
          } catch (error) {
            console.error(`✗ Failed to copy PDF.js worker file ${src}:`, error.message);
          }
        }

        if (copiedFiles > 0) {
          console.log(`✓ Successfully copied ${copiedFiles} PDF.js worker files to ${assetsDir}`);
        } else {
          console.error('✗ No PDF.js worker files were copied. PDF processing may not work in production.');
        }

      } catch (error) {
        console.error('✗ PDF.js worker copy plugin failed:', error.message);
        // Don't fail the build, but warn about potential issues
        console.warn('⚠ PDF processing may not work properly in production due to missing worker files.');
      }
    },
    
    // Also handle development mode by ensuring files are available
    configureServer(server) {
      // In development, we can serve the worker files directly from node_modules
      // This middleware will handle requests to /assets/pdf/ and serve from node_modules
      server.middlewares.use('/assets/pdf', (req, res, next) => {
        const workerPath = req.url.replace('/', '');
        const sourcePath = join(process.cwd(), 'node_modules/pdfjs-dist/build', workerPath);
        
        if (existsSync(sourcePath)) {
          res.setHeader('Content-Type', 'application/javascript');
          res.setHeader('Access-Control-Allow-Origin', '*');
          const fs = require('fs');
          const content = fs.readFileSync(sourcePath);
          res.end(content);
        } else {
          next();
        }
      });
    }
  };
}

export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11']
    }),
    copyPdfjsWorker()
  ],
  base: mode === 'production' ? '/QuizMaker/' : './',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: process.env.NODE_ENV !== 'production',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('pdfjs-dist')) {
              return 'pdf-lib';
            }
            return 'vendor';
          }
          
          // Component chunks
          if (id.includes('/components/')) {
            return 'components';
          }
          
          // Service chunks
          if (id.includes('/services/')) {
            return 'services';
          }
          
          // Utils chunks
          if (id.includes('/utils/')) {
            return 'utils';
          }
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop().replace('.js', '') : 'chunk';
          return `assets/js/[name]-[hash].js`;
        },
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `assets/css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        }
      }
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize assets
    assetsInlineLimit: 4096
  },
  server: {
    port: 3000,
    open: true
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js']
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['pdfjs-dist'],
    exclude: []
  }
  };
});