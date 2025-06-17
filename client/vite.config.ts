import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// 動的ポート検出（複数候補対応）
const getBackendPorts = () => {
  const envPort = process.env.BACKEND_PORT;
  if (envPort) return [parseInt(envPort)];
  
  // ポート候補範囲を拡大
  return [3001, 3002, 3003, 3004, 3005, 8000, 8001, 8080];
};

const backendPorts = getBackendPorts();

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: false,
    allowedHosts: 'all',
    hmr: {
      clientPort: 443, // HTTPS対応
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
    },
    proxy: {
      '/api': {
        target: `http://localhost:${backendPorts[0]}`,
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log(`🔄 API Proxy: ${req.method} ${req.url} -> http://localhost:${backendPorts[0]}`);
          });
          proxy.on('error', (err, req, res) => {
            console.error(`❌ Proxy Error: ${err.message}`);
            console.log(`🔄 Fallback ports available: ${backendPorts.slice(1).join(', ')}`);
          });
        }
      },
      '/ws': {
        target: `ws://localhost:${backendPorts[0]}`,
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})