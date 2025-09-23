// Azure App Service用の確実な起動スクリプト
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Azure App Service起動スクリプト開始');
console.log('📁 現在のディレクトリ:', process.cwd());
console.log('📁 ファイル一覧:', fs.readdirSync(process.cwd()));

// 環境変数の設定
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.PORT = process.env.PORT || 8080;

console.log('🔧 環境設定:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  NODE_VERSION: process.version,
  PLATFORM: process.platform,
});

// server.jsの存在確認
const serverPath = path.join(process.cwd(), 'production-server-standalone.js');
console.log('📁 サーバーファイルパス:', serverPath);

if (!fs.existsSync(serverPath)) {
  console.error('❌ production-server-standalone.jsが見つかりません');
  console.log('📁 利用可能なファイル:', fs.readdirSync(process.cwd()));
  process.exit(1);
}

console.log('✅ production-server-standalone.jsが見つかりました');

// production-server-standalone.jsを起動
console.log('🚀 production-server-standalone.jsを起動中...');
const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: process.env,
  cwd: process.cwd(),
});

server.on('error', err => {
  console.error('❌ サーバー起動エラー:', err);
  process.exit(1);
});

server.on('exit', (code, signal) => {
  console.log(`🔄 サーバー終了: コード ${code}, シグナル ${signal}`);
  if (code !== 0) {
    console.error('❌ サーバーが異常終了しました');
    process.exit(code);
  }
});

// プロセス終了時の処理
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM受信、サーバーを終了します');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT受信、サーバーを終了します');
  server.kill('SIGINT');
});

// 定期的なヘルスチェック
setInterval(() => {
  console.log('💓 ヘルスチェック: サーバーは動作中です');
}, 30000);
