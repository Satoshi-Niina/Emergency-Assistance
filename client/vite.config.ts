import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
        // 500エラー時にHTMLが返るとフロントでJSONパースエラーになるため、
        // ログを出して原因特定しやすくする
        configure: (proxy, _options) => {
          proxy.on('proxyRes', (proxyRes, req) => {
            const ct = proxyRes.headers['content-type'];
            if (ct && !ct.includes('application/json')) {
              console.warn(`[vite-proxy] Non-JSON response for ${req.url}: content-type=${ct}`);
            }
          });
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  define: {
    // 環境変数を静的に定義
    'process.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL || 'http://localhost:3001'),
  }
});