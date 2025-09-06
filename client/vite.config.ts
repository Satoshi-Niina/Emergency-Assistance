import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath, URL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // 環境変数を読み込み - clientディレクトリから読み込む
  const env = loadEnv(mode, process.cwd(), '');
  
  // APIのベースURLを環境変数から取得
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:3001';
  const _serverPort = parseInt(env.PORT || '3001');
  const clientPort = parseInt(env.CLIENT_PORT || '5002');
  
  // プロダクションビルドでは不要なログを削除
  if (command !== 'build') {
    console.log('🔧 Vite環境変数確認:', {
      mode,
      command,
      __dirname,
      VITE_API_BASE_URL: env.VITE_API_BASE_URL,
      apiBaseUrl,
      NODE_ENV: env.NODE_ENV
    });
  }

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
        usePolling: false,
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
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('🔴 Proxy error:', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('📤 Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
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
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
          }
        }
      },
      sourcemap: false,
      minify: 'terser',
      target: 'es2015',
      modulePreload: true,
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
    },
    esbuild: {
      keepNames: false,
      legalComments: 'none',
      target: 'es2015'
    },
    define: {
      // 環境変数をクライアントサイドで利用可能にする
      __VITE_API_BASE_URL__: JSON.stringify(env.VITE_API_BASE_URL || apiBaseUrl),
      __VITE_MODE__: JSON.stringify(mode),
      __VITE_COMMAND__: JSON.stringify(command),
    },
    logLevel: command === 'build' ? 'warn' : 'info'
  };
});