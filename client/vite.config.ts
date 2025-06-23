import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import express from 'express'

// カスタムミドルウェア関数
function serveKnowledgeBase() {
  const router = express.Router()
  // プロジェクトルートのknowledge-baseディレクトリを指定
  const knowledgeBasePath = path.resolve(__dirname, '../knowledge-base')
  console.log(`📚 Serving static files for /knowledge-base from: ${knowledgeBasePath}`)
  router.use('/knowledge-base', express.static(knowledgeBasePath))

  return {
    name: 'serve-knowledge-base-middleware',
    configureServer(server) {
      server.middlewares.use(router)
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    serveKnowledgeBase() // カスタムミドルウェアをプラグインとして追加
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared"),
    },
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
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log(`🔄 API Proxy: ${req.method} ${req.url} -> http://localhost:3001`);
          });
          proxy.on('error', (err, req, res) => {
            console.error(`❌ Proxy Error: ${err.message}`);
          });
        }
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
    fs: {
      allow: [
        path.resolve(__dirname, '..'),
      ],
    },
  },
  build: {
    outDir: 'dist',
  },
})