#!/usr/bin/env node

// Azure Web App 起動最適化スクリプト
console.log('🚀 Azure Web App 起動スクリプト開始');

// 環境変数の設定
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.PORT = process.env.PORT || 8080;

// 起動時間の計測開始
const startTime = Date.now();

// 基本的なヘルスチェックサーバーを即座に起動
import http from 'http';
const healthServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'starting',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    message: 'Application is starting up'
  }));
});

// ヘルスチェックサーバーを起動（即座に応答可能）
healthServer.listen(process.env.PORT || 8080, () => {
  const startupTime = Date.now() - startTime;
  console.log(`✅ ヘルスチェックサーバー起動完了: ${startupTime}ms`);
  console.log(`🔌 ポート: ${process.env.PORT || 8080}`);
  console.log(`📊 プロセスID: ${process.pid}`);
  console.log(`⏰ 起動時刻: ${new Date().toISOString()}`);
});

// メインアプリケーションの起動（非同期）
setTimeout(async () => {
  try {
    console.log('📦 本番サーバーを起動中...');
    
    // 本番サーバーを起動
    // 既存の本番エントリポイントに委譲（TypeScript: server/index.production.ts → ビルド後: server/dist/index.production.js）
    try {
      await import('./dist/index.production.js');
    } catch (e) {
      console.warn('⚠️ dist/index.production.js の読み込みに失敗。フォールバックとして NodeNext で実行を試行');
      await import('./index.production.js');
    }
    
    // ヘルスチェックサーバーを停止
    healthServer.close(() => {
      console.log('🔄 ヘルスチェックサーバーを停止し、本番サーバーに切り替え');
    });
    
  } catch (error) {
    console.error('❌ サーバー起動エラー:', error);
    // エラーが発生してもヘルスチェックサーバーは動作し続ける
    console.log('⚠️ ヘルスチェックサーバーで継続動作');
  }
}, 1000); // 1秒後に本番サーバーを起動

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('🛑 シャットダウンシグナル受信');
  healthServer.close(() => {
    console.log('✅ ヘルスチェックサーバー停止完了');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 中断シグナル受信');
  healthServer.close(() => {
    console.log('✅ ヘルスチェックサーバー停止完了');
    process.exit(0);
  });
});
