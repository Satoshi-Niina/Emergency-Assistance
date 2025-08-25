import dotenv from 'dotenv';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // 迺ｰ蠅・､画焚繧定ｪｭ縺ｿ霎ｼ縺ｿ
  const env = loadEnv(mode, process.cwd(), '');
  
  // API縺ｮ繝吶・繧ｹURL繧堤腸蠅・､画焚縺九ｉ蜿門ｾ暦ｼ・ITE_API_BASE_URL縺ｮ縺ｿ菴ｿ逕ｨ・・
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:3001';
  const serverPort = parseInt(env.PORT || '3001');
  const clientPort = parseInt(env.CLIENT_PORT || '5002');
  
  console.log('肌 Vite迺ｰ蠅・､画焚遒ｺ隱・', {
    VITE_API_BASE_URL: env.VITE_API_BASE_URL,
    VITE_API_BASE_URL_TYPE: typeof env.VITE_API_BASE_URL,
    VITE_API_BASE_URL_LENGTH: env.VITE_API_BASE_URL?.length,
    apiBaseUrl,
    serverPort,
    clientPort
  });
  
  console.log('肌 Vite險ｭ螳・', {
    command,
    mode,
    apiBaseUrl,
    serverPort,
    clientPort,
    env: {
      VITE_API_BASE_URL: env.VITE_API_BASE_URL, // 菴ｿ逕ｨ荳ｭ: API縺ｮ繝吶・繧ｹURL
      PORT: env.PORT, // 菴ｿ逕ｨ荳ｭ: 繧ｵ繝ｼ繝舌・繝昴・繝・
      NODE_ENV: env.NODE_ENV // 菴ｿ逕ｨ荳ｭ: 迺ｰ蠅・愛蛻･
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
      // 繝ｭ繝ｼ繧ｫ繝ｫ髢狗匱迺ｰ蠅・畑縺ｮ險ｭ螳・
      watch: {
        usePolling: false, // 繝ｭ繝ｼ繧ｫ繝ｫ縺ｧ縺ｯ繝昴・繝ｪ繝ｳ繧ｰ荳崎ｦ・
        followSymlinks: true
      },
      hmr: {
        host: 'localhost',
        port: clientPort,
        overlay: true
      },
      // 繝励Ο繧ｭ繧ｷ險ｭ螳壹ｒ譛牙柑蛹・- API繧ｵ繝ｼ繝舌・縺ｸ縺ｮ謗･邯・
      proxy: {
        '/api': {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
          ws: true,
          rewrite: (path) => path,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('閥 Proxy error:', err);
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('豆 Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('踏 Received Response from the Target:', proxyRes.statusCode, req.url);
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
      // 迺ｰ蠅・､画焚繧偵け繝ｩ繧､繧｢繝ｳ繝医し繧､繝峨〒蛻ｩ逕ｨ蜿ｯ閭ｽ縺ｫ縺吶ｋ
      __VITE_API_BASE_URL__: JSON.stringify(apiBaseUrl),
      __VITE_MODE__: JSON.stringify(mode),
      __VITE_COMMAND__: JSON.stringify(command),
      // 迺ｰ蠅・､画焚繧堤峩謗･螳夂ｾｩ
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL),
      'import.meta.env.NODE_ENV': JSON.stringify(env.NODE_ENV),
      'import.meta.env.MODE': JSON.stringify(mode),
    },
    logLevel: 'info'
  };
});


