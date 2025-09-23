import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db/index';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';
// Type definitions are loaded automatically by TypeScript

// JWT発行ユーティリティ
const issueJwt = (userId: string, options: { exp?: number } = {}) => {
  const payload = { uid: userId };
  const jwtOptions: jwt.SignOptions = { expiresIn: '1d' };
  if (options.exp) {
    jwtOptions.expiresIn = Math.floor((options.exp - Date.now()) / 1000) + 's';
  }
  return jwt.sign(payload, process.env.JWT_SECRET!, jwtOptions);
};

const router = express.Router();

// デバッグ用エンドポイント - 環境変数とセッション状態を確認
router.get('/debug/env', (_req, res) => {
  console.log('🔍 デバッグエンドポイント呼び出し');

  const debugInfo = {
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
      SESSION_SECRET: process.env.SESSION_SECRET ? '[SET]' : '[NOT SET]',
    },
    session: {
      sessionId: req.session?.id,
      userId: req.session?.userId,
      userRole: req.session?.userRole,
      hasSession: !!req.session,
      sessionData: req.session,
    },
    request: {
      headers: {
        cookie: req.headers.cookie ? '[SET]' : '[NOT SET]',
        'user-agent': req.headers['user-agent'],
        origin: req.headers.origin,
      },
      method: req.method,
      url: req.url,
    },
  };

  console.log('📊 デバッグ情報:', debugInfo);

  res.json({
    success: true,
    debug: debugInfo,
    timestamp: new Date().toISOString(),
  });
});

// セッション状態確認用エンドポイント
router.get('/debug/session', (_req, res) => {
  console.log('🔍 セッション状態確認エンドポイント呼び出し');

  res.json({
    success: true,
    session: {
      id: req.session?.id,
      userId: req.session?.userId,
      userRole: req.session?.userRole,
      hasSession: !!req.session,
      sessionData: req.session,
    },
    timestamp: new Date().toISOString(),
  });
});

// ログインエンドポイント
router.post('/login', async (_req, res) => {
  try {
    // 段階的移行モード判定
    const isSafeMode = process.env.SAFE_MODE === 'true';
    const bypassJwt = process.env.BYPASS_JWT === 'true';

    // 診断ログ: リクエストヘッダー
    console.log('[auth/login] Request headers:', {
      authorization: req.headers.authorization ? '[SET]' : '[NOT SET]',
      cookie: req.headers.cookie ? '[SET]' : '[NOT SET]',
      host: req.headers.host,
      origin: req.headers.origin,
      'user-agent': req.headers['user-agent']?.substring(0, 50) + '...',
      safeMode: isSafeMode,
      bypassJwt: bypassJwt,
    });

    // セーフモード時はダミーログインを返す
    if (isSafeMode) {
      console.log('[auth/login] Safe mode: Returning demo login');
      const demoToken = jwt.sign({ id: 'demo', role: 'user' }, 'dev-secret', {
        expiresIn: '5m',
      });
      return res.json({
        success: true,
        token: demoToken,
        accessToken: demoToken,
        expiresIn: '5m',
        mode: 'safe',
      });
    }

    // JWTバイパスモード時はダミーログインを返す
    if (bypassJwt) {
      console.log('[auth/login] JWT bypass mode: Returning demo login');
      const demoToken = jwt.sign({ id: 'demo', role: 'user' }, 'dev-secret', {
        expiresIn: '5m',
      });
      return res.json({
        success: true,
        token: demoToken,
        accessToken: demoToken,
        expiresIn: '5m',
        mode: 'jwt-bypass',
      });
    }

    const { username, password } = req.body || {};

    // データベースからユーザーを検索
    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (foundUsers.length === 0) {
      return res.status(401).json({ success: false, error: 'invalid' });
    }

    const foundUser = foundUsers[0];

    // パスワード比較（bcrypt）
    const isPasswordValid = await bcrypt.compare(password, foundUser.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: 'invalid' });
    }

    // JWTトークン生成
    const token = issueJwt(foundUser.id);

    // セッション再生
    req.session.regenerate(err => {
      if (err)
        return res.status(500).json({ success: false, error: 'session' });
      req.session.userId = foundUser.id;
      req.session.save(() => {
        // 診断ログ: レスポンスヘッダー
        console.log('[auth/login] Response headers:', {
          'set-cookie': res.getHeader('set-cookie') ? '[SET]' : '[NOT SET]',
          'access-control-allow-origin': res.getHeader(
            'access-control-allow-origin'
          ),
          'access-control-allow-credentials': res.getHeader(
            'access-control-allow-credentials'
          ),
        });
        console.log('[auth/login] Login success for user:', foundUser.username);
        res.json({ success: true, token, accessToken: token, expiresIn: '1d' });
      });
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました',
    });
  }
});

// ログアウトエンドポイント
router.post('/logout', (_req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sid', { path: '/' });
    res.json({ success: true });
  });
});

// 現在のユーザー情報取得
router.get('/me', authenticateToken, (req, res) => {
  // 段階的移行モード判定
  const isSafeMode = process.env.SAFE_MODE === 'true';
  const bypassJwt = process.env.BYPASS_JWT === 'true';

  // 診断ログ: /me リクエスト
  console.log('[auth/me] Request headers:', {
    authorization: req.headers.authorization ? '[SET]' : '[NOT SET]',
    cookie: req.headers.cookie ? '[SET]' : '[NOT SET]',
    host: req.headers.host,
    origin: req.headers.origin,
    safeMode: isSafeMode,
    bypassJwt: bypassJwt,
  });
  console.log('[auth/me] Auth result:', {
    userId: req.user?.id,
    sessionUserId: req.session?.userId,
    authMethod: req.headers.authorization ? 'Bearer' : 'Session',
  });

  // セーフモード時はダミーユーザー情報を返す
  if (isSafeMode) {
    console.log('[auth/me] Safe mode: Returning demo user');
    return res.json({
      authenticated: true,
      userId: 'demo',
      user: { id: 'demo', role: 'user' },
      mode: 'safe',
    });
  }

  // JWTバイパスモード時はダミーユーザー情報を返す
  if (bypassJwt) {
    console.log('[auth/me] JWT bypass mode: Returning demo user');
    return res.json({
      authenticated: true,
      userId: 'demo',
      user: { id: 'demo', role: 'user' },
      mode: 'jwt-bypass',
    });
  }

  return res.json({
    authenticated: true,
    userId: req.user!.id,
    user: { id: req.user!.id },
  });
});

// サーバ設定ヒント取得（段階的移行対応）
router.get('/handshake', (_req, res) => {
  console.log('🔍 /api/auth/handshake 呼び出し');

  // 段階的移行モード判定
  const isSafeMode = process.env.SAFE_MODE === 'true';
  const bypassJwt = process.env.BYPASS_JWT === 'true';

  // 詳細なリクエスト情報をログ出力
  console.log('📊 Handshake request details:', {
    method: req.method,
    path: req.path,
    headers: {
      host: req.headers.host,
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-forwarded-proto': req.headers['x-forwarded-proto'],
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
    },
    ip: req.ip,
    ips: req.ips,
    timestamp: new Date().toISOString(),
    safeMode: isSafeMode,
    bypassJwt: bypassJwt,
  });

  try {
    // 段階的移行モード判定
    let mode: string;
    if (isSafeMode) {
      mode = 'safe';
    } else if (bypassJwt) {
      mode = 'jwt-bypass';
    } else {
      mode = 'jwt';
    }

    res.json({
      ok: true,
      mode: mode,
      firstParty: !!process.env.COOKIE_DOMAIN,
      supportsToken: true,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      server: {
        port: process.env.PORT,
        trustProxy: req.app.get('trust proxy'),
        nodeVersion: process.version,
      },
    });
  } catch (error) {
    console.error('❌ /api/auth/handshake エラー:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({
      ok: false,
      error: 'handshake_failed',
      message: '握手エンドポイントでエラーが発生しました',
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// DB readiness チェックエンドポイント
router.get('/readiness', async (_req, res) => {
  console.log('🔍 /api/auth/readiness 呼び出し');

  try {
    // DB_READINESSが有効でない場合はスキップ
    if (process.env.DB_READINESS !== 'true') {
      console.log('[auth/readiness] DB_READINESS not enabled, skipping DB check');
      return res.json({
        ok: true,
        db: 'skipped',
        message: 'DB readiness check is disabled',
        timestamp: new Date().toISOString(),
      });
    }

    // セーフモード時はスキップ
    const isSafeMode = process.env.SAFE_MODE === 'true';
    if (isSafeMode) {
      console.log('[auth/readiness] Safe mode: Skipping DB check');
      return res.json({
        ok: true,
        db: 'skipped',
        mode: 'safe',
        message: 'Safe mode: DB check skipped',
        timestamp: new Date().toISOString(),
      });
    }

    // データベース接続テスト
    console.log('[auth/readiness] Testing database connection...');
    const result = await db.execute('SELECT 1 as test');
    
    console.log('[auth/readiness] Database connection successful');
    return res.json({
      ok: true,
      db: 'ready',
      message: 'Database connection is ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[auth/readiness] Database connection failed:', error);
    return res.status(503).json({
      ok: false,
      db: 'error',
      error: 'database_connection_failed',
      message: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Cookieプローブ（短命テストCookie発行）
router.post('/cookie-probe', (_req, res) => {
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

// Cookieプローブ確認
router.get('/cookie-probe-check', (_req, res) => {
  const cookieOk = !!req.cookies['auth-probe'];

  // プローブCookieを削除
  if (cookieOk) {
    res.clearCookie('auth-probe');
  }

  res.json({ cookieOk });
});

// トークンリフレッシュ
router.post('/refresh', async (_req, res) => {
  try {
    // セッションが有効な場合
    if (req.session?.userId) {
      const token = issueJwt(req.session.userId);
      return res.json({ token });
    }

    // Bearerトークンが有効な場合
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
          uid: string;
          exp: number;
        };

        // 期限が15分未満の場合は新しいトークンを発行
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp - now < 900) {
          // 15分 = 900秒
          const newToken = issueJwt(payload.uid);
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

export default router;
