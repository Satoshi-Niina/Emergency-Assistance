
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

// サーバー起動時に重要なパス・存在有無をログ出力
async function logPathStatus(label: string, relPath: string) {
  try {
    const absPath = path.resolve(__dirname, relPath);
    const exists = await fs.access(absPath).then(() => true).catch(() => false);
    console.log(`🔎 [起動時パス確認] ${label}: ${absPath} (exists: ${exists})`);
    return exists;
  } catch (error) {
    console.error(`❌ [パス確認エラー] ${label}: ${error}`);
    return false;
  }
}

try {
  await logPathStatus('knowledge-base/images/emergency-flows', '../knowledge-base/images/emergency-flows');
  await logPathStatus('knowledge-base/data', '../knowledge-base/data');
  await logPathStatus('knowledge-base/troubleshooting', '../knowledge-base/troubleshooting');
  await logPathStatus('.env', '.env');
  console.log(`🔎 [環境変数確認] OpenAI API KEY: ${process.env.OPENAI_API_KEY ? '[SET]' : '[NOT SET]'}`);
} catch (error) {
  console.error('❌ [初期化エラー]:', error);
}

console.log('🚀 サーバー起動開始');

// 環境変数の読み込み
try {
  dotenv.config({ path: path.join(__dirname, '.env') });
  dotenv.config({ path: path.join(__dirname, '../.env') });
  console.log('✅ 環境変数読み込み完了');
} catch (error) {
  console.error('❌ 環境変数読み込みエラー:', error);
}

console.log('🔧 Expressインスタンス作成');
const app = express();
const port = process.env.PORT || 3001;
console.log(`🚀 サーバーをポート ${port} で起動中...`);

// 全リクエストログミドルウェア（最優先）
app.use('*', (req: any, res: any, next: any) => {
  console.log(`\n🔍 [${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log('📍 詳細:', {
    url: req.url,
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    method: req.method,
    headers: {
      host: req.headers.host,
      origin: req.headers.origin,
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent']?.substring(0, 50) + '...'
    },
    body: req.method === 'POST' ? req.body : 'N/A'
  });
  next();
});

// ===== CORS設定（JSON APIレスポンス統一のため最優先で設定） =====
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:4173', // Vite preview port
  'http://localhost:5001', // Vite dev port
  'http://127.0.0.1:3000',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:5001'
];

// 環境変数で追加のオリジンが指定されている場合は追加
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

// Replit環境の場合、自動的に3001ポートのオリジンを追加
if (process.env.REPLIT || process.env.REPL_SLUG) {
  const replitHost = process.env.REPL_URL || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  if (replitHost) {
    allowedOrigins.push(replitHost);
    allowedOrigins.push(`${replitHost}:3001`);
    allowedOrigins.push(`${replitHost}:5000`);
    // 現在のReplitドメインも追加
    const currentDomain = 'https://ceb3a872-0092-4e86-a990-adc5b271598b-00-tlthbuz5ebfd.sisko.replit.dev';
    allowedOrigins.push(currentDomain);
    allowedOrigins.push(`${currentDomain}:3001`);
    allowedOrigins.push(`${currentDomain}:5000`);
  }
}

// CORS設定を環境に応じて動的に設定
const corsOptions = {
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  origin: function (origin: string | undefined, callback: Function) {
    console.log('🔍 CORS チェック:', {
      origin: origin,
      allowedOrigins: allowedOrigins
    });

    // リクエストにoriginがない場合（同一オリジンリクエストなど）は許可
    if (!origin) {
      console.log('✅ CORS許可: オリジンなし（同一オリジン）');
      return callback(null, true);
    }

    // Replit環境を特別に処理
    if (origin.includes('replit.dev') || origin.includes('replit.app') || origin.includes('repl.co')) {
      console.log('✅ CORS許可: Replit環境');
      return callback(null, true);
    }

    // 許可されたオリジンをチェック
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      // 正確な一致をチェック
      if (origin === allowedOrigin) return true;

      // ワイルドカードパターンをチェック（例: *.replit.dev）
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
};

app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

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

// ===== API専用ミドルウェア（HTMLレスポンス完全防止、静的ファイル配信より前に処理） =====
app.use('/api', (req: any, res: any, next: any) => {
  // すべてのAPIリクエストに対してJSONヘッダーを強制設定
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache');
  
  console.log('🔍 [API Route Handler] 受信:', {
    method: req.method,
    path: req.path,  
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent']?.substring(0, 50)
    }
  });

  // 認証関連のリクエストは特別にログ出力
  if (req.path.startsWith('/auth')) {
    console.log('🔐 [認証API] 詳細:', {
      method: req.method,
      path: req.path,
      body: req.method === 'POST' ? req.body : 'N/A',
      hasSession: !!req.session
    });
  }

  next();
});

// ===== API ROUTE DEFINITIONS START（静的ファイル配信より前に完全に配置） =====
console.log('🛣️ ルーティング設定開始');

// ===== テストエンドポイント（API動作確認用） =====
// 確認方法: GET /api/test → { message: 'API is working correctly' }
app.get('/api/test', (req: any, res: any) => {
  console.log('🧪 テストエンドポイント呼び出し');
  res.json({ message: 'API is working correctly' });
});

// ===== ヘルスチェックエンドポイント（認証テスト用） =====
app.get('/api/health', (req: any, res: any) => {
  console.log('🏥 ヘルスチェックリクエスト受信');
  res.status(200).json({
    success: true,
    message: 'サーバーは正常に動作しています',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: [
        'POST /api/auth/login',
        'POST /api/auth/register', 
        'POST /api/auth/logout',
        'GET /api/auth/me'
      ],
      troubleshooting: [
        'GET /api/troubleshooting/list',
        'GET /api/troubleshooting/detail/:id',
        'POST /api/troubleshooting',
        'PUT /api/troubleshooting/:id',
        'DELETE /api/troubleshooting/:id'
      ]
    }
  });
});

// ===== 認証ルート（最優先で登録） =====
console.log('🔧 認証ルート登録中...');
if (authRouter) {
  console.log('✅ authRouter is valid Express router');
  app.use('/api/auth', authRouter);
  console.log('✅ 認証ルート登録完了: /api/auth');
} else {
  console.error('❌ authRouter is not valid:', authRouter);
}

// ===== Troubleshootingルート（認証の次に配置） =====
console.log('🔧 Troubleshootingルート登録中...');
app.use('/api/troubleshooting', troubleshootingRouter);
console.log('✅ Troubleshootingルート登録完了: /api/troubleshooting');

// ===== 基本的なAPIルートハンドラー（404エラー対策） =====
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

// ===== APIルート登録（他のルートも含む） =====
console.log('🔧 APIルート登録中...');
registerRoutes(app);

// ===== API専用404エラーハンドラー（静的ファイル配信より前） =====
// 確認方法: GET /api/xxx → { error: 'API endpoint not found' }
app.use('/api/*', (req: any, res: any, next: any) => {
  // 既に処理されたリクエストはスキップ
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

// ===== 静的ファイル配信の設定（APIルートより後に配置） =====
console.log('🔧 静的ファイル配信設定中...');

// 画像配信用の静的ファイルルート（API処理後に配置）
app.use('/api/emergency-flow/image', express.static(path.join(__dirname, '../knowledge-base/images/emergency-flows')));
console.log('✅ 画像配信ルート設定完了');

// 一般的な静的ファイル配信
app.use(express.static(path.join(__dirname, '../client/dist')));

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
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// ===== エラーハンドリング =====

// API専用エラーハンドラー（HTMLを返さないように）
app.use('/api/*', (error: any, req: any, res: any, next: any) => {
  console.error('🚨 [APIエラー]:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // 必ずJSONで応答
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// グローバルエラーハンドリングミドルウェア
app.use((error: any, req: any, res: any, next: any) => {
  console.error('🚨 [グローバルエラー]:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  if (res.headersSent) {
    return next(error);
  }

  // APIリクエストの場合はJSONで応答
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

// 404ハンドラーでもAPIリクエストはJSONで応答
app.use('*', (req: any, res: any) => {
  console.log(`\n❌ [404 NOT FOUND] ${req.method} ${req.originalUrl}`);
  console.log('📍 詳細情報:', {
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    method: req.method,
    headers: {
      host: req.headers.host,
      origin: req.headers.origin,
      'content-type': req.headers['content-type']
    }
  });

  // APIリクエストの場合はJSONで応答
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      success: false,
      error: 'API endpoint not found',
      message: 'リクエストされたAPIエンドポイントが見つかりません',
      path: req.path,
      originalUrl: req.originalUrl,
      method: req.method,
      availableRoutes: [
        'GET /api/test',
        'GET /api/health',
        'POST /api/auth/login',
        'GET /api/auth/me',
        'POST /api/auth/logout',
        'POST /api/auth/register',
        'GET /api/troubleshooting/list',
        'GET /api/troubleshooting/detail/:id'
      ]
    });
  } else {
    // 非APIリクエストの場合はSPAにフォールバック
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  }
});

// Start the server with error handling
console.log('🔄 サーバーlisten開始');

// プロセスエラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('❌ [未処理例外]:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    pid: process.pid
  });
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [未処理Promise拒否]:', {
    reason: reason,
    promise: promise,
    timestamp: new Date().toISOString(),
    pid: process.pid
  });
  if (process.env.NODE_ENV === 'production') {
    setTimeout(() => process.exit(1), 1000);
  }
});

// メモリ使用量の監視
setInterval(() => {
  const memUsage = process.memoryUsage();
  console.log('📊 [メモリ使用量]:', {
    rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
    external: Math.round(memUsage.external / 1024 / 1024) + 'MB',
    timestamp: new Date().toISOString()
  });
}, 30000);

const server = app.listen(port, '0.0.0.0', async () => {
  console.log(`🚀 Server successfully started on http://0.0.0.0:${port}`);
  console.log(`🌐 Local access: http://localhost:${port}`);
  console.log(`📂 Working directory: ${process.cwd()}`);
  console.log(`🔧 Node environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Data mode: ${process.env.DATA_MODE || 'file'}`);

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
