#!/usr/bin/env node

// Main entry point for Azure App Service
// This file ensures that azure-server.js is started correctly
// ESModule compatible version with CORS fix

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

// 環境変数の確認と適切なサーバー選択
const hasCriticalEnvVars = process.env.DATABASE_URL && process.env.JWT_SECRET && process.env.SESSION_SECRET;

console.log('🔍 Critical environment variables check:');
console.log('  - Has all critical vars:', hasCriticalEnvVars);

if (hasCriticalEnvVars) {
  // 本番サーバーを使用
  try {
    console.log('📦 Loading azure-server.js (production server with all env vars)...');
    await import('./azure-server.js');
    console.log('✅ azure-server.js loaded successfully');
  } catch (error) {
    console.error('❌ Error loading azure-server.js:', error);
    console.error('❌ Stack trace:', error.stack);
    
    // フォールバックとしてデバッグサーバーを起動
    console.log('🔧 Fallback: Starting debug server due to production server error...');
    try {
      await import('./azure-server-debug.js');
      console.log('✅ azure-server-debug.js loaded as fallback');
    } catch (debugError) {
      console.error('❌ Fallback also failed:', debugError);
      process.exit(1);
    }
  }
} else {
  // 環境変数が不足している場合はデバッグサーバーを使用
  console.log('⚠️ Critical environment variables missing. Starting debug server...');
  console.log('🔧 Missing variables will be handled by debug server.');
  
  try {
    await import('./azure-server-debug.js');
    console.log('✅ azure-server-debug.js loaded for missing env vars');
  } catch (debugError) {
    console.error('❌ Debug server failed to start:', debugError);
    console.error('❌ Debug server stack trace:', debugError.stack);
    process.exit(1);
  }
}
