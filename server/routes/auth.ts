
import express from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db/index';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import '../types/session';

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

    // セッション再生
    req.session.regenerate(err => {
      if (err) return res.status(500).json({ success: false, error: 'session' });
      req.session.userId = foundUser.id;
      req.session.save(() => res.json({ success: true }));
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
router.get('/me', (req, res) => {
  if (req.session?.userId) {
    return res.json({ authenticated: true, userId: req.session.userId });
  }
  return res.status(401).json({ success: false, error: '認証されていません' });
});

export default router;
