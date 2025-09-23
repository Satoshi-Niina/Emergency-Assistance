#!/usr/bin/env node

// Main entry point for Azure App Service
// This file ensures that production-server.js is started correctly

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
  console.log('📦 Loading production-server.js...');
  require('./production-server.js');
  console.log('✅ production-server.js loaded successfully');
} catch (error) {
  console.error('❌ Error loading production-server.js:', error);
  console.error('❌ Stack trace:', error.stack);
  process.exit(1);
}
