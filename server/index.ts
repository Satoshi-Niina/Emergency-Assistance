import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import bodyParser from "body-parser";
// 認証ルート
import { authRouter } from './routes/auth.js';

// デバッグ用：認証ルーターが正しくインポートされているか確認
console.log('🔍 認証ルーターインポート状況:', {
  authRouterExists: !!authRouter,
  authRouterType: typeof authRouter
});
import { emergencyGuideRouter } from "./routes/emergency-guide-router.js";
import { registerRoutes } from "./routes/index.js";
import { createDefaultUsers } from "./scripts/create-default-users.js";
import { connectDB } from "./db.js";
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// サーバー起動時に重要なパス・存在有無をログ出力
function logPathStatus(label: string, relPath: string) {
  try {
    const absPath = path.resolve(__dirname, relPath);
    const exists = fs.existsSync(absPath);
    console.log(`🔎 [起動時パス確認] ${label}: ${absPath} (exists: ${exists})`);
    return exists;
  } catch (error) {
    console.error(`❌ [パス確認エラー] ${label}: ${error}`);
    return false;
  }
}

try {
  logPathStatus('knowledge-base/images/emergency-flows', '../knowledge-base/images/emergency-flows');
  logPathStatus('knowledge-base/data', '../knowledge-base/data');
  logPathStatus('knowledge-base/troubleshooting', '../knowledge-base/troubleshooting');
  logPathStatus('.env', '.env');
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

console.log(`📡 使用ポート: ${port}`);

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

// ミドルウェア設定
app.use(cors({ 
  origin: ['http://localhost:5000', 'http://172.31.73.194:5000', 'http://0.0.0.0:5000', '*'], 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      sameSite: 'lax', // Adjust SameSite attribute
    },
  })
);

// Serve static files
app.use('/public', express.static(path.join(__dirname, 'public')));

// Routes
console.log('🛣️ ルーティング設定開始');

// デバッグ用: 全リクエストのログ（詳細版）
app.use((req, res, next) => {
  console.log(`📨 [${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log(`🔍 Headers: Origin=${req.headers.origin}, Host=${req.headers.host}, Referer=${req.headers.referer}`);
  console.log(`🔍 Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
  next();
});

// API routes のデバッグ用ハンドラー（ルート登録前に配置）
app.use('/api', (req: any, res: any, next: any) => {
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

// 認証ルート（最優先で登録）
console.log('🔧 認証ルート登録中...');
console.log('📍 authRouter type:', typeof authRouter);
console.log('📍 authRouter is function:', typeof authRouter === 'function');

// authRouterが正しいかチェック
if (authRouter) {
  console.log('✅ authRouter is valid Express router');
  app.use('/api/auth', authRouter);
  console.log('✅ 認証ルート登録完了: /api/auth');

  // ルート確認のためのデバッグ情報
  if (authRouter.stack) {
    console.log('📍 登録された認証ルート:');
    authRouter.stack.forEach((layer: any, index: number) => {
      const path = layer.route?.path || 'middleware';
      const methods = layer.route?.methods ? Object.keys(layer.route.methods) : [];
      console.log(`  [${index}] ${methods.join(',')} ${path}`);
    });
  }
} else {
  console.error('❌ authRouter is not valid:', authRouter);
}

// 画像配信用の静的ファイルルート
app.use('/api/emergency-flow/image', express.static(path.join(__dirname, '../knowledge-base/images/emergency-flows')));
console.log('✅ 画像配信ルート設定完了');

// ヘルスチェックエンドポイント（認証テスト用）
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
      ]
    }
  });
});

// 基本的なAPIルートハンドラー（404エラー対策）
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

// キャッチオール - 認証以外のAPIリクエストに対する一時的な応答
app.use('/api/*', (req: any, res: any) => {
  console.log('⚠️ 未実装APIエンドポイント:', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl
  });
  res.status(501).json({
    success: false,
    message: 'このAPIエンドポイントは現在実装中です',
    endpoint: req.originalUrl,
    method: req.method
  });
});

console.log('⚠️ 認証関連以外のAPIルートは一時的に無効化（デバッグ中）');

// 全ルート設定完了
console.log('✅ 全ルート設定完了');

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

  res.status(500).json({
    success: false,
    error: 'サーバーエラーが発生しました',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// 404ハンドリング
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

  // Expressアプリケーションのルートスタックを詳細に調査
  console.log('\n🔍 [EXPRESS ROUTER STACK 詳細調査]');
  console.log('🛣️ Express app._router.stack:');
  if (app._router && app._router.stack) {
    app._router.stack.forEach((layer: any, index: number) => {
      console.log(`  [${index}] regexp: ${layer.regexp}, methods: ${JSON.stringify(layer.route?.methods || 'N/A')}`);
      console.log(`       path: ${layer.route?.path || 'middleware'}, name: ${layer.name || 'anonymous'}`);

      // サブルーターの場合は詳細を調査
      if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        console.log(`       🔧 Sub-router found with ${layer.handle.stack.length} routes:`);
        layer.handle.stack.forEach((subLayer: any, subIndex: number) => {
          console.log(`         [${subIndex}] ${subLayer.route?.path || 'middleware'} - ${JSON.stringify(subLayer.route?.methods || 'N/A')}`);
        });
      }
    });
  } else {
    console.log('  ❌ No router stack found!');
  }

  // 登録されているルートを表示
  console.log('🛣️ 想定されているAPIルート:');
  console.log('  ✅ POST /api/auth/login');
  console.log('  ✅ GET /api/auth/me'); 
  console.log('  ✅ POST /api/auth/logout');
  console.log('  ✅ POST /api/auth/register');

  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'リクエストされたエンドポイントが見つかりません',
    path: req.path,
    originalUrl: req.originalUrl,
    method: req.method,
    availableRoutes: [
      'POST /api/auth/login',
      'GET /api/auth/me',
      'POST /api/auth/logout',
      'POST /api/auth/register'
    ]
  });
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
  // すぐに終了せず、ログを出力してから終了
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [未処理Promise拒否]:', {
    reason: reason,
    promise: promise,
    timestamp: new Date().toISOString(),
    pid: process.pid
  });
  // Promise拒否では終了しない（開発環境では継続）
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
}, 30000); // 30秒毎にメモリ使用量をログ出力

const server = app.listen(port, '0.0.0.0', async () => {
  console.log(`🚀 Server successfully started on http://0.0.0.0:${port}`);
  console.log(`🌐 Local access: http://localhost:${port}`);
  console.log(`📂 Working directory: ${process.cwd()}`);
  console.log(`🔧 Node environment: ${process.env.NODE_ENV || 'development'}`);

  // データベース接続テスト
  try {
    console.log('🔄 データベース接続テスト開始...');
    await connectDB();
    console.log('✅ データベース接続成功');
  } catch (error) {
    console.error('❌ データベース接続エラー:', error);
    // データベース接続失敗でもサーバーは継続（フォールバック動作）
  }

  // デフォルトユーザー作成
  try {
    console.log('🔄 デフォルトユーザー作成開始...');
    await createDefaultUsers();
    console.log('✅ デフォルトユーザー作成完了');
  } catch (error) {
    console.error('❌ デフォルトユーザー作成エラー:', error);
    // ユーザー作成失敗でもサーバーは継続
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
// 検索ルート
    // 履歴管理ルート
    app.use('/api/history', historyRouter);