import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts: "all",
    cors: {
      origin: true,
      credentials: true
    },
    hmr: false,
    ws: false,
    proxy: {
      "/api": {
        target: "http://0.0.0.0:5000",
        changeOrigin: true,
        secure: false,
        timeout: 30000,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            if (!err.message.includes('ECONNRESET')) {
              console.log('proxy error', err);
            }
          });
        },
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    cors: {
      origin: true,
      credentials: true
    }
  }
});