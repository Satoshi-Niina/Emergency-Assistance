// Azure App Service 確実起動用の最小構成サーバー
import express from 'express';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 80;

// 基本ミドルウェア
app.use(express.json());
app.use(cors({
  origin: [
    'https://witty-river-012f39e00.1.azurestaticapps.net',
    'http://localhost:3000',
    'http://localhost:5002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5002'
  ],
  credentials: true
}));

// 基本エンドポイント（I/O無し）
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'emergency-assistance-backend',
    time: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    mode: process.env.HELLO_ONLY === 'true' ? 'hello' : 'normal',
    time: new Date().toISOString(),
    service: 'emergency-assistance-backend'
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'emergency-assistance-backend'
  });
});

app.get('/healthz', (req, res) => {
  res.status(200).type('text/plain').send('OK');
});

// Azure App Service で必要な最小限のAPI
app.post('/api/auth/login', (req, res) => {
  console.log('Login attempt:', req.body);
  
  // 一時的な成功レスポンス（DB接続問題を回避）
  res.status(200).json({
    success: true,
    message: 'Temporary login success - DB integration pending',
    user: { id: 'temp', username: 'temp-user' },
    token: 'temp-token'
  });
});

app.get('/api/auth/status', (req, res) => {
  res.status(200).json({
    authenticated: false,
    message: 'Auth check - minimal mode'
  });
});

// エラーハンドリング
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message || 'Unknown error'
  });
});

// 404ハンドリング
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method
  });
});

// サーバー起動
app.listen(port, () => {
  console.log(`✅ Minimal Emergency Assistance Server running on port ${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 Mode: ${process.env.HELLO_ONLY === 'true' ? 'HELLO_ONLY' : 'NORMAL'}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /              - Service status`);
  console.log(`   GET  /health        - Health check`);
  console.log(`   GET  /api/health    - API health check`);
  console.log(`   GET  /healthz       - Kubernetes health`);
  console.log(`   POST /api/auth/login - Temporary login`);
  console.log(`   GET  /api/auth/status - Auth status`);
});

// プロセス終了ハンドリング
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

export default app;
