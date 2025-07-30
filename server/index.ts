import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import bodyParser from "body-parser";
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Request, Response } from 'express';

// 認証ルート
import { authRouter } from './routes/auth.js';
import { troubleshootingRouter } from './routes/troubleshooting.js';
import { emergencyGuideRouter } from "./routes/emergency-guide-router.js";
import { registerRoutes } from "./routes/index.js";
import { createDefaultUsers } from "./scripts/create-default-users.js";
import { connectDB } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数の読み込み
try {
  dotenv.config({ path: path.join(__dirname, '.env') });
  dotenv.config({ path: path.join(__dirname, '../.env') });
  console.log('✅ 環境変数読み込み完了');
} catch (error) {
  console.error('❌ 環境変数読み込みエラー:', error);
}

console.log('🚀 サーバー起動開始');
console.log(`💾 データモード: ${process.env.DATA_MODE || 'file'}`);

const app = express();
const port = process.env.PORT || 3001;

// 基本ミドルウェア設定
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS設定
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:4173',
  'http://localhost:5001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:5001'
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

// Replit環境の場合
if (process.env.REPLIT || process.env.REPL_SLUG) {
  const replitHost = process.env.REPL_URL || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  if (replitHost) {
    allowedOrigins.push(replitHost);
    allowedOrigins.push(`${replitHost}:3001`);
    allowedOrigins.push(`${replitHost}:5000`);
  }
  // 現在のReplitドメインも追加
  const currentDomain = 'https://ceb3a872-0092-4e86-a990-adc5b271598b-00-tlthbuz5ebfd.sisko.replit.dev';
  allowedOrigins.push(currentDomain);
  allowedOrigins.push(`${currentDomain}:3001`);
  allowedOrigins.push(`${currentDomain}:5000`);
}

app.use(cors({
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  origin: function (origin: string | undefined, callback: Function) {
    console.log('🔍 CORS チェック:', { origin, allowedOrigins });

    if (!origin) {
      console.log('✅ CORS許可: オリジンなし（同一オリジン）');
      return callback(null, true);
    }

    if (origin.includes('replit.dev') || origin.includes('replit.app') || origin.includes('repl.co')) {
      console.log('✅ CORS許可: Replit環境');
      return callback(null, true);
    }

    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (origin === allowedOrigin) return true;
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      console.log('✅ CORS許可: 許可されたオリジン');
      callback(null, true);
    } else {
      console.log('❌ CORS拒否: 許可されていないオリジン');
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

// セッション設定
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  })
);

// リクエストログミドルウェア
app.use('*', (req: any, res: any, next: any) => {
  console.log(`\n🔍 [${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ===== API専用ミドルウェア（静的ファイル配信より前に処理） =====
app.use('/api', (req: any, res: any, next: any) => {
  // すべてのAPIリクエストに対してJSONヘッダーを強制設定
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache');

  console.log('🔍 [API Route Handler] 受信:', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl
  });

  next();
});

// ===== API ROUTE DEFINITIONS START =====

// テストエンドポイント
app.get('/api/test', (req: any, res: any) => {
  console.log('🧪 テストエンドポイント呼び出し');
  res.json({ message: 'API is working correctly' });
});

// ヘルスチェックエンドポイント
app.get('/api/health', (req: any, res: any) => {
  console.log('🏥 ヘルスチェックリクエスト受信');
  res.status(200).json({
    success: true,
    message: 'サーバーは正常に動作しています',
    timestamp: new Date().toISOString(),
    dataMode: process.env.DATA_MODE || 'file'
  });
});

// 認証ルート
if (authRouter) {
  console.log('✅ 認証ルート登録: /api/auth');
  app.use('/api/auth', authRouter);
} else {
  console.error('❌ authRouter is not valid:', authRouter);
}

// Troubleshootingルート
console.log('✅ Troubleshootingルート登録: /api/troubleshooting');
app.use('/api/troubleshooting', troubleshootingRouter);

// 基本的なAPIルートハンドラー
app.use('/api/chats/:chatId/last-export', (req: any, res: any) => {
  console.log('📡 最後のエクスポート履歴リクエスト:', {
    chatId: req.params.chatId,
    method: req.method
  });
  res.status(200).json({
    success: true,
    hasExport: false,
    message: 'エクスポート履歴がありません'
  });
});

// その他のAPIルート登録
console.log('🔧 その他APIルート登録中...');
registerRoutes(app);

// API専用404エラーハンドラー（静的ファイル配信より前）
app.use('/api/*', (req: any, res: any, next: any) => {
  if (res.headersSent) {
    return next();
  }

  console.log('❌ API 404エラー:', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl
  });

  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// ===== API ROUTE DEFINITIONS END =====

// ===== 静的ファイル配信設定（APIルートより後に配置） =====
console.log('🔧 静的ファイル配信設定中...');

// 画像配信用の静的ファイルルート
app.use('/api/emergency-flow/image', express.static(path.join(__dirname, '../knowledge-base/images/emergency-flows')));
console.log('✅ 画像配信ルート設定完了');

// Reactアプリのビルドファイル配信
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));
console.log('✅ Reactアプリ静的ファイル配信設定完了:', clientDistPath);

// ===== SPA support - すべてのAPIでないルートをindex.htmlにフォールバック =====
app.get('*', (req: any, res: any) => {
  // APIリクエストは除外（404 JSONを返す）
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      error: 'API endpoint not found',
      path: req.path,
      method: req.method
    });
  }

  // その他のパスはSPAのindex.htmlを返す
  const indexPath = path.join(clientDistPath, 'index.html');
  console.log('📄 SPAフォールバック:', { path: req.path, indexPath });
  res.sendFile(indexPath);
});

// ===== エラーハンドリング =====

// API専用エラーハンドラー
app.use('/api/*', (error: any, req: any, res: any, next: any) => {
  console.error('🚨 [APIエラー]:', {
    message: error.message,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// グローバルエラーハンドリング
app.use((error: any, req: any, res: any, next: any) => {
  console.error('🚨 [グローバルエラー]:', {
    message: error.message,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  if (res.headersSent) {
    return next(error);
  }

  if (req.path.startsWith('/api/')) {
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal Server Error',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(500).send('Internal Server Error');
  }
});

// プロセスエラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('❌ [未処理例外]:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [未処理Promise拒否]:', {
    reason: reason,
    timestamp: new Date().toISOString()
  });
  if (process.env.NODE_ENV === 'production') {
    setTimeout(() => process.exit(1), 1000);
  }
});

// サーバー起動
const server = app.listen(port, '0.0.0.0', async () => {
  console.log(`🚀 Server successfully started on http://0.0.0.0:${port}`);
  console.log(`🌐 Local access: http://localhost:${port}`);
  console.log(`📂 Working directory: ${process.cwd()}`);
  console.log(`🔧 Node environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Data mode: ${process.env.DATA_MODE || 'file'}`);
  console.log(`📄 Client dist path: ${clientDistPath}`);

  // データベース接続テスト
  try {
    console.log('🔄 データベース接続テスト開始...');
    await connectDB();
    console.log('✅ データベース接続成功');
  } catch (error) {
    console.error('❌ データベース接続エラー:', error);
  }

  // デフォルトユーザー作成
  try {
    console.log('🔄 デフォルトユーザー作成開始...');
    await createDefaultUsers();
    console.log('✅ デフォルトユーザー作成完了');
  } catch (error) {
    console.error('❌ デフォルトユーザー作成エラー:', error);
  }
});

server.on('error', (error: any) => {
  console.error('❌ [サーバーエラー]:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ ポート ${port} は既に使用されています`);
  }
  process.exit(1);
});

console.log('✅ サーバーindex.tsファイルの終端');