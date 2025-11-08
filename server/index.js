#!/usr/bin/env node

// Main entry point for Azure App Service
// This file ensures that azure-server.js is started correctly
// ESModule compatible version

import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM __filename and __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting Emergency Assistance Backend...');
console.log('📁 Working directory:', process.cwd());
console.log('📄 Main file:', __filename);
console.log('⏰ Start time:', new Date().toISOString());
console.log('🔍 Environment variables:');
console.log('  - NODE_ENV:', process.env.NODE_ENV);
console.log('  - PORT:', process.env.PORT);
console.log('  - DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('  - JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');

try {
  console.log('📦 Loading azure-server.js...');
  await import('./azure-server.js');
  console.log('✅ azure-server.js loaded successfully');
} catch (error) {
  console.error('❌ Error loading azure-server.js:', error);
  console.error('❌ Stack trace:', error.stack);
  process.exit(1);
}
