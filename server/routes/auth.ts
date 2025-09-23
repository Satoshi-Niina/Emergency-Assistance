
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db/index';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';
import '../types/session';

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
router.get('/debug/env', (req, res) => {
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
    }
  };
  
  console.log('📊 デバッグ情報:', debugInfo);
  
  res.json({
    success: true,
    debug: debugInfo,
    timestamp: new Date().toISOString()
  });
});

// セッション状態確認用エンドポイント
router.get('/debug/session', (req, res) => {
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
    timestamp: new Date().toISOString()
  });
});

// ログインエンドポイント
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    
    // データベースからユーザーを検索
    const foundUsers = await db.select().from(users).where(eq(users.username, username)).limit(1);
    
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
      if (err) return res.status(500).json({ success: false, error: 'session' });
      req.session.userId = foundUser.id;
      req.session.save(() => res.json({ success: true, token }));
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
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
router.get('/me', authenticateToken, (req, res) => {
  return res.json({ authenticated: true, userId: req.user!.id });
});

// サーバ設定ヒント取得
router.get('/handshake', (req, res) => {
  res.json({
    firstParty: !!process.env.COOKIE_DOMAIN,
    supportsToken: true
  });
});

// Cookieプローブ（短命テストCookie発行）
router.post('/cookie-probe', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isFirstParty = !!process.env.COOKIE_DOMAIN;
  
  res.cookie('auth-probe', 'test', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isFirstParty ? 'lax' : 'none',
    maxAge: 5000, // 5秒
    ...(isProduction && !isFirstParty && { partitioned: true })
  });
  
  res.status(204).send();
});

// Cookieプローブ確認
router.get('/cookie-probe-check', (req, res) => {
  const cookieOk = !!req.cookies['auth-probe'];
  
  // プローブCookieを削除
  if (cookieOk) {
    res.clearCookie('auth-probe');
  }
  
  res.json({ cookieOk });
});

// トークンリフレッシュ
router.post('/refresh', async (req, res) => {
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
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as { uid: string, exp: number };
        
        // 期限が15分未満の場合は新しいトークンを発行
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp - now < 900) { // 15分 = 900秒
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
    return res.status(500).json({ success: false, error: 'リフレッシュエラー' });
  }
});

export default router;
