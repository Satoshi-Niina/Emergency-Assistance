import dotenv from 'dotenv';
dotenv.config({ path: '.env.production' });

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'],
  },
  server: {
    host: '0.0.0.0',
    port: 5001,
    allowedHosts: ['all'],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
        changeOrigin: true
      }
    },
    fs: {
      allow: [path.resolve(__dirname, '..')],
    }
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: './index.html',
      output: {
        manualChunks: undefined
      }
    },
    sourcemap: true, // Enable sourcemaps for easier debugging
    minify: true, // Enable minification for production
    target: 'esnext', // Use esnext for better ESM support
    modulePreload: true // Enable module preload
  },
  esbuild: {
    keepNames: true,
    legalComments: 'none',
    target: 'es2015'
  },
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL || 'https://emergency-backend-api.azurewebsites.net'),
    'import.meta.env.VITE_API_BASE_URL_TYPE': JSON.stringify('string'),
    'import.meta.env.VITE_API_BASE_URL_LENGTH': JSON.stringify(process.env.VITE_API_BASE_URL?.length || 47),
    'import.meta.env.isProduction': JSON.stringify(true),
    'import.meta.env.isDevelopment': JSON.stringify(false)
  },
  logLevel: 'info'
}); 