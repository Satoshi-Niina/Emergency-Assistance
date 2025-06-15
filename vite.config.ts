
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirnameの代替定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
      '@shared/schema': path.resolve(__dirname, './shared/schema.ts')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: 'all',
    disableHostCheck: true
  },
  build: {
    outDir: 'client/dist',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: './client/index.html'
    }
  },
  logLevel: 'warn'
});
