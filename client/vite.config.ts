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

  // デバッグ用：環境変数の確認（開発時のみ）
  if (mode === 'development') {
    console.log('🔍 環境変数デバッグ:', {
      mode,
      envFile,
      VITE_API_BASE_URL: env.VITE_API_BASE_URL,
      VITE_API_BASE: env.VITE_API_BASE,
      NODE_ENV: env.NODE_ENV
    });
  }

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

  // デバッグログ（開発時のみ）
  if (mode === 'development') {
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
        VITE_API_BASE: env.VITE_API_BASE,
        VITE_API_BASE_URL: env.VITE_API_BASE_URL,
        PORT: env.PORT,
        NODE_ENV: env.NODE_ENV,
      },
    });
  }

  return {
    base: '/',
    plugins: [react()],
    server: {
      port: clientPort,
      host: true,
      // プロキシ設定（開発時のみ）
      ...(isDev && {
        proxy: {
          '/api': {
            target: proxyTarget,
            changeOrigin: true,
            secure: false,
            configure: (proxy: any, _options: any) => {
              proxy.on('error', (err: any, _req: any, _res: any) => {
                console.log('proxy error', err);
              });
              proxy.on('proxyReq', (proxyReq: any, req: any, _res: any) => {
                console.log('Sending Request to the Target:', req.method, req.url);
              });
              proxy.on('proxyRes', (proxyRes: any, req: any, _res: any) => {
                console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
              });
            },
          }
        }
      })
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
      copyPublicDir: true,
      emptyOutDir: true,
      // チャンクサイズ警告の閾値を大幅に上げる
      chunkSizeWarningLimit: 10000,
      // より積極的な最適化
      target: 'es2015',
      // 小さなアセットはすべてインライン化（ファイル数削減）
      assetsInlineLimit: 8192, // 8KB未満はインライン化
      // 本番最適化設定
      reportCompressedSize: false, // 圧縮サイズレポートを無効化（ビルド時間短縮）
      write: true, // ファイル書き込みを有効化
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html'),
        output: {
          // ファイル名をシンプルに（ハッシュなし、最小限）
          entryFileNames: 'main.js',
          chunkFileNames: 'chunk.js',
          assetFileNames: (assetInfo: any) => {
            // CSSファイルは単一ファイルに
            if (assetInfo.name?.endsWith('.css')) {
              return 'style.css';
            }
            // 必要最小限のアセットのみ
            const ext = assetInfo.name?.split('.').pop();
            if (ext === 'ico' || ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'svg') {
              return `favicon.${ext}`;
            }
            return `asset.${ext}`;
          },
          // すべてを単一ファイルにインライン化
          inlineDynamicImports: true
        },
        // 外部依存関係（CDNから読み込む場合）
        external: [],
        // Tree shaking設定（不要コード削除）
        treeshake: {
          moduleSideEffects: false,
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false,
          unknownGlobalSideEffects: false
        }
      }
    },
    publicDir: 'public'
  };
});
