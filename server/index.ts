
import 'dotenv/config';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Emergency Assistance Development Server
// Version: 1.0.0-dev
// Last Updated: 2024-12-19

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数の読み込み設定
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

console.log('🔧 環境変数読み込み開始:', {
  NODE_ENV,
  isProduction,
  cwd: process.cwd(),
  __dirname
});

// 環境変数ファイルの読み込み（優先順位順）
const envPaths = [
  // 1. ルートディレクトリの環境別ファイル
  path.resolve(process.cwd(), `.env.${NODE_ENV}.local`),
  path.resolve(process.cwd(), `.env.${NODE_ENV}`),
  // 2. ルートディレクトリの.env
  path.resolve(process.cwd(), '.env'),
  // 3. サーバーディレクトリの環境別ファイル
  path.resolve(__dirname, `.env.${NODE_ENV}.local`),
  path.resolve(__dirname, `.env.${NODE_ENV}`),
  // 4. サーバーディレクトリの.env
  path.resolve(__dirname, '.env'),
];

// 各パスで.envファイルを読み込み
let loadedEnvFile = null;
for (const envPath of envPaths) {
  try {
    const result = dotenv.config({ path: envPath });
    if (result.parsed && Object.keys(result.parsed).length > 0) {
      loadedEnvFile = envPath;
      console.log('✅ 環境変数ファイル読み込み成功:', envPath);
      console.log('📝 読み込まれた環境変数:', Object.keys(result.parsed));
      break;
    }
  } catch (error) {
    console.log('⚠️ 環境変数ファイル読み込みエラー:', envPath, error);
  }
}

if (!loadedEnvFile) {
  console.log('⚠️ 環境変数ファイルが見つかりません。デフォルト値を使用します。');
  console.log('🔍 試行したパス:', envPaths);
}

// 開発環境用のデフォルト環境変数設定
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'dev-secret';
  console.log('[DEV] JWT_SECRET not set, using development default');
}

if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = 'dev-session-secret-for-development-only';
  console.log('[DEV] SESSION_SECRET not set, using development default');
}

if (!process.env.VITE_API_BASE_URL) {
  process.env.VITE_API_BASE_URL = 'http://localhost:3001';
  console.log('[DEV] VITE_API_BASE_URL not set, using development default');
}

if (!process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL = 'http://localhost:5002';
  console.log('[DEV] FRONTEND_URL not set, using development default');
}

// 重要な環境変数の確認
console.log("[DEV] Development environment variables loaded:", {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL ? "SET" : "NOT SET",
  JWT_SECRET: process.env.JWT_SECRET ? "SET" : "NOT SET",
  SESSION_SECRET: process.env.SESSION_SECRET ? "SET" : "NOT SET",
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL ? "SET" : "NOT SET",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5002",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "SET" : "NOT SET",
  loadedEnvFile,
  PWD: process.cwd(),
  __dirname: __dirname
});

// OpenAI APIキーの確認
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
  console.warn('⚠️ OpenAI APIキーが設定されていません。フロー生成機能は使用できません。');
  console.warn('🔧 解決方法: .envファイルにOPENAI_API_KEYを設定してください');
  console.warn('📝 例: OPENAI_API_KEY=sk-your-actual-api-key-here');
} else {
  console.log('✅ OpenAI APIキーが設定されています');
}

// DATABASE_URLが設定されていない場合はエラーで停止
if (!process.env.DATABASE_URL) {
  console.error('❌ 致命的エラー: DATABASE_URLが設定されていません');
  console.error('🔧 解決方法: .envファイルを作成し、DATABASE_URLを設定してください');
  console.error('📝 例: DATABASE_URL=postgresql://postgres:password@localhost:5432/emergency_assistance');
  process.exit(1);
}

console.log("[DEV] Development server starting...");

// app.tsから設定済みのExpressアプリケーションをインポート
import app from './app.js';
const PORT = Number(process.env.PORT) || 3001;
const isDevelopment = process.env.NODE_ENV !== 'production';

// CORS設定はapp.tsで管理するため、ここでは設定しない
console.log('🔧 CORS設定はapp.tsで管理されます');

// app.tsで設定済みのため、ここでは追加設定のみ行う
console.log('🔧 app.tsの設定を使用します');

// 開発環境用のリクエストログ（追加）
app.use((req, res, next) => {
  console.log('📡 [DEV] Request:', {
    method: req.method,
    url: req.url,
    path: req.path,
    origin: req.headers.origin,
    host: req.headers.host,
    timestamp: new Date().toISOString()
  });
  
  next();
});

// デバッグ用エンドポイント
app.get('/api/debug/env', (req, res) => {
  console.log('🔍 デバッグエンドポイント呼び出し: /api/debug/env');
  res.json({
    success: true,
    data: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
      SESSION_SECRET: process.env.SESSION_SECRET ? '[SET]' : '[NOT SET]',
      JWT_SECRET: process.env.JWT_SECRET ? '[SET]' : '[NOT SET]',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '[SET]' : '[NOT SET]',
      loadedEnvFile,
      timestamp: new Date().toISOString()
    }
  });
});

// ヘルスチェックエンドポイント（統一された実装）
app.get('/health', (req, res) => {
  console.log('🔍 ヘルスチェック呼び出し: /health');
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL ? 'configured' : 'not configured',
    service: 'emergency-assistance-backend'
  });
});

// API用ヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
  console.log('🔍 ヘルスチェック呼び出し: /api/health');
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL ? 'configured' : 'not configured',
    service: 'emergency-assistance-backend'
  });
});

// その他のルートの読み込み
import { registerRoutes } from './routes/index.js';
registerRoutes(app);

// 開発環境用のエラーハンドリング（簡潔版）
// app.ts で基本的なエラーハンドリングは実装済み

// 開発環境用のグレースフルシャットダウン
const gracefulShutdown = () => {
  console.log('[DEV] Shutting down development server...');
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// データベース接続確認関数（app.tsから取得）
async function dbCheck(): Promise<{ success: boolean; message: string }> {
  try {
    const { db } = await import('./db/index.js');
    
    console.log('🔍 データベース接続確認中...');
    const result = await db.execute('SELECT 1 as test');
    
    if (result && result.length > 0) {
      console.log('✅ データベース接続成功: PostgreSQL接続が正常に動作しています');
      return { success: true, message: 'PostgreSQL接続が正常に動作しています' };
    } else {
      console.log('⚠️ データベース接続警告: クエリは実行されましたが結果が空です');
      return { success: false, message: 'データベースクエリの結果が空です' };
    }
  } catch (error) {
    console.error('❌ データベース接続エラー:', error);
    const errorMessage = error instanceof Error ? error.message : 'データベース接続に失敗しました';
    return { success: false, message: errorMessage };
  }
}

// 開発サーバーの起動
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 [DEV] Development server running on http://0.0.0.0:${PORT}`);
  console.log(`🔧 [DEV] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 [DEV] Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 [DEV] Auth endpoint: http://localhost:${PORT}/api/auth/login`);
  console.log(`👤 [DEV] Demo login: niina / 0077`);
  
  // 起動時にデータベース接続確認を実行
  const dbCheckResult = await dbCheck();
  if (dbCheckResult.success) {
    console.log('🎉 起動完了: バックエンドサーバーとデータベースの準備ができました');
  } else {
    console.warn('⚠️ 警告: データベース接続に問題があります -', dbCheckResult.message);
  }
});
