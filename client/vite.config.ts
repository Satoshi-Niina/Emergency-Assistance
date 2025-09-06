import dotenv from 'dotenv';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath, URL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // 環境変数を読み込み - clientディレクトリから読み込む
  const env = loadEnv(mode, __dirname, '');
  
  // APIのベースURLを環境変数から取得
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:3001';
  const serverPort = parseInt(env.PORT || '3001');
  const clientPort = parseInt(env.CLIENT_PORT || '5002');
  
  console.log('🔧 Vite環境変数確認:', {
    mode,
    command,
    __dirname,
    VITE_API_BASE_URL: env.VITE_API_BASE_URL,
    apiBaseUrl,
    NODE_ENV: env.NODE_ENV
  });
  
  console.log('🔧 Vite設定:', {
    command,
    mode,
    apiBaseUrl,
    serverPort,
    clientPort,
    env: {
      VITE_API_BASE_URL: env.VITE_API_BASE_URL, // 使用中: APIのベースURL
      PORT: env.PORT, // 使用中: サーバーポート
      NODE_ENV: env.NODE_ENV // 使用中: 環境判別
    }
  });

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@shared': fileURLToPath(new URL('../shared/src', import.meta.url)),
      },
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'],
    },
    server: {
      host: '0.0.0.0',
      port: clientPort,
      allowedHosts: true,
      // ローカル開発環境用の設定
      watch: {
        usePolling: false, // ローカルではポーリング不要
        followSymlinks: true
      },
      hmr: {
        host: 'localhost',
        port: clientPort,
        overlay: true
      },
      // プロキシ設定を有効化 - APIサーバーへの接続
      proxy: {
        '/api': {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
          ws: true,
          rewrite: (path) => path,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('🔴 Proxy error:', err);
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('📤 Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('📥 Received Response from the Target:', proxyRes.statusCode, req.url);
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
      sourcemap: true,
      minify: true,
      target: 'esnext',
      modulePreload: true
    },
    esbuild: {
      keepNames: true,
      legalComments: 'none',
      target: 'es2015'
    },
    define: {
      // 環境変数をクライアントサイドで利用可能にする
      __VITE_API_BASE_URL__: JSON.stringify(env.VITE_API_BASE_URL || apiBaseUrl),
      __VITE_MODE__: JSON.stringify(mode),
      __VITE_COMMAND__: JSON.stringify(command),
    },
    logLevel: 'info'
  };
});