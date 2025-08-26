#!/usr/bin/env node

// Azure Web App 起動最適化スクリプト
console.log('🚀 Azure Web App 起動スクリプト開始');

// 環境変数の設定
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.PORT = process.env.PORT || 8080;

// メインアプリケーションの起動
try {
  console.log('📦 本番サーバーを起動中...');
  console.log(`🌍 環境: ${process.env.NODE_ENV}`);
  console.log(`🔌 ポート: ${process.env.PORT}`);
  console.log(`📊 プロセスID: ${process.pid}`);
  console.log(`⏰ 起動時刻: ${new Date().toISOString()}`);
  
  // 本番サーバーを起動
  import('./dist/production-server.js').catch((error) => {
    console.error('❌ サーバー起動エラー:', error);
    process.exit(1);
  });
  
} catch (error) {
  console.error('❌ 起動スクリプトエラー:', error);
  process.exit(1);
}
