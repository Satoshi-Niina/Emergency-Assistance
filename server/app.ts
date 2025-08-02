import express, { Request, Response } from 'express';
import session from 'express-session';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import * as path from 'path';
import * as fs from 'fs';
import authRouter from './routes/auth.js';
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
import { registerDataProcessorRoutes } from './routes/data-processor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// サーバー起動時に重要なパス・存在有無をログ出力
function logPathStatus(label: string, relPath: string) {
  const absPath = path.resolve(__dirname, relPath);
  const exists = fs.existsSync(absPath);
  console.log(`🔎 [起動時パス確認] ${label}: ${absPath} (exists: ${exists})`);
}

logPathStatus('knowledge-base/images', '../../knowledge-base/images');
logPathStatus('knowledge-base/data', '../../knowledge-base/data');
logPathStatus('knowledge-base/troubleshooting', '../../knowledge-base/troubleshooting');
logPathStatus('.env', '../../.env');
logPathStatus('OpenAI API KEY', process.env.OPENAI_API_KEY ? '[SET]' : '[NOT SET]');
logPathStatus('DATABASE_URL', process.env.DATABASE_URL ? '[SET]' : '[NOT SET]');

// 環境変数はindex.tsで読み込まれるため、ここでは読み込み不要
console.log('🔧 app.ts: 環境変数確認:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
  SESSION_SECRET: process.env.SESSION_SECRET ? '[SET]' : '[NOT SET]'
});

const app = express();

// CORS設定 - 必要なヘッダーを追加
app.use(cors({
  origin: 'http://localhost:5002',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Origin', 
    'Accept', 
    'Cookie', 
    'credentials',
    'cache-control',
    'Cache-Control',
    'pragma',
    'Pragma'
  ],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// OPTIONSリクエストの明示的処理
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5002');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin, Accept, Cookie, credentials, cache-control, Cache-Control, pragma, Pragma');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Expose-Headers', 'Set-Cookie');
  res.status(204).end();
});

// Cookieパーサーを追加
app.use(cookieParser());

// JSONパース
app.use(express.json());

// セッション設定 - 認証維持のため改善
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-session-secret-for-development-only',
  resave: true, // セッションを常に保存
  saveUninitialized: false,
  cookie: {
    secure: false, // 開発環境ではfalse
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24, // 24時間
    path: '/'
  },
  name: 'emergency-assistance-session' // セッション名を明示的に設定
}));

// セッションデバッグミドルウェア
app.use((req, res, next) => {
  console.log('🔍 Session Debug:', {
    sessionId: req.sessionID,
    userId: req.session?.userId,
    userRole: req.session?.userRole,
    cookies: req.headers.cookie,
    path: req.path,
    method: req.method
  });
  next();
});

// ヘルスチェックAPI
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 認証ルート
app.use('/api/auth', authRouter);
app.use('/api/tech-support', techSupportRouter);

// チャットルート
registerChatRoutes(app);

// トラブルシューティングルート
app.use('/api/troubleshooting', troubleshootingRouter);

// 新規APIルート登録
app.use('/api/base-data', baseDataRouter);
app.use('/api/flows', flowsRouter);
app.use('/api/knowledge', knowledgeRouter);
app.use('/api/history', historyRouter);
app.use('/api/emergency-guide', emergencyGuideRouter);

// 不足していたルートを追加
app.use('/api/users', usersRouter);
app.use('/api/machines', machinesRouter);

// 機械管理APIの直接ルート（/api/machine-types, /api/all-machines）
app.get('/api/machine-types', async (req, res) => {
  try {
    console.log('🔍 機種一覧取得リクエスト（直接ルート）');
    
    // Content-Typeを明示的に設定
    res.setHeader('Content-Type', 'application/json');
    
    const { db } = await import('./db/index.js');
    const { sql } = await import('drizzle-orm');
    
    const result = await db.execute(
      sql`SELECT id, machine_type_name FROM machine_types ORDER BY machine_type_name`
    );
    
    console.log(`✅ 機種一覧取得完了: ${result.length}件`);
    
    res.json({
      success: true,
      data: result,
      total: result.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 機種一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '機種一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/all-machines', async (req, res) => {
  try {
    console.log('🔍 全機械データ取得リクエスト（直接ルート）');
    
    // Content-Typeを明示的に設定
    res.setHeader('Content-Type', 'application/json');
    
    const { db } = await import('./db/index.js');
    const { sql } = await import('drizzle-orm');
    
    const result = await db.execute(sql`
      SELECT 
        mt.id as type_id,
        mt.machine_type_name,
        m.id as machine_id,
        m.machine_number
      FROM machine_types mt
      LEFT JOIN machines m ON mt.id = m.machine_type_id
      ORDER BY mt.machine_type_name, m.machine_number
    `);
    
    // 機種ごとにグループ化
    const groupedData = result.reduce((acc: any, row: any) => {
      const typeName = row.machine_type_name;
      if (!acc[typeName]) {
        acc[typeName] = {
          type_id: row.type_id,
          machine_type_name: typeName,
          machines: []
        };
      }
      if (row.machine_id) {
        acc[typeName].machines.push({
          id: row.machine_id,
          machine_number: row.machine_number
        });
      }
      return acc;
    }, {});
    
    console.log(`✅ 全機械データ取得完了: ${Object.keys(groupedData).length}機種`);
    
    res.json({
      success: true,
      data: Object.values(groupedData),
      total: Object.keys(groupedData).length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 全機械データ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '機械データの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// データプロセッサールート
registerDataProcessorRoutes(app);

// メインルート登録（重複を避けるため、基本的なルートのみ）
try {
  registerRoutes(app);
  console.log('✅ 全てのルートが正常に登録されました');
} catch (error) {
  console.error('❌ ルート登録エラー:', error);
}

// サーバー起動処理
const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

export default app;