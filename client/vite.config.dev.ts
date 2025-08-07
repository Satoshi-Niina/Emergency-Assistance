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
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  },
  server: {
    host: '0.0.0.0',
    port: 5002, // 開発専用ポート
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // サーバーの実際のポートに修正
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('🔴 Proxy error:', err.message);
            if (res.writeHead) {
              res.writeHead(500, {
                'Content-Type': 'application/json',
              });
              res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
            }
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('📤 Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('📥 Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
      '/ws': {
        target: 'ws://localhost:3001', // サーバーの実際のポートに修正
        ws: true,
        changeOrigin: true
      }
    },
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
    // 開発用の設定
    hmr: {
      port: 5003, // HMR専用ポート
    },
    watch: {
      usePolling: true,
      interval: 1000,
    }
  },
  build: {
    outDir: 'dist-dev', // 開発用ビルドディレクトリ
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: './index.html'
    }
  },
  logLevel: 'info', // 開発時は詳細ログ
  define: {
    __DEV__: true,
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify('http://localhost:3001'),
    'import.meta.env.isProduction': JSON.stringify(false),
    'import.meta.env.isDevelopment': JSON.stringify(true)
  }
}); 