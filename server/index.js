#!/usr/bin/env node

// Azure App Service 本番用エントリーポイント
// azure-server.jsを起動する

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Emergency Assistance Server Starting (Production Entry Point)');
console.log('📦 Node.js:', process.version);
console.log('📁 Working Directory:', process.cwd());
console.log('📄 Entry Point:', __filename);
console.log('🌍 Environment:', process.env.NODE_ENV || 'production');
console.log('⏰ Start time:', new Date().toISOString());

// azure-server.jsのパスを確認
const azureServerPath = join(__dirname, 'azure-server.js');
const azureServerPathRelative = './azure-server.js';

console.log('🔍 Checking for azure-server.js...');
console.log('  - Absolute path:', azureServerPath);
console.log('  - Relative path:', azureServerPathRelative);
console.log('  - Exists (absolute):', existsSync(azureServerPath));
console.log('  - Exists (relative):', existsSync(azureServerPathRelative));

// azure-server.jsをインポートして起動
try {
  console.log('📦 Loading azure-server.js...');

  // 相対パスでインポート（ESModule形式）
  await import(azureServerPathRelative);

  console.log('✅ azure-server.js loaded successfully');
} catch (error) {
  console.error('❌ FATAL ERROR loading azure-server.js:', error);
  console.error('❌ Error message:', error.message);
  console.error('❌ Error name:', error.name);
  if (error.code) {
    console.error('❌ Error code:', error.code);
  }
  if (error.stack) {
    console.error('❌ Stack trace:', error.stack);
  }

  console.error('❌ Production server failed to start. Exiting process...');
  process.exit(1);
}
