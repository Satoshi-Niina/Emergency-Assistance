import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirnameの代替定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ★ express を開発モードでのみ使用する
function serveKnowledgeBase() {
  const express = require('express'); // ← require にすることで本番ビルド時に無視される
  const router = express.Router();
  const knowledgeBasePath = path.resolve(__dirname, '../knowledge-base');
  console.log(`📚 Serving static files for /knowledge-base from: ${knowledgeBasePath}`);
  router.use('/knowledge-base', express.static(knowledgeBasePath));

  return {
    name: 'serve-knowledge-base-middleware',
    configureServer(server) {
      server.middlewares.use(router);
    }
  };
}

export default defineConfig(({ command, mode }) => ({
  plugins: [
    react(),
    ...(command === 'serve' ? [serveKnowledgeBase()] : [])
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  },
  optimizeDeps: {
    include: [],
    exclude: [],
  },
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.VITE_PORT || '5000'),
    strictPort: false,
    allowedHosts: ['.replit.dev'],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log(`🔄 API Proxy: ${req.method} ${req.url} -> http://localhost:3001`);
          });
          proxy.on('error', (err, req) => {
            console.error(`❌ Proxy Error: ${err.message}`);
          });
        }
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
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: './index.html'
    }
  },
  define: {
    // 本番環境での環境変数定義
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
      mode === 'production' 
        ? (process.env.VITE_API_BASE_URL || 'https://emergency-backend-api.azurewebsites.net')
        : undefined
    ),
    'import.meta.env.VITE_APP_ENV': JSON.stringify(mode)
  },
  logLevel: 'warn'
}));
