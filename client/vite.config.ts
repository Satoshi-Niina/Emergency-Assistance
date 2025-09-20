import dotenv from 'dotenv';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // 環境変数を読み込み
  const env = loadEnv(mode, process.cwd(), '');
  
  // APIのベースURLを環境変数から取得（VITE_API_BASEを使用）
  const apiBaseUrl = env.VITE_API_BASE || env.VITE_API_BASE_URL || 'https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net';
  const serverPort = parseInt(env.PORT || '3003');
  const clientPort = parseInt(env.CLIENT_PORT || '5173');
  
  console.log('🔧 Vite環境変数確認:', {
    VITE_API_BASE: env.VITE_API_BASE,
    VITE_API_BASE_URL: env.VITE_API_BASE_URL,
    VITE_API_BASE_TYPE: typeof env.VITE_API_BASE,
    VITE_API_BASE_LENGTH: env.VITE_API_BASE?.length,
    apiBaseUrl,
    serverPort,
    clientPort
  });
  
  console.log('🔧 Vite設定:', {
    command,
    mode,
    apiBaseUrl,
    serverPort,
    clientPort,
    env: {
      VITE_API_BASE: env.VITE_API_BASE, // 使用中: APIのベースURL
      VITE_API_BASE_URL: env.VITE_API_BASE_URL, // 使用中: APIのベースURL（後方互換性）
      PORT: env.PORT, // 使用中: サーバーポート
      NODE_ENV: env.NODE_ENV // 使用中: 環境判別
    }
  });

  return {
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
        proxy: {
          '/api': {
            target: 'http://localhost:3003',
            changeOrigin: true,
            secure: false,
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
      __VITE_API_BASE_URL__: JSON.stringify(apiBaseUrl),
      __VITE_MODE__: JSON.stringify(mode),
      __VITE_COMMAND__: JSON.stringify(command),
      // 環境変数を直接定義
      'import.meta.env.VITE_API_BASE': JSON.stringify(env.VITE_API_BASE),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL),
      'import.meta.env.NODE_ENV': JSON.stringify(env.NODE_ENV),
      'import.meta.env.MODE': JSON.stringify(mode),
    },
    logLevel: 'info'
  };
});