
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
      '@shared/schema': path.resolve(__dirname, '../shared/schema.ts')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: 'all',
    hmr: {
      port: 3001,
      clientPort: 3001
    },
    ws: {
      host: '0.0.0.0',
      port: 3001
    },
    origin: '*',
    disableHostCheck: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
