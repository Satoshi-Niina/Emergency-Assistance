#!/usr/bin/env node

/**
 * Azure App Service エントリーポイント
 * ビルドされたファイルまたはフォールバックサーバーを起動
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Azure App Service エントリーポイント開始...');
console.log('Working Directory:', process.cwd());
console.log('Node Version:', process.version);
console.log('Environment:', process.env.NODE_ENV);

// 環境判定（ローカル開発環境 vs Azure App Service）
const isAzureAppService = process.env.WEBSITE_SITE_NAME || process.env.AZURE_APP_SERVICE;
const isLocalDev = !isAzureAppService;

console.log('Is Azure App Service:', isAzureAppService);
console.log('Is Local Development:', isLocalDev);

// 環境に応じたパス設定
let productionServerPath, fallbackServerPath;

if (isAzureAppService) {
  // Azure App Service環境
  productionServerPath = path.join(__dirname, 'dist', 'azure-production-server.js');
  fallbackServerPath = path.join(__dirname, 'azure-simple-server.js');
} else {
  // ローカル開発環境
  productionServerPath = path.join(__dirname, 'server', 'dist', 'azure-production-server.js');
  fallbackServerPath = path.join(__dirname, 'server', 'azure-simple-server.js');
}

// ファイル存在確認
console.log('Production v2 server path:', productionV2ServerPath);
console.log('Quickfix server path:', quickfixServerPath);
console.log('Production server path:', productionServerPath);
console.log('Fallback server path:', fallbackServerPath);
console.log('Production v2 server exists:', fs.existsSync(productionV2ServerPath));
console.log('Quickfix server exists:', fs.existsSync(quickfixServerPath));
console.log('Production server exists:', fs.existsSync(productionServerPath));
console.log('Fallback server exists:', fs.existsSync(fallbackServerPath));

// 優先順位：
// 1. 新しい本番サーバーv2（修正版）
// 2. クイックフィックスサーバー（一時的な修正用）
// 3. ビルドされた本番サーバー
// 4. フォールバック JavaScript サーバー

let serverToStart;

const productionV2ServerPath = isAzureAppService 
  ? path.join(__dirname, 'dist', 'azure-production-server-v2.js')
  : path.join(__dirname, 'server', 'dist', 'azure-production-server-v2.js');

const quickfixServerPath = isAzureAppService 
  ? path.join(__dirname, 'azure-quickfix-server.js')
  : path.join(__dirname, 'server', 'azure-quickfix-server.js');

if (fs.existsSync(productionV2ServerPath)) {
    console.log('🚀 新しい本番サーバーv2を起動します...');
    serverToStart = productionV2ServerPath;
} else if (fs.existsSync(quickfixServerPath)) {
    console.log('🔧 クイックフィックスサーバーを起動します...');
    serverToStart = quickfixServerPath;
} else if (fs.existsSync(productionServerPath)) {
    console.log('✅ 本番ビルドサーバーを起動します...');
    serverToStart = productionServerPath;
} else if (fs.existsSync(fallbackServerPath)) {
    console.log('⚠️  フォールバックサーバーを起動します...');
    serverToStart = fallbackServerPath;
} else {
    console.error('❌ 起動可能なサーバーファイルが見つかりません');
    console.error('探したパス:');
    console.error('- ' + productionV2ServerPath);
    console.error('- ' + quickfixServerPath);
    console.error('- ' + productionServerPath);
    console.error('- ' + fallbackServerPath);
    process.exit(1);
}

// サーバーを起動
try {
    console.log(`🔥 サーバーを開始: ${serverToStart}`);
    require(serverToStart);
} catch (error) {
    console.error('❌ サーバー起動エラー:', error);
    console.error('スタックトレース:', error.stack);
    process.exit(1);
}
