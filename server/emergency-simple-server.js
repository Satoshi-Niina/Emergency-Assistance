const express = require('express');
const app = express();
const PORT = process.env.PORT || 80;

console.log('🚨 Emergency Simple Server Starting...');
console.log('Port:', PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Working Directory:', process.cwd());

// 最小限のミドルウェア
app.use(express.json());

// ルートエンドポイント
app.get('/', (req, res) => {
  console.log('✅ Root endpoint accessed');
  res.json({
    message: 'Emergency Simple Server - Working!',
    status: 'OK',
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV || 'not-set',
    cwd: process.cwd()
  });
});

// ヘルスチェック
app.get('/health', (req, res) => {
  console.log('✅ Health check accessed');
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// 基本的なAPIエンドポイント
app.get('/api/test', (req, res) => {
  console.log('✅ API test accessed');
  res.json({
    success: true,
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🔥 Emergency Simple Server is listening on port ${PORT}`);
  console.log(`Access: http://localhost:${PORT}`);
  console.log('Server started successfully!');
}).on('error', (err) => {
  console.error('❌ Server startup error:', err);
  process.exit(1);
});

// プロセスエラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});
