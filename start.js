// Azure App Service用の簡単な起動スクリプト
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Azure App Service起動スクリプト開始');

// 環境変数の設定
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.PORT = process.env.PORT || 8080;

console.log('🔧 環境設定:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT
});

// server.jsを起動
const serverPath = path.join(__dirname, 'server.js');
console.log('📁 サーバーファイルパス:', serverPath);

const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: process.env
});

server.on('error', (err) => {
  console.error('❌ サーバー起動エラー:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`🔄 サーバー終了: コード ${code}`);
  if (code !== 0) {
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
