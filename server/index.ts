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

// デバッグ用: 全リクエストのログ
app.use((req, res, next) => {
  console.log(`📨 [${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  next();
});

// 画像配信は認証なしでOK
app.use('/api/emergency-flow/image', express.static(path.join(__dirname, '../knowledge-base/images/emergency-flows')));
console.log('✅ 画像配信ルート設定完了');

// 認証が必要なAPIルートはこの下に書く
app.use("/api/auth", authRouter);
console.log('✅ 認証ルート設定完了');

app.use("/api/emergency-guides", emergencyGuideRouter);
console.log('✅ 緊急ガイドルート設定完了');

registerRoutes(app);
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
  console.log('🔍 [404] 未定義ルート:', req.originalUrl);
  res.status(404).json({
    success: false,
    error: 'ルートが見つかりません',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
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