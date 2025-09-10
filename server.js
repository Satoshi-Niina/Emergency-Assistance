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

// ビルド済みファイルのパス
const productionServerPath = path.join(__dirname, 'server', 'dist', 'azure-production-server.js');
const fallbackServerPath = path.join(__dirname, 'server', 'azure-simple-server.js');

// ファイル存在確認
console.log('Production server exists:', fs.existsSync(productionServerPath));
console.log('Fallback server exists:', fs.existsSync(fallbackServerPath));

// 優先順位：
// 1. ビルドされた本番サーバー
// 2. フォールバック JavaScript サーバー

let serverToStart;

if (fs.existsSync(productionServerPath)) {
    console.log('✅ 本番ビルドサーバーを起動します...');
    serverToStart = productionServerPath;
} else if (fs.existsSync(fallbackServerPath)) {
    console.log('⚠️  フォールバックサーバーを起動します...');
    serverToStart = fallbackServerPath;
} else {
    console.error('❌ 起動可能なサーバーファイルが見つかりません');
    console.error('探したパス:');
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
