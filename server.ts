import express from "express";
import cors from "cors";
import session from 'express-session';
import bcrypt from 'bcrypt';
import { Client } from 'pg';

const app = express();

// 環境変数の確認とデフォルト値
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const SESSION_SECRET = process.env.SESSION_SECRET || 'emergency-assistance-session-secret-dev';
const DATABASE_URL = process.env.DATABASE_URL;

console.log('🚀 Emergency Assistance Development Server');
console.log('Environment:', NODE_ENV);
console.log('Port:', PORT);
console.log('Frontend URL:', FRONTEND_URL);
console.log('Database URL exists:', !!DATABASE_URL);

// CORS設定
const corsOptions = {
  origin: [
    FRONTEND_URL,
    'http://localhost:5173',
    'https://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// セッション設定
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // 開発環境ではhttpを許可
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24時間
    sameSite: 'lax'
  },
  name: 'emergency-assistance-session-dev'
}));

// セッション型定義
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userRole?: string;
  }
}

// 認証ミドルウェア
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  console.log('🔐 認証チェック:', {
    sessionId: req.sessionID,
    userId: req.session?.userId,
    userRole: req.session?.userRole,
    url: req.url,
    method: req.method
  });
  
  if (!req.session || !req.session.userId) {
    console.log('❌ 認証失敗: セッションまたはユーザーIDが不正');
    return res.status(401).json({
      success: false,
      error: '認証が必要です'
    });
  }
  
  console.log('✅ 認証成功:', req.session.userId);
  next();
}

// データベース接続ヘルパー
async function createDbClient() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    query_timeout: 30000
  });
  
  await client.connect();
  return client;
}

// 基本的なルート
app.get('/', (req, res) => {
  res.json({ 
    message: 'Emergency Assistance Development Server',
    version: '2.0',
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// ヘルスチェック
app.get('/health', async (req, res) => {
  try {
    if (DATABASE_URL) {
      const client = await createDbClient();
      await client.query('SELECT 1');
      await client.end();
    }
    
    res.json({
      status: 'healthy',
      environment: NODE_ENV,
      database: DATABASE_URL ? 'connected' : 'not configured',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ログインエンドポイント
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'ユーザー名とパスワードが必要です'
      });
    }

    const client = await createDbClient();
    const result = await client.query(
      'SELECT id, username, password, role, display_name FROM users WHERE username = $1',
      [username]
    );
    await client.end();

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'ユーザー名またはパスワードが正しくありません'
      });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'ユーザー名またはパスワードが正しくありません'
      });
    }

    req.session.userId = user.id;
    req.session.userRole = user.role;

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        display_name: user.display_name
      }
    });
  } catch (error) {
    console.error('❌ ログインエラー:', error);
    res.status(500).json({
      success: false,
      error: 'ログイン処理中にエラーが発生しました'
    });
  }
});

// ログアウトエンドポイント
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ ログアウトエラー:', err);
      return res.status(500).json({
        success: false,
        error: 'ログアウト処理中にエラーが発生しました'
      });
    }
    
    res.clearCookie('emergency-assistance-session-dev');
    res.json({
      success: true,
      message: 'ログアウトしました'
    });
  });
});

// 認証状態確認
app.get('/api/auth/me', (req, res) => {
  console.log('🔍 認証状態チェック:', {
    sessionId: req.sessionID,
    userId: req.session?.userId,
    userRole: req.session?.userRole,
    hasSession: !!req.session
  });
  
  if (!req.session || !req.session.userId) {
    console.log('❌ 認証状態確認失敗');
    return res.status(401).json({
      success: false,
      error: '認証されていません'
    });
  }
  
  console.log('✅ 認証状態確認成功');
  res.json({
    success: true,
    user: {
      userId: req.session.userId,
      userRole: req.session.userRole
    }
  });
});

// 機種一覧取得
app.get('/api/machines', requireAuth, async (req, res) => {
  try {
    const client = await createDbClient();
    const result = await client.query(`
      SELECT id, machine_type_name 
      FROM machine_types 
      ORDER BY machine_type_name
    `);
    await client.end();
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 機種一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '機種一覧の取得に失敗しました',
      details: error.message
    });
  }
});

// 全機種データ取得
app.get('/api/machines/all-machines', requireAuth, async (req, res) => {
  try {
    const client = await createDbClient();
    const result = await client.query(`
      SELECT 
        mt.id as machine_type_id,
        mt.machine_type_name,
        array_agg(m.machine_number ORDER BY m.machine_number) as machine_numbers
      FROM machine_types mt
      LEFT JOIN machines m ON mt.id = m.machine_type_id
      GROUP BY mt.id, mt.machine_type_name
      ORDER BY mt.machine_type_name
    `);
    await client.end();
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 全機種データ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '全機種データの取得に失敗しました',
      details: error.message
    });
  }
});

// ユーザー一覧
app.get('/api/users', requireAuth, async (req, res) => {
  try {
    const client = await createDbClient();
    const result = await client.query(
      'SELECT id, username, role, display_name, department, created_at FROM users ORDER BY created_at DESC'
    );
    await client.end();
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ ユーザー一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ユーザー一覧の取得に失敗しました',
      details: error.message
    });
  }
});

// ナレッジベース
app.get('/api/knowledge-base', requireAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        documents: [],
        totalCount: 0,
        message: 'ナレッジベースは準備中です'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ ナレッジベース取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ナレッジベースの取得に失敗しました',
      details: error.message
    });
  }
});

// ナレッジAPIエンドポイント
app.get('/api/knowledge', requireAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      data: [],
      totalCount: 0,
      message: 'ナレッジデータは準備中です',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ ナレッジ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ナレッジの取得に失敗しました',
      details: error.message
    });
  }
});

// トラブルシューティング一覧
app.get('/api/troubleshooting/list', requireAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      data: [],
      totalCount: 0,
      message: 'トラブルシューティングデータは準備中です',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ トラブルシューティング一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'トラブルシューティング一覧の取得に失敗しました',
      details: error.message
    });
  }
});

// 履歴データ
app.get('/api/history', requireAuth, async (req, res) => {
  try {
    const client = await createDbClient();
    const result = await client.query(`
      SELECT * FROM history_items 
      ORDER BY created_at DESC 
      LIMIT 100
    `);
    await client.end();
    
    res.json({
      success: true,
      data: result.rows,
      totalCount: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 履歴データ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '履歴データの取得に失敗しました',
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Development Server is running on port ${PORT}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log(`Environment: ${NODE_ENV}`);
});
