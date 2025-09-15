import express, { Request, Response } from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS設定
app.use(cors({ 
  origin: [
    'https://witty-river-012f39e00.1.azurestaticapps.net',
    'http://localhost:5173'
  ], 
  credentials: true 
}));

// JSONパース
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 本番環境専用: APIルートを最優先で処理
app.use((req, res, next) => {
  console.log(`🔍 本番環境リクエスト: ${req.method} ${req.path}`);
  if (req.path.startsWith('/api/')) {
    console.log(`✅ APIルート検出: ${req.path}`);
    return next();
  }
  next();
});

// ヘルスチェック
app.get('/api/health/json', (req: Request, res: Response) => {
  const hasDb = !!process.env.DATABASE_URL;
  const hasBlob = !!process.env.AZURE_STORAGE_CONNECTION_STRING;
  
  res.json({
    ok: true,
    time: new Date().toISOString(),
    env: {
      hasDb,
      hasBlob,
      nodeEnv: process.env.NODE_ENV || 'development'
    }
  });
});

// デバッグ用ルート
app.get('/api/debug/routes', (req: Request, res: Response) => {
  res.json({
    message: 'API routes are working',
    timestamp: new Date().toISOString(),
    environment: 'production',
    routes: [
      '/api/health/json',
      '/api/users',
      '/api/machines/machine-types',
      '/api/machines/all-machines',
      '/api/storage/list'
    ]
  });
});

// ユーザー管理の基本ルート

// 本番もDB取得APIを利用
import { usersRouter } from './routes/users.js';
app.use('/api/users', usersRouter);

// 機械管理の基本ルート

// 本番もDB取得APIを利用
import machinesRouter from './routes/machines.js';
app.use('/api/machines', machinesRouter);

// ストレージ管理の基本ルート
app.get('/api/storage/list', async (req: Request, res: Response) => {
  try {
    console.log('🔍 本番環境: ストレージ一覧取得リクエスト');
    res.json({
      success: true,
      data: [],
      message: '本番環境: ストレージ一覧取得（Azure Storage接続が必要）',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 本番環境: ストレージ一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ストレージ一覧の取得に失敗しました',
      timestamp: new Date().toISOString()
    });
  }
});

// 静的ファイル配信（最後に配置）
app.use(express.static(path.join(__dirname, '../public'), {
  etag: true,
  maxAge: '1d'
}));

// 404ハンドリング
app.use('*', (req: Request, res: Response) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      error: 'API endpoint not found',
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(404).json({
      error: 'Page not found',
      path: req.path,
      timestamp: new Date().toISOString()
    });
  }
});

// エラーハンドリング
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('❌ 本番環境エラー:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message || 'Unknown error',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 本番環境サーバー起動: http://localhost:${PORT}`);
  console.log(`🔧 環境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 利用可能なAPIエンドポイント:`);
  console.log(`   - GET /api/health/json`);
  console.log(`   - GET /api/debug/routes`);
  console.log(`   - GET /api/users`);
  console.log(`   - GET /api/machines/machine-types`);
  console.log(`   - GET /api/machines/all-machines`);
  console.log(`   - GET /api/storage/list`);
});

export default app;
