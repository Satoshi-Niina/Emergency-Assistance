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
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://0.0.0.0:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
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
    // 環境変数をクライアントサイドで利用可能にする
    __VITE_API_BASE_URL__: JSON.stringify(
      process.env.NODE_ENV === 'production' 
        ? process.env.VITE_API_BASE_URL || 'https://ceb3a872-0092-4e86-a990-adc5b271598b-00-tlthbuz5ebfd.sisko.replit.dev'
        : 'https://ceb3a872-0092-4e86-a990-adc5b271598b-00-tlthbuz5ebfd.sisko.replit.dev'
    ),
  },
  logLevel: 'info'
});