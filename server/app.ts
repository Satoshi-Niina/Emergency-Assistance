import express, { Request, Response } from 'express';
import session from 'express-session';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import * as path from 'path';
import * as fs from 'fs';
import authRouter from './routes/auth.js';
import techSupportRouter from './routes/tech-support.js';
import troubleshootingRouter from './routes/troubleshooting.js';
import { registerRoutes } from './routes.js';
import baseDataRouter from './routes/base-data.js';
import flowsRouter from './routes/flows.js';
import knowledgeRouter from './routes/knowledge.js';
import historyRouter from './routes/history.js';
import emergencyGuideRouter from './routes/emergency-guide.js';
import usersRouter from './routes/users.js';
import machinesRouter from './routes/machines.js';
import { registerDataProcessorRoutes } from './routes/data-processor.js';
import usersDebugRouter from './routes/users-debug.js';
import debugRouter from './routes/debug.js';
// import systemCheckRouter from './routes/system-check.js'; // 未使用なら削除
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





// === CORS 設定（CORS_ORIGINS 環境変数を利用、express.json()より上） ===
// CORS_ORIGINS はカンマ区切りの origin リスト。厳密一致で許可する。
app.set('trust proxy', 1);
const origins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

console.log('🔧 CORS allowed origins:', origins.length ? origins : '[none - local dev only]');

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // curlやサーバ間リクエストなど、ブラウザ起点でない場合は許可
    if (origins.includes(origin)) return cb(null, true);
    // 不許可の origin はエラーを投げずに CORS ヘッダを付与しない（ブラウザ側でブロックされる）
    console.log('🚫 CORS blocked origin:', origin);
    return cb(null, false);
  },
  credentials: true
}));

// OPTIONS も同様に扱う
app.options('*', cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (origins.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true
}));

app.use(cookieParser());
app.use(express.json());

// Vary: Originを常に付与
app.use((req, res, next) => {
  res.header('Vary', 'Origin');
  next();
});



// セッション設定 - クロスサイトCookie対応
// cookie: { httpOnly: true, secure: true, sameSite: 'none' } で統一
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'dev-session-secret-for-development-only',
  resave: true,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: 'none' as 'none',
    maxAge: 1000 * 60 * 60 * 24 * 7,
    path: '/',
    domain: undefined
  },
  name: 'emergency-assistance-session',
  rolling: true
};

console.log('🔧 セッション設定:', {
  secure: sessionConfig.cookie.secure,
  sameSite: sessionConfig.cookie.sameSite
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

// CSP設定（data:image/...を許可）
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline';"
  );
  next();
});

// 画像の静的配信（knowledge-base/images）
app.use('/api/images', express.static(path.join(KB_BASE, 'images'), {
  fallthrough: true,
  etag: true,
  maxAge: '7d',
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


// ルートGETエンドポイント（App Service用OK応答）
app.get('/', (req: Request, res: Response) => {
  res.status(200).type('text/plain').send('OK');
});

// 最もシンプルなヘルスチェックエンドポイント
app.get('/health', (req: Request, res: Response) => {
  res.status(200).send('OK');
});

// JSONヘルスチェックエンドポイント
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'emergency-assistance-backend' 
  });
});

/*
====================
【検証手順コメント】
====================
1. GET /api/health が 200 を返すこと
2. CORSプリフライト(OPTIONS)が 200 で、
  Access-Control-Allow-Origin: https://witty-river-012f93e00.1.azurestaticapps.net
  Access-Control-Allow-Credentials: true
  がレスポンスヘッダに付与されること
3. 本番(NODE_ENV=production)でDB接続時にTLSエラーなく接続できること
  (ECONNREFUSEDは到達性問題なのでコード外)
*/

// 認証ルート
app.use('/api/auth', authRouter);
app.use('/api/tech-support', techSupportRouter);

// チャットルート

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