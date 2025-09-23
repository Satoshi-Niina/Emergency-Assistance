import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { users } from './db/schema.js';
import bcrypt from 'bcryptjs';

// ESM用__dirname取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// データベース接続設定
const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://satoshi_niina:SecurePass2025ABC@emergencyassistance-db.postgres.database.azure.com:5432/emergency_assistance?sslmode=require';
const client = postgres(connectionString, {
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
});
const db = drizzle(client);

console.log('🔧 データベース接続設定:', {
  hasConnectionString: !!process.env.DATABASE_URL,
  connectionString: connectionString.substring(0, 50) + '...',
});

// CORS設定
app.use(
  cors({
    origin: [
      'https://witty-river-012f39e00.1.azurestaticapps.net',
      'https://*.azurestaticapps.net', // Static Web Apps のワイルドカードドメイン
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3003',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      'X-Requested-With',
    ],
    optionsSuccessStatus: 200,
  })
);

// プリフライトリクエストの処理
app.options('*', (req, res) => {
  console.log('🔍 OPTIONS request:', req.path);
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Cookie, X-Requested-With'
  );
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// ミドルウェア
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// セッション設定
const isProduction = process.env.NODE_ENV === 'production';
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'production-secret-key-12345',
    resave: true,
    saveUninitialized: false,
    cookie: {
      secure: isProduction ? true : false,
      httpOnly: true,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7日間
      path: '/',
      domain: undefined,
    },
    name: 'emergency-assistance-session',
    rolling: true,
  })
);

console.log('🔧 本番環境セッション設定:', {
  secure: isProduction ? true : false,
  sameSite: isProduction ? 'none' : 'lax',
  isProduction,
});

// リクエストログ
app.use((req, res, next) => {
  console.log(`🔍 本番環境リクエスト: ${req.method} ${req.path}`);

  // CORSヘッダーを明示的に設定
  res.header(
    'Access-Control-Allow-Origin',
    req.headers.origin || 'https://witty-river-012f39e00.1.azurestaticapps.net'
  );
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Cookie, X-Requested-With'
  );

  next();
});

// ヘルスチェック
app.get('/api/health/json', (req, res) => {
  const hasDb = !!process.env.DATABASE_URL;
  const hasBlob = !!process.env.AZURE_STORAGE_CONNECTION_STRING;

  res.json({
    ok: true,
    time: new Date().toISOString(),
    env: {
      hasDb,
      hasBlob,
      nodeEnv: process.env.NODE_ENV || 'development',
    },
  });
});

// CORS設定確認用エンドポイント
app.get('/api/cors-test', (req, res) => {
  console.log('🔍 CORS test request:', {
    origin: req.headers.origin,
    method: req.method,
    path: req.path,
  });

  res.json({
    success: true,
    message: 'CORS設定が正常に動作しています',
    timestamp: new Date().toISOString(),
    origin: req.headers.origin,
  });
});

// デバッグ用ルート
app.get('/api/debug/routes', (req, res) => {
  res.json({
    message: 'API routes are working',
    timestamp: new Date().toISOString(),
    environment: 'production',
    routes: [
      '/api/health/json',
      '/api/users',
      '/api/machines/machine-types',
      '/api/machines/all-machines',
      '/api/storage/list',
    ],
  });
});

// ユーザー管理API
app.get('/api/users', (req, res) => {
  res.json({
    success: true,
    message: 'ユーザー管理API（本番環境）',
    timestamp: new Date().toISOString(),
    users: [],
  });
});

// 機械管理API
app.get('/api/machines/machine-types', (req, res) => {
  res.json({
    success: true,
    message: '機械種別API（本番環境）',
    timestamp: new Date().toISOString(),
    machineTypes: [],
  });
});

app.get('/api/machines/all-machines', (req, res) => {
  res.json({
    success: true,
    message: '全機械API（本番環境）',
    timestamp: new Date().toISOString(),
    machines: [],
  });
});

// 認証API
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('🔐 ログイン試行:', { username });

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'ユーザー名とパスワードが必要です',
      });
    }

    // データベースからユーザーを検索
    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (user.length === 0) {
      console.log('❌ User not found:', username);
      return res.status(401).json({
        success: false,
        error: 'ユーザー名またはパスワードが間違っています',
      });
    }

    const foundUser = user[0];

    // パスワードを検証
    const isValidPassword = await bcrypt.compare(password, foundUser.password);

    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', username);
      return res.status(401).json({
        success: false,
        error: 'ユーザー名またはパスワードが間違っています',
      });
    }

    // セッションにユーザー情報を保存
    req.session.userId = foundUser.id;
    req.session.username = foundUser.username;
    req.session.userRole = foundUser.role;

    console.log('✅ Login successful:', {
      id: foundUser.id,
      username: foundUser.username,
      role: foundUser.role,
    });

    res.json({
      success: true,
      user: {
        id: foundUser.id,
        username: foundUser.username,
        displayName: foundUser.displayName || foundUser.username,
        role: foundUser.role,
        department: foundUser.department || 'General',
      },
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました',
    });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    console.log('🔍 /api/auth/me リクエスト:', {
      session: req.session,
      sessionId: req.session?.id,
      userId: req.session?.userId,
      userRole: req.session?.userRole,
      headers: {
        cookie: req.headers.cookie ? '[SET]' : '[NOT SET]',
        origin: req.headers.origin,
        host: req.headers.host,
        referer: req.headers.referer,
      },
    });

    // セッションからユーザーIDを取得
    const userId = req.session?.userId;

    if (!userId) {
      console.log('❌ No user ID in session');
      return res.status(401).json({
        success: false,
        error: '認証されていません',
      });
    }

    console.log('🔍 Searching user by ID:', userId);
    // データベースからユーザー情報を取得
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      console.log('❌ User not found in database:', userId);
      return res.status(401).json({
        success: false,
        error: 'ユーザーが見つかりません',
      });
    }

    const foundUser = user[0];
    console.log('✅ User found:', {
      id: foundUser.id,
      username: foundUser.username,
      role: foundUser.role,
    });

    return res.json({
      success: true,
      user: {
        id: foundUser.id,
        username: foundUser.username,
        displayName: foundUser.displayName || foundUser.username,
        role: foundUser.role,
        department: foundUser.department || 'General',
      },
    });
  } catch (error) {
    console.error('❌ Get user error:', error);
    return res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました',
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  try {
    console.log('🔓 ログアウト試行:', {
      sessionId: req.session?.id,
      userId: req.session?.userId,
    });

    // セッションを破棄
    req.session.destroy(err => {
      if (err) {
        console.error('❌ Session destroy error:', err);
        return res.status(500).json({
          success: false,
          error: 'ログアウトに失敗しました',
        });
      }

      // クッキーをクリア
      res.clearCookie('emergency-assistance-session');

      console.log('✅ Logout successful');
      res.json({
        success: true,
        message: 'ログアウトしました',
      });
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました',
    });
  }
});

// デバッグエンドポイント
app.get('/api/debug/auth', (req, res) => {
  res.json({
    success: true,
    message: '認証APIが利用可能です',
    timestamp: new Date().toISOString(),
    environment: 'production',
    endpoints: [
      'POST /api/auth/login',
      'GET /api/auth/me',
      'POST /api/auth/logout',
    ],
  });
});

// ストレージ管理API
app.get('/api/storage/list', (req, res) => {
  try {
    console.log('🔍 本番環境: ストレージ一覧取得リクエスト');
    res.json({
      success: true,
      data: [],
      message: '本番環境: ストレージ一覧取得（Azure Storage接続が必要）',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ 本番環境: ストレージ一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ストレージ一覧の取得に失敗しました',
      timestamp: new Date().toISOString(),
    });
  }
});

// 静的ファイル配信
app.use(
  express.static(path.join(__dirname, 'public'), {
    etag: true,
    maxAge: '1d',
  })
);

// 404ハンドリング
app.use('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      error: 'API endpoint not found',
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(404).json({
      error: 'Page not found',
      path: req.path,
      timestamp: new Date().toISOString(),
    });
  }
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('❌ 本番環境エラー:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message || 'Unknown error',
    timestamp: new Date().toISOString(),
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
