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
  // 環境変数を読み込み（productionモードの場合は明示的に指定）
  const envFile = mode === 'production' ? '.env.production' : '.env';
  const env = loadEnv(mode, process.cwd(), '');

  // デバッグ用：環境変数の確認
  console.log('🔍 環境変数デバッグ:', {
    mode,
    envFile,
    VITE_API_BASE_URL: env.VITE_API_BASE_URL,
    VITE_API_BASE: env.VITE_API_BASE,
    NODE_ENV: env.NODE_ENV
  });

  // 環境別APIベースURL自動設定
  const isDev = command === 'serve';
  const isProd = mode === 'production';

  const apiBaseUrl = (() => {
    // 環境変数が設定されている場合は最優先
    if (env.VITE_API_BASE_URL && env.VITE_API_BASE_URL.trim() !== '') {
      return env.VITE_API_BASE_URL;
    }
    if (env.VITE_API_BASE && env.VITE_API_BASE.trim() !== '') {
      return env.VITE_API_BASE;
    }

    // 開発環境: 統合サーバーを使用（相対パス）
    if (isDev) {
      return '/api';
    }

    // 本番環境: 相対パス（Static Web Appのリライトルール使用）
    if (isProd) {
      return '/api';
    }

    // フォールバック
    return 'http://localhost:8080';
  })();

  // プロキシのtargetを計算（相対パスの場合は絶対URLに変換）
  const proxyTarget = (() => {
    // apiBaseUrlが相対パスの場合（/apiで始まる）
    if (apiBaseUrl.startsWith('/')) {
      return 'http://localhost:8080';
    }

    // apiBaseUrlが有効なURLかチェック
    if (apiBaseUrl && apiBaseUrl.trim() !== '' && (apiBaseUrl.startsWith('http://') || apiBaseUrl.startsWith('https://'))) {
      return apiBaseUrl;
    }

    // フォールバック: 統合サーバーのデフォルトポート
    return 'http://localhost:8080';
  })();

  const serverPort = parseInt(env.PORT || env.VITE_SERVER_PORT || '3003');
  const clientPort = parseInt(env.VITE_CLIENT_PORT || '5173');

  console.log('🔧 Vite環境変数確認:', {
    VITE_API_BASE: env.VITE_API_BASE,
    VITE_API_BASE_URL: env.VITE_API_BASE_URL,
    VITE_API_BASE_TYPE: typeof env.VITE_API_BASE,
    VITE_API_BASE_LENGTH: env.VITE_API_BASE?.length,
    apiBaseUrl,
    proxyTarget,
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
    server: {
      port: clientPort,
      host: true,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: '', // アセットをルートディレクトリに配置
      sourcemap: false,
      minify: 'terser',
      cssCodeSplit: false, // CSS分割を無効化してファイル数削減
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html'),
        output: {
          // 完全な単一ファイル化（最小限のファイル数）
          manualChunks: () => {
            // すべてのコードを単一のchunkに統合
            return 'app';
          },
          // ファイル名をシンプルに（ハッシュなし、最小限）
          entryFileNames: 'main.js',
          chunkFileNames: 'app.js',
          assetFileNames: (assetInfo: any) => {
            // CSSファイルは単一ファイルに
            if (assetInfo.name?.endsWith('.css')) {
              return 'style.css';
            }
            // 画像・フォントなど最小限のアセットのみ
            const ext = assetInfo.name?.split('.').pop();
            return `${ext === 'ico' ? 'favicon' : 'asset'}.${ext}`;
          },
          // インライン化を最大限活用
          inlineDynamicImports: true
        }
      },
      copyPublicDir: true,
      emptyOutDir: true,
      // チャンクサイズ警告の閾値を大幅に上げる
      chunkSizeWarningLimit: 5000,
      // より積極的な最適化
      target: 'es2015',
      // アセットのインライン化を制限
      assetsInlineLimit: 0
    },
    publicDir: 'public'
  };
});
