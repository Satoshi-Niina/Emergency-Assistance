import dotenv from 'dotenv';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // 本番安定化のためbaseを明示
  // 環境変数を読み込み
  const env = loadEnv(mode, process.cwd(), '');

  // APIのベースURLを環境変数から取得（VITE_API_BASEを使用）
  const apiBaseUrl =
    env.VITE_API_BASE ||
    env.VITE_API_BASE_URL ||
    (command === 'serve' ? 'http://localhost:8000' : 'https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net');
  const serverPort = parseInt(env.PORT || '3003');
  const clientPort = parseInt(env.CLIENT_PORT || '5174');

  console.log('🔧 Vite環境変数確認:', {
    VITE_API_BASE: env.VITE_API_BASE,
    VITE_API_BASE_URL: env.VITE_API_BASE_URL,
    VITE_API_BASE_TYPE: typeof env.VITE_API_BASE,
    VITE_API_BASE_LENGTH: env.VITE_API_BASE?.length,
    apiBaseUrl,
    serverPort,
    clientPort,
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
      NODE_ENV: env.NODE_ENV, // 使用中: 環境判別
    },
  });

  return {
    base: '/',
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      minify: 'terser',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
          }
        }
      }
    }
  };
});
