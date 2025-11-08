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
    console.log('🔧 Production server attempt - detailed logging enabled');
    await import('./azure-server.js');
    console.log('✅ azure-server.js loaded successfully');
  } catch (error) {
    console.error('❌ Error loading azure-server.js:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error name:', error.name);
    console.error('❌ Stack trace:', error.stack);

    // 強制的に本番サーバーを試行（デバッグ目的）
    console.log('🔧 FORCE RETRY: Attempting production server again with detailed logging...');
    try {
      // エラー情報をより詳細に取得するため再度実行
      const module = await import('./azure-server.js?retry=' + Date.now());
      console.log('✅ azure-server.js loaded successfully on retry');
    } catch (retryError) {
      console.error('❌ Production server retry failed:', retryError);
      console.error('❌ Retry error details:', {
        message: retryError.message,
        name: retryError.name,
        code: retryError.code
      });
    }

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

    // 最後の手段: 最小限フォールバックサーバー
    console.log('🆘 Starting minimal fallback server as last resort...');
    try {
      await import('./fallback-server.js');
      console.log('✅ Fallback server started successfully');
    } catch (fallbackError) {
      console.error('❌ Even fallback server failed:', fallbackError);
      process.exit(1);
    }
  }
}
