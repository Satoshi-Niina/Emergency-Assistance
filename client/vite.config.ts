
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
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: 'all'
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: true
  }
});
