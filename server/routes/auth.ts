import express from 'express';
import bcrypt from 'bcryptjs';
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

// CORSミドルウェア（認証ルート用）
router.use((req, res, next) => {
  const origin = req.headers.origin;
  // 注意: 本番環境では必ずSTATIC_WEB_APP_URL環境変数を設定してください
  const staticWebAppUrl = process.env.STATIC_WEB_APP_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8080');
  const clientPort = process.env.CLIENT_PORT || '5173';
  const allowedOrigins = [
    `http://localhost:${clientPort}`,
    `http://localhost:${parseInt(clientPort) + 1}`,
    `http://localhost:${parseInt(clientPort) + 2}`,
    `http://localhost:${parseInt(clientPort) + 3}`,
    `http://localhost:${parseInt(clientPort) + 4}`,
    `http://localhost:${parseInt(clientPort) + 5}`,
    `http://127.0.0.1:${clientPort}`,
    `http://127.0.0.1:${parseInt(clientPort) + 1}`,
    `http://127.0.0.1:${parseInt(clientPort) + 2}`,
    `http://127.0.0.1:${parseInt(clientPort) + 3}`,
    `http://127.0.0.1:${parseInt(clientPort) + 4}`,
    `http://127.0.0.1:${parseInt(clientPort) + 5}`,
    staticWebAppUrl,
    ...(process.env.CORS_ALLOW_ORIGINS?.split(',') || [])
  ].filter(Boolean);

  if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes('*'))) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // オリジンなし（同一オリジン）を許可
    res.header('Access-Control-Allow-Origin', '*');
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma, Expires, Cookie');
  res.header('Access-Control-Max-Age', '86400');

  // プリフライトリクエスト（OPTIONS）の処理
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
});

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
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    
    // 入力検証
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'bad_request',
        message: 'ユーザー名とパスワードが必要です'
      });
    }

    // バイパスフラグ確認
    const bypassDb = process.env.BYPASS_DB_FOR_LOGIN === 'true';
    
    console.log('[auth/login] Login attempt:', { 
      username, 
      bypassDb,
      timestamp: new Date().toISOString()
    });

    // バイパスモード時は仮ログイン
    if (bypassDb) {
      console.log('[auth/login] Bypass mode: Creating demo session');
      
      // セッションにユーザー情報を設定
      req.session.user = { 
        id: 'demo', 
        name: username,
        role: 'user'
      };
      
      // JWTトークンも生成（オプション）
      const token = jwt.sign(
        { id: 'demo', username, role: 'user' }, 
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '1d' }
      );
      
      return res.json({ 
        success: true, 
        mode: 'session',
        user: req.session.user,
        token,
        accessToken: token,
        expiresIn: '1d'
      });
    }

    // 本来のDB認証
    try {
      // データベースからユーザーを検索
      const foundUsers = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (foundUsers.length === 0) {
        return res.status(401).json({ 
          success: false, 
          error: 'invalid_credentials',
          message: 'ユーザー名またはパスワードが正しくありません'
        });
      }

      const foundUser = foundUsers[0];

      // パスワード比較（bcryptjs）
      const isPasswordValid = await bcrypt.compare(password, foundUser.password);
      if (!isPasswordValid) {
        return res.status(401).json({ 
          success: false, 
          error: 'invalid_credentials',
          message: 'ユーザー名またはパスワードが正しくありません'
        });
      }

      // JWTトークン生成
      const token = issueJwt(foundUser.id);

      // セッション再生
      req.session.regenerate(err => {
        if (err) {
          console.error('[auth/login] Session regenerate error:', err);
          return res.status(503).json({ 
            success: false, 
            error: 'session_error',
            message: 'セッション作成に失敗しました'
          });
        }
        
        req.session.userId = foundUser.id;
        req.session.user = { 
          id: foundUser.id, 
          name: foundUser.username,
          role: foundUser.role || 'user'
        };
        
        req.session.save(() => {
          console.log('[auth/login] Login success for user:', foundUser.username);
          res.json({ 
            success: true, 
            token, 
            accessToken: token, 
            expiresIn: '1d',
            user: req.session.user
          });
        });
      });
      
    } catch (dbError) {
      console.error('[auth/login] Database error:', dbError);
      return res.status(503).json({
        success: false,
        error: 'auth_backend_unavailable',
        message: '認証サービスが一時的に利用できません'
      });
    }
    
  } catch (error) {
    console.error('[auth/login] Unexpected error:', error);
    return res.status(503).json({
      success: false,
      error: 'auth_internal_error',
      message: '認証処理中にエラーが発生しました'
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
router.get('/me', (req, res) => {
  try {
    // セッションベースの認証をチェック
    if (req.session?.user) {
      console.log('[auth/me] Session-based auth:', req.session.user);
      return res.json({ 
        success: true, 
        user: req.session.user,
        authenticated: true
      });
    }

    // Bearer token認証をチェック
    const auth = req.get('authorization');
    if (auth?.startsWith('Bearer ')) {
      try {
        const token = auth.slice(7);
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        console.log('[auth/me] Token-based auth:', payload);
        return res.json({ 
          success: true, 
          user: { id: payload.sub || payload.id, ...payload },
          authenticated: true
        });
      } catch (tokenError) {
        console.log('[auth/me] Invalid token:', tokenError.message);
        return res.status(401).json({ 
          success: false, 
          error: 'invalid_token',
          message: '無効なトークンです'
        });
      }
    }

    // 未認証
    console.log('[auth/me] No authentication found');
    return res.status(401).json({ 
      success: false, 
      error: 'authentication_required',
      message: '認証が必要です'
    });
    
  } catch (error) {
    console.error('[auth/me] Unexpected error:', error);
    return res.status(401).json({ 
      success: false, 
      error: 'authentication_required',
      message: '認証が必要です'
    });
  }
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
