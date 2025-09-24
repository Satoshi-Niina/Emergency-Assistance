const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();

// JWT発行ユーティリティ
const issueJwt = (userId, options = {}) => {
  const payload = { uid: userId };
  const jwtOptions = { expiresIn: '1d' };
  if (options.exp) {
    jwtOptions.expiresIn = Math.floor((options.exp - Date.now()) / 1000) + 's';
  }
  return jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret', jwtOptions);
};

// デバッグ用エンドポイント - 環境変数とセッション状態を確認
router.get('/debug', (req, res) => {
  res.json({
    success: true,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      BYPASS_DB_FOR_LOGIN: process.env.BYPASS_DB_FOR_LOGIN,
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
      SESSION_SECRET: process.env.SESSION_SECRET ? 'SET' : 'NOT SET',
    },
    session: {
      hasSession: !!req.session,
      userId: req.session?.userId,
      user: req.session?.user,
      sessionId: req.session?.id,
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
      // データベースからユーザーを検索（簡易実装）
      // TODO: 実際のDB接続を実装
      return res.status(503).json({
        success: false,
        error: 'auth_backend_unavailable',
        message: '認証サービスが一時的に利用できません'
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
router.post('/logout', (req, res) => {
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
router.get('/handshake', (req, res) => {
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
    let mode;
    if (isSafeMode) {
      mode = 'safe';
    } else if (bypassJwt) {
      mode = 'jwt-bypass';
    } else {
      mode = 'session';
    }

    res.json({
      ok: true,
      mode: mode,
      env: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      features: {
        session: true,
        jwt: true,
        bypass: process.env.BYPASS_DB_FOR_LOGIN === 'true',
      },
    });
  } catch (error) {
    console.error('❌ Handshake error:', error);
    res.status(200).json({
      ok: true,
      mode: 'session',
      env: 'production',
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
