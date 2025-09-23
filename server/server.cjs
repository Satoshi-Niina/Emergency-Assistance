#!/usr/bin/env node

console.info('[entry]', __filename);
console.log('Starting server...');

// CommonJS統一エントリーポイント
// 例外可視化（本番環境ではプロセスを落とさない）
process.on('unhandledRejection', e => {
  console.error('UNHANDLED_REJECTION', e);
  // 本番環境ではプロセスを落とさない
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});
process.on('uncaughtException', e => {
  console.error('UNCAUGHT_EXCEPTION', e);
  // 本番環境ではプロセスを落とさない
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

try {
  require('dotenv').config();
  console.log('dotenv loaded successfully');
} catch (e) {
  console.log('dotenv not available, continuing...');
}

console.log('Loading dependencies...');

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');

console.log('Dependencies loaded successfully');

// 必須環境変数の存在チェック
const requiredEnvVars = ['NODE_ENV'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.warn('⚠️ Missing environment variables:', missingEnvVars);
  console.warn('⚠️ Server will continue with default values');
} else {
  console.log('✅ All required environment variables are set');
}

console.log('🔧 Environment configuration:', {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || '8080',
  FRONTEND_URL:
    process.env.FRONTEND_URL || 'https://your-swa.azurestaticapps.net',
  SESSION_SECRET: process.env.SESSION_SECRET ? '[SET]' : '[NOT SET]',
  DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
});

const app = express();
console.log('Express app created');

// Trust proxy for Azure App Service
app.set('trust proxy', 1);

// CORS設定 - クロスサイト対応
const FRONTEND =
  process.env.FRONTEND_URL ||
  'https://witty-river-012f39e00.1.azurestaticapps.net';

const corsOpts = {
  origin: [FRONTEND],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
};
app.use(cors(corsOpts));
app.options('*', cors(corsOpts)); // preflight

// ミドルウェア
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Cookie設定の自動切替（First-Party vs Cross-Site）
const useFirstParty = !!process.env.COOKIE_DOMAIN; // 例: .example.jp が入っていれば First-Party
const cookieSameSite = useFirstParty ? 'lax' : 'none';
const cookieDomain = useFirstParty ? process.env.COOKIE_DOMAIN : undefined;

// Cross-Siteモードの時だけ（= COOKIE_DOMAIN 未設定時）、Set-Cookie へ ; Partitioned を自動追記
if (!process.env.COOKIE_DOMAIN) {
  app.use((req, res, next) => {
    const orig = res.setHeader.bind(res);
    res.setHeader = (name, value) => {
      if (String(name).toLowerCase() === 'set-cookie') {
        const add = v =>
          typeof v === 'string' &&
          v.toLowerCase().includes('samesite=none') &&
          v.toLowerCase().includes('secure') &&
          !/;\s*partitioned\b/i.test(v)
            ? v + '; Partitioned'
            : v;
        return orig(name, Array.isArray(value) ? value.map(add) : add(value));
      }
      return orig(name, value);
    };
    next();
  });
}

// セッション設定 - 全ブラウザ対応（First-Party/Cross-Site自動切替）
app.use(
  session({
    name: 'sid',
    secret: process.env.SESSION_SECRET || 'change_me',
    resave: false,
    saveUninitialized: false,
    proxy: true, // クロスサイトCookie用
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: cookieSameSite, // 'lax' or 'none'
      ...(cookieDomain ? { domain: cookieDomain } : {}), // 設定時のみ付与
      maxAge: 24 * 60 * 60 * 1000, // 24時間
    },
  })
);

// 静的ファイル配信
app.use(express.static(path.join(__dirname, 'public')));

// ルートも200
app.get('/', (req, res) => {
  res.status(200).send('ok');
});

// DB初期化（本番で未設定/失敗でもexitしない）
global.dbReady = false;
if (process.env.DATABASE_URL) {
  try {
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    client
      .connect()
      .then(() => {
        global.dbReady = true;
        return client.end();
      })
      .catch(e => {
        console.error('DB connect failed (startup):', e);
        global.dbReady = false;
      });
  } catch (e) {
    console.error('DB init error:', e);
    global.dbReady = false;
  }
} else {
  global.dbReady = false;
}

// Health endpoints (JSON, backward compatible, dbReady反映)
app.get(['/api/healthz', '/healthz', '/api/health', '/health'], (_req, res) => {
  res
    .type('application/json')
    .status(200)
    .json({ ok: true, db: global.dbReady ? 'ok' : 'ng' });
});

// 疎通確認用エンドポイント
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// API ルート
app.get('/api/health/json', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// 認証APIエンドポイント
// ログイン（DB必須・多方式パスワード検証・自動bcrypt移行）
const { Client } = require('pg');
const bcrypt = require('bcrypt');
app.post('/api/auth/login', async (req, res) => {
  // 受信ボディのキー名だけをログ（password値は出力しない）
  console.info('[auth/login] bodyKeys:', Object.keys(req.body || {}));
  res.set('Cache-Control', 'no-store');
  const { login, password } = req.body || {};
  const id = login;
  if (!id || !password) {
    return res
      .status(400)
      .json({
        success: false,
        error: 'ユーザー名とパスワードを入力してください',
      });
  }
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    return res
      .status(500)
      .json({ success: false, error: 'DB接続情報がありません' });
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    // usernameのみでユーザー取得（LOWERで大小無視）
    const q = `SELECT * FROM users WHERE LOWER(username)=LOWER($1) LIMIT 1`;
    const { rows } = await client.query(q, [id]);
    if (!rows[0]) {
      console.info('user_found: false');
      return res
        .status(401)
        .json({
          success: false,
          error: 'ユーザー名またはパスワードが正しくありません',
        });
    }
    const user = rows[0];
    console.info('user_found: true');
    const hash = user.password || '';
    let passwordOk = false;
    let needsRehash = false;
    // パスワード方式判定
    if (/^\$2[aby]\$/.test(hash)) {
      passwordOk = await bcrypt.compare(password, hash);
    } else if (/^\$argon2/.test(hash)) {
      const argon2 = await import('argon2');
      passwordOk = await argon2.default.verify(hash, password);
      if (passwordOk) needsRehash = true;
    } else {
      passwordOk = password === hash;
      if (passwordOk) needsRehash = true;
    }
    if (!passwordOk) {
      console.info('password_ok: false');
      return res
        .status(401)
        .json({
          success: false,
          error: 'ユーザー名またはパスワードが正しくありません',
        });
    }
    console.info('password_ok: true');
    req.session.regenerate(async err => {
      if (err) {
        return res
          .status(500)
          .json({ success: false, error: 'セッションの再生成に失敗しました' });
      }
      // 必ずregenerate後にuserId等を設定
      req.session.userId = user.id;
      req.session.userRole = user.role || 'user';
      req.session.username = user.username;
      if (needsRehash) {
        const newHash = await bcrypt.hash(password, 12);
        await client.query('UPDATE users SET password=$1 WHERE id=$2', [
          newHash,
          user.id,
        ]);
      }
      // 必ずsave後にres.json
      req.session.save(err => {
        if (err) {
          return res
            .status(500)
            .json({ success: false, error: 'セッションの保存に失敗しました' });
        }
        return res.json({
          success: true,
          user: {
            id: user.id,
            login: user.username,
            displayName: user.display_name,
            role: user.role,
            department: user.department || '',
          },
        });
      });
    });
  } catch (e) {
    console.error('login error', e);
    return res.status(500).json({ success: false, error: 'サーバーエラー' });
  } finally {
    await client.end();
  }
});
// DBヘルスエンドポイント
app.get('/api/health/db', async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(200).json({ db: 'ng', users: 0 });
  }
  const { Client } = require('pg');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const r = await client.query('SELECT COUNT(*) FROM users');
    const count = Number(r.rows[0].count || 0);
    await client.query('SELECT 1');
    return res.status(200).json({ db: 'ok', users: count });
  } catch (e) {
    return res.status(200).json({ db: 'ng', users: 0 });
  } finally {
    await client.end();
  }
});

// 現在のユーザー情報取得
app.get('/api/auth/me', (req, res) => {
  console.log('🔍 /me request:', {
    cookies: req.headers.cookie ? '[SET]' : '[NOT SET]',
    origin: req.headers.origin,
    sessionId: req.session?.id,
    userId: req.session?.userId,
    userRole: req.session?.userRole,
    sessionData: req.session,
  });
  res.set('Cache-Control', 'no-store');
  if (!req.session || !req.session.userId) {
    console.log('❌ No session or user ID');
    console.log('🔍 Available session data:', req.session);
    return res.status(401).json({
      success: false,
      error: '認証されていません',
    });
  }
  console.log('✅ Authenticated user:', req.session.userId);
  return res.json({
    success: true,
    user: {
      id: req.session.userId,
      username: req.session.username || req.session.userId,
      displayName: req.session.username || req.session.userId,
      role: req.session.userRole || 'user',
      department: 'General',
    },
  });
});

// ログアウト
app.post('/api/auth/logout', (req, res) => {
  console.log('🚪 Logout request:', {
    sessionId: req.session?.id,
    userId: req.session?.userId,
  });
  res.set('Cache-Control', 'no-store');
  req.session.destroy(err => {
    if (err) {
      console.error('❌ Session destroy error:', err);
      return res.status(500).json({
        success: false,
        error: 'ログアウトに失敗しました',
      });
    }
    res.clearCookie('sid');
    console.log('✅ Logout successful');
    return res.json({
      success: true,
      message: 'ログアウトしました',
    });
  });
});

// 認証安定化ルート
app.get('/api/auth/handshake', (req, res) => {
  res.json({
    firstParty: !!process.env.COOKIE_DOMAIN,
    supportsToken: true,
  });
});

app.post('/api/auth/cookie-probe', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isFirstParty = !!process.env.COOKIE_DOMAIN;

  res.cookie('auth-probe', 'test', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isFirstParty ? 'lax' : 'none',
    maxAge: 5000, // 5秒
    ...(isProduction && !isFirstParty && { partitioned: true }),
  });

  res.status(204).send();
});

app.get('/api/auth/cookie-probe-check', (req, res) => {
  const cookieOk = !!req.cookies['auth-probe'];

  // プローブCookieを削除
  if (cookieOk) {
    res.clearCookie('auth-probe');
  }

  res.json({ cookieOk });
});

app.post('/api/auth/refresh', async (req, res) => {
  try {
    // セッションが有効な場合
    if (req.session?.userId) {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { uid: req.session.userId },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: '1d' }
      );
      return res.json({ token });
    }

    // Bearerトークンが有効な場合
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const jwt = require('jsonwebtoken');
        const payload = jwt.verify(
          token,
          process.env.JWT_SECRET || 'dev-secret'
        );

        // 期限が15分未満の場合は新しいトークンを発行
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp - now < 900) {
          // 15分 = 900秒
          const newToken = jwt.sign(
            { uid: payload.uid },
            process.env.JWT_SECRET || 'dev-secret',
            { expiresIn: '1d' }
          );
          return res.json({ token: newToken });
        }

        // まだ有効な場合は現在のトークンを返す
        return res.json({ token });
      } catch (jwtError) {
        // JWT無効
      }
    }

    // どちらも無効
    return res.status(401).json({ success: false, error: '認証が必要です' });
  } catch (error) {
    console.error('Refresh error:', error);
    return res
      .status(500)
      .json({ success: false, error: 'リフレッシュエラー' });
  }
});

console.info('[auth] routes mounted: handshake, cookie-probe, refresh');

// 404ハンドラー
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// エラーハンドラー
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).type('application/json').send({ error: 'internal_error' });
});

// 本番でもDATABASE_URL未設定でexitしない（起動緩和）

const port = Number(process.env.PORT) || 8080;
const host = '0.0.0.0';

console.log('🚀 Starting server...');
console.log('🔧 Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: port,
  HOST: host,
  DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
});

// サーバー起動の試行
let server;
try {
  server = app.listen(port, host, () => {
    console.log('✅ Server started successfully!');
    console.log(`🌐 Listening on ${host}:${port}`);
    console.log(`🔍 Health check: http://${host}:${port}/api/health`);
    console.log(`🔐 Login API: http://${host}:${port}/api/auth/login`);
    console.log(
      `📊 Database status: ${global.dbReady ? 'connected' : 'not connected'}`
    );
    console.log('🚀 Emergency Assistance Server is ready!');
  });
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}
server.on('error', err => {
  console.error('❌ Server error:', err);
  process.exit(1);
});
server.on('listening', () => {
  console.log('✅ Server is now listening for connections');
});

// プロセス終了時の処理
process.on('exit', code => {
  console.log(`Process exiting with code: ${code}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

module.exports = app;
