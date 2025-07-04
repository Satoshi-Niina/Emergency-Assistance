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
        target: 'http://localhost:3002', // 開発サーバーのポート
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:3002', // 開発サーバーのポート
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
  }
}); 