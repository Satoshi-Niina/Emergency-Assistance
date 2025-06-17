import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 動的ポート検出
const getBackendPort = () => {
  // 環境変数から取得
  const envPort = process.env.BACKEND_PORT || process.env.PORT;
  if (envPort) return parseInt(envPort);

  // デフォルトポート範囲で試行
  const defaultPorts = [3001, 3002, 3003, 8000, 8001];
  return defaultPorts[0]; // フォールバック
};

const backendPort = getBackendPort();

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: false, // ポート5000が使用中の場合、自動的に別ポートを使用
    proxy: {
      '/api': {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log(`🔄 API Proxy: ${req.method} ${req.url} -> http://localhost:${backendPort}`);
          });
          proxy.on('error', (err, req, res) => {
            console.error(`❌ Proxy Error: ${err.message}`);
            console.log(`🔄 Attempting fallback ports...`);
          });
        }
      },
      '/ws': {
        target: `ws://localhost:${backendPort}`,
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})