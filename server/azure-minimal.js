// Azure App Service用 最小サーバー (CommonJS)
// Emergency Assistance Backend - Azure Production Version
console.log('🔥 サーバーファイル開始 - ' + new Date().toISOString());
console.log('📍 NODE_VERSION:', process.version);
console.log('📍 PLATFORM:', process.platform);
console.log('📍 ARCH:', process.arch);
console.log('📍 ENV vars - PORT:', process.env.PORT, 'NODE_ENV:', process.env.NODE_ENV);

const express = require('express');
const cors = require('cors');

console.log('🚀 Azure用最小サーバー起動開始');
console.log('📂 Working directory:', process.cwd());
console.log('📂 __dirname:', __dirname);

const app = express();
const port = process.env.PORT || 3001;

// 基本的なミドルウェア - Azure Production対応のCORS設定
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://witty-river-012f39e00.1.azurestaticapps.net', // Azure Static Web Apps
  'http://localhost:5173', // 開発用
  'http://localhost:5002', // 開発用
  'http://localhost:3000', // 開発用
].filter(Boolean);

console.log('🔧 許可されたOrigin:', allowedOrigins);

const corsOptions = {
  origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// CORS (simple + preflight)
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

// Avoid 503 noise for favicon
app.get('/favicon.ico', (_req, res) => res.status(204).end());

// Azure App Service用のヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  console.log('📊 ヘルスチェックリクエスト受信 (/health)');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    port: port,
    pid: process.pid,
    message: 'Azure用最小サーバーが動作中です'
  });
});

app.get('/api/health', (req, res) => {
  console.log('📊 ヘルスチェックリクエスト受信 (/api/health)');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    port: port,
    pid: process.pid,
    message: 'Azure用最小サーバーが動作中です'
  });
});

// ルートエンドポイント
app.get('/', (req, res) => {
  console.log('📊 ルートリクエスト受信');
  res.json({
    message: 'Azure用最小サーバーが正常に動作しています',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'production'
  });
});

// 基本的なAPIテストエンドポイント
app.get('/api/test', (req, res) => {
  console.log('🔍 APIテストエンドポイント呼び出し');
  res.json({
    success: true,
    message: 'APIが正常に動作しています',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// エラーハンドリング
app.use((error, req, res, next) => {
  console.error('❌ エラー発生:', error);
  res.status(500).json({
    error: 'サーバーエラー',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// プロセスエラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('❌ 未処理例外:', error);
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未処理Promise拒否:', reason);
});

// サーバー起動 - Azure App Service対応
const server = app.listen(Number(port), () => {
  console.log(`✅ Azure用最小サーバーが正常に起動しました`);
  console.log(`🌐 Port: ${port}`);
  console.log(`📊 ヘルスチェック: /api/health`);
  console.log(`🔐 環境: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🔧 プロセスID: ${process.pid}`);
});

server.on('error', (error) => {
  console.error('❌ サーバー起動エラー:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ ポート ${port} は既に使用されています`);
  }
});

console.log('✅ Azure用最小サーバーファイル終端');
