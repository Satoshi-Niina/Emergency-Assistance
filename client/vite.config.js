import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5001,
    host: '0.0.0.0',
    allowedHosts: ['all'],
  },
  preview: {
    port: 5002,
    host: '0.0.0.0',
  },
}); 