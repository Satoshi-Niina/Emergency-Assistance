// UTF-8エンコーディング設定
process.env.LANG = 'ja_JP.UTF-8';
process.env.LC_ALL = 'ja_JP.UTF-8';

import express, { Request, Response } from 'express';
import session from 'express-session';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { securityHeaders, generalLimiter, secureCORS } from './middleware/security';
import { securityMonitoring, logSecurityEvent } from './middleware/monitoring';
import { fileURLToPath } from 'url';
import * as path from 'path';
import * as fs from 'fs';
import authRouter from './routes/auth-secure.js';
import userRegistrationRouter from './routes/user-registration.js';
import securityTestRouter from './routes/security-test.js';
import { techSupportRouter } from './routes/tech-support.js';
import { registerChatRoutes } from './routes/chat.js';
import troubleshootingRouter from './routes/troubleshooting.js';
import { registerRoutes } from './routes.js';
import { baseDataRouter } from './routes/base-data.js';
import { flowsRouter } from './routes/flows.js';
import { knowledgeRouter } from './routes/knowledge.js';
import { historyRouter } from './routes/history.js';
import emergencyGuideRouter from './routes/emergency-guide.js';
import { usersRouter } from './routes/users.js';
import machinesRouter from './routes/machines.js';
import userManagementRouter from './routes/user-management.js';
import debugAuthRouter from './routes/debug-auth.js';
import fixUsersRouter from './routes/fix-users.js';
import directFixRouter from './routes/direct-fix.js';
import emergencyFixRouter from './routes/emergency-fix.js';
import { registerDataProcessorRoutes } from './routes/data-processor.js';
import { usersDebugRouter } from './routes/users-debug.js';
import { debugRouter } from './routes/debug.js';
import systemCheckRouter from './routes/system-check.js';
import troubleshootingQARouter from './routes/troubleshooting-qa.js';
import configRouter from './routes/config.js';
import ingestRouter from './routes/ingest.js';
import searchRouter from './routes/search.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// サーバー起動時に重要なパス・存在有無をログ出力
function logPathStatus(label: string, relPath: string) {
  const absPath = path.resolve(__dirname, relPath);
  const exists = fs.existsSync(absPath);
  console.log(`🔎 [起動時パス確認] ${label}: ${absPath} (exists: ${exists})`);
  return { absPath, exists };
}

// 必要なディレクトリを自動作成
function ensureDirectoryExists(dirPath: string, label: string) {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ ディレクトリを作成しました: ${label} (${dirPath})`);
    } catch (error) {
      console.error(`❌ ディレクトリ作成エラー: ${label}`, error);
    }
  } else {
    console.log(`✅ ディレクトリが存在します: ${label} (${dirPath})`);
  }
}

// 必要なディレクトリを確認・作成
const knowledgeBasePath = path.resolve(__dirname, '../../knowledge-base');
const imagesPath = path.join(knowledgeBasePath, 'images');
const dataPath = path.join(knowledgeBasePath, 'data');
const troubleshootingPath = path.join(knowledgeBasePath, 'troubleshooting');
const tempPath = path.join(knowledgeBasePath, 'temp');
const qaPath = path.join(knowledgeBasePath, 'qa');
const jsonPath = path.join(knowledgeBasePath, 'json');
const backupsPath = path.join(knowledgeBasePath, 'backups');

ensureDirectoryExists(knowledgeBasePath, 'knowledge-base');
ensureDirectoryExists(imagesPath, 'knowledge-base/images');
ensureDirectoryExists(dataPath, 'knowledge-base/data');
ensureDirectoryExists(troubleshootingPath, 'knowledge-base/troubleshooting');
ensureDirectoryExists(tempPath, 'knowledge-base/temp');
ensureDirectoryExists(qaPath, 'knowledge-base/qa');
ensureDirectoryExists(jsonPath, 'knowledge-base/json');
ensureDirectoryExists(backupsPath, 'knowledge-base/backups');

logPathStatus('.env', '../../.env');
logPathStatus('OpenAI API KEY', process.env.OPENAI_API_KEY ? '[SET]' : '[NOT SET]');
logPathStatus('DATABASE_URL', process.env.DATABASE_URL ? '[SET]' : '[NOT SET]');

// 環境変数の確認
console.log('🔧 app.ts: 環境変数確認:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
  SESSION_SECRET: process.env.SESSION_SECRET ? '[SET]' : '[NOT SET]',
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL ? '[SET]' : '[NOT SET]',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5002'
});

const app = express();

// セキュリティヘッダーを最初に設定
app.use(securityHeaders);

// セキュリティ監視を有効化
app.use(securityMonitoring);

// 一般的なレート制限
app.use(generalLimiter);

// CORS設定 - セキュリティ強化
const isProduction = process.env.NODE_ENV === 'production';
const isReplitEnvironment = process.env.REPLIT_ENVIRONMENT === 'true' || process.env.REPLIT_ID;
const isAzureEnvironment = process.env.WEBSITE_SITE_NAME || process.env.AZURE_ENVIRONMENT;

// フロントエンドURLの取得（環境変数から優先、デフォルトはlocalhost:5002）
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5002';

// 許可するオリジンのリスト（環境別）
const getAllowedOrigins = () => {
  const baseOrigins = [
    FRONTEND_URL, // 環境変数から取得したフロントエンドURLを優先
    'https://witty-river-012f39e00.1.azurestaticapps.net', // 本番環境のStatic Web App URL
    'http://localhost:5002', 
    'http://127.0.0.1:5002',
    'http://localhost:5003',
    'http://127.0.0.1:5003',
    'http://localhost:5004',
    'http://127.0.0.1:5004',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173', // Vite開発サーバー
    'http://127.0.0.1:5173',
    'http://localhost:3001',
    'http://127.0.0.1:3001'
  ];

  // Replit環境の場合
  if (isReplitEnvironment) {
    baseOrigins.push(
      'https://*.replit.app',
      'https://*.replit.dev'
    );
  }

  // Azure環境の場合
  if (isAzureEnvironment) {
    baseOrigins.push(
      'https://*.azurewebsites.net',
      'https://*.azure.com',
      'https://*.azurestaticapps.net' // Azure Static Web Appsのサポート追加
    );
  }

  return baseOrigins;
};

// セキュアなCORS設定を使用
app.use(secureCORS);

// OPTIONSリクエストの明示的処理
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();
  
  // ワイルドカードドメインのチェック
  const isAllowed = !origin || allowedOrigins.some(allowedOrigin => {
    if (allowedOrigin.includes('*')) {
      const pattern = allowedOrigin.replace('*', '.*');
      return new RegExp(pattern).test(origin);
    }
    return allowedOrigin === origin;
  });
  
  if (isAllowed) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin, Accept, Cookie, credentials, cache-control, Cache-Control, pragma, Pragma');
  res.header('Access-Control-Allow-Credentials', 'true'); // 必須設定 - セッション維持のため
  res.header('Access-Control-Expose-Headers', 'Set-Cookie');
  res.status(204).end();
});

// Cookieパーサーを追加
app.use(cookieParser());

// JSONパース - UTF-8エンコーディング設定
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// UTF-8エンコーディングのレスポンスヘッダー設定（APIエンドポイントのみ）
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// CORSヘッダーを確実に設定するミドルウェア
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();
  
  // ワイルドカードドメインのチェック
  const isAllowed = !origin || allowedOrigins.some(allowedOrigin => {
    if (allowedOrigin.includes('*')) {
      const pattern = allowedOrigin.replace('*', '.*');
      return new RegExp(pattern).test(origin);
    }
    return allowedOrigin === origin;
  });
  
  if (isAllowed && origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin, Accept, Cookie, credentials, cache-control, Cache-Control, pragma, Pragma');
  res.header('Access-Control-Expose-Headers', 'Set-Cookie');
  
  next();
});

// セッション設定 - 認証維持のため改善
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'dev-session-secret-for-development-only',
  resave: true, // セッションを常に保存
  saveUninitialized: false,
  cookie: {
    secure: (isProduction || isReplitEnvironment || isAzureEnvironment) ? true : false, // 明示的にbooleanに変換
    httpOnly: true,
    sameSite: (isProduction || isReplitEnvironment || isAzureEnvironment) ? 'none' as const : 'lax' as const,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7日間
    path: '/',
    domain: undefined // 明示的にundefinedに設定
  },
  name: 'emergency-assistance-session', // セッション名を統一
  rolling: true // セッションを更新するたびに期限を延長
};

console.log('🔧 セッション設定:', {
  secure: sessionConfig.cookie.secure,
  sameSite: sessionConfig.cookie.sameSite,
  isProduction,
  isReplitEnvironment,
  isAzureEnvironment
});

app.use(session(sessionConfig));

// セッションデバッグミドルウェア
app.use((req, res, next) => {
  console.log('🔍 Session Debug:', {
    sessionId: req.sessionID,
    userId: req.session?.userId,
    userRole: req.session?.userRole,
    cookies: req.headers.cookie,
    path: req.path,
    method: req.method,
    origin: req.headers.origin,
    host: req.headers.host,
    referer: req.headers.referer
  });
  next();
});

// ★ 認証より前: CSP設定と画像配信
const KB_BASE = process.env.KNOWLEDGE_BASE_PATH
  ? process.env.KNOWLEDGE_BASE_PATH.trim()
  : path.resolve(__dirname, '../knowledge-base'); // フォールバック

console.log('🔧 Knowledge Base Path:', KB_BASE);

// CSP設定（data:image/...を許可、インラインスクリプトを許可）
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline';"
  );
  next();
});

// 画像の静的配信（knowledge-base/images）
app.use('/api/images', express.static(path.join(KB_BASE, 'images'), {
  fallthrough: true,
  etag: true,
  maxAge: '7d',
}));

// favicon.icoの404エラーを解決
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// テストファイル用の明示的なHTMLルート
app.get('/test-simple-images.html', (req, res) => {
  const filePath = path.join(__dirname, '../public/test-simple-images.html');
  console.log('📄 テストファイル配信:', filePath);
  
  if (fs.existsSync(filePath)) {
    // Content-Typeを明示的に設定
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // ファイルを読み込んで送信
    const fileContent = fs.readFileSync(filePath, 'utf8');
    res.send(fileContent);
    console.log('✅ テストファイル配信成功 - Content-Type: text/html');
  } else {
    res.status(404).json({ error: 'Test file not found' });
    console.log('❌ テストファイルが見つかりません');
  }
});

// publicディレクトリの静的ファイル配信（その他のファイル用）
app.use(express.static(path.join(__dirname, '../public'), {
  etag: true,
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    console.log('📄 静的ファイル配信:', filePath);
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      console.log('✅ HTML Content-Type設定:', 'text/html; charset=utf-8');
    }
  }
}));

// エクスポートJSONの詳細取得（knowledge-base/exports）
app.get('/api/history/file', (req, res) => {
  const name = String(req.query.name || '');
  if (!name) return res.status(400).json({ error: 'name is required' });
  const file = path.join(KB_BASE, 'exports', name);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'not found' });
  try {
    const raw = fs.readFileSync(file, 'utf8');
    res.type('application/json').send(raw);
  } catch {
    res.status(500).json({ error: 'read error' });
  }
});

// ヘルスチェックルート
import { healthRouter } from './routes/health.js';
app.use('/api/health', healthRouter);

// 基本ヘルスチェック（後方互換性のため残す）
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// セキュアな認証ルート
app.use('/api/auth', authRouter);
app.use('/api/security', securityTestRouter);
app.use('/api/tech-support', techSupportRouter);

// チャットルート
registerChatRoutes(app);

// トラブルシューティングルート
app.use('/api/troubleshooting', troubleshootingRouter);

// トラブルシューティングQAルート
app.use('/api/troubleshooting-qa', troubleshootingQARouter);

// 新規APIルート登録
app.use('/api/base-data', baseDataRouter);
app.use('/api/flows', flowsRouter);
app.use('/api/knowledge', knowledgeRouter);
app.use('/api/history', historyRouter);
app.use('/api/emergency-guide', emergencyGuideRouter);

// 不足していたルートを追加
app.use('/api/users', usersRouter);
app.use('/api/machines', machinesRouter);
app.use('/api/user-management', userManagementRouter);
app.use('/api/debug-auth', debugAuthRouter);
app.use('/api/fix-users', fixUsersRouter);
app.use('/api/direct-fix', directFixRouter);
app.use('/api/emergency-fix', emergencyFixRouter);

// デバッグ用ルートを追加
app.use('/api/debug/users', usersDebugRouter);
app.use('/api/debug', debugRouter);

// RAGシステム用ルートを追加
app.use('/api/config', configRouter);
app.use('/api/ingest', ingestRouter);
app.use('/api/search', searchRouter);

// インタラクティブ診断システム用ルートを追加
import interactiveDiagnosisRouter from './routes/interactive-diagnosis.js';
app.use('/api/interactive-diagnosis', interactiveDiagnosisRouter);

// システムチェックAPIエンドポイント
app.get('/api/db-check', async (req, res) => {
  try {
    const { db } = await import('./db/index.js');
    const { sql } = await import('drizzle-orm');
    
    const result = await db.execute(sql`SELECT NOW() as db_time`);
    
    res.json({
      status: "OK",
      db_time: result[0].db_time
    });
  } catch (error) {
    console.error('DB接続確認エラー:', error);
    res.status(500).json({
      status: "ERROR",
      message: error instanceof Error ? error.message : "データベース接続エラー"
    });
  }
});

// DB疎通確認用の/db-pingエンドポイント
app.get('/db-ping', async (req, res) => {
  try {
    const { db } = await import('./db/index.js');
    const { sql } = await import('drizzle-orm');
    
    const result = await db.execute(sql`SELECT NOW() as current_time, 'Database connection successful' as message`);
    
    res.json({
      status: "healthy",
      message: "Database connection successful",
      current_time: result[0].current_time,
      timestamp: new Date().toISOString(),
      database_url: process.env.DATABASE_URL ? 'configured' : 'not configured'
    });
  } catch (error) {
    console.error('DB ping エラー:', error);
    res.status(500).json({
      status: "error",
      message: error instanceof Error ? error.message : "データベース接続エラー",
      timestamp: new Date().toISOString(),
      database_url: process.env.DATABASE_URL ? 'configured' : 'not configured'
    });
  }
});

app.post('/api/gpt-check', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        status: "ERROR",
        message: "メッセージが指定されていません"
      });
    }

    const { processOpenAIRequest } = await import('./lib/openai.js');
    const reply = await processOpenAIRequest(message, false);
    
    res.json({
      status: "OK",
      reply: reply
    });
  } catch (error) {
    console.error('GPT接続確認エラー:', error);
    res.status(500).json({
      status: "ERROR",
      message: error instanceof Error ? error.message : "GPT接続エラー"
    });
  }
});

// 機械管理APIはmachinesRouterで処理されるため、直接ルートは削除

// データプロセッサールート
registerDataProcessorRoutes(app);

// メインルート登録（重複を避けるため、基本的なルートのみ）
try {
  registerRoutes(app);
  console.log('✅ 全てのルートが正常に登録されました');
} catch (error) {
  console.error('❌ ルート登録エラー:', error);
}

// サーバー起動処理はindex.tsで管理するため、ここでは設定のみ
console.log('✅ Expressアプリケーションの設定が完了しました');

export default app;