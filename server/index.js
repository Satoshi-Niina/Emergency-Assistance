#!/usr/bin/env node
import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// ESM entry point for Azure App Service
console.log('🚀 Starting Emergency Assistance Server (ESM)');
console.log('📁 Current directory:', __dirname);
console.log('🔧 Environment:', process.env.NODE_ENV || 'production');

// Import and start the main server
try {
  console.log('📁 Looking for app-production-esm.js in:', __dirname);
  const { default: app } = await import('./app-production-esm.js');
  const PORT = process.env.PORT || 8080;

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on 0.0.0.0:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
  });
} catch (error) {
  console.error('❌ Failed to start server:', error);
  console.error('❌ Error details:', error.message);
  console.error('❌ Current directory:', __dirname);
  process.exit(1);
}
