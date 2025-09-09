import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = express.Router();

// シンプルなトークン生成（JWT代替）
interface TokenPayload {
  userId: number;
  username: string;
  role: string;
}

const generateSimpleToken = (payload: TokenPayload): string => {
  const data = JSON.stringify({
    ...payload,
    timestamp: Date.now(),
    expires: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7日間
  });
  const signature = crypto.createHmac('sha256', process.env.JWT_SECRET || 'emergency-assistance-secret')
    .update(data)
    .digest('base64');
  
  return Buffer.from(JSON.stringify({ data, signature })).toString('base64');
};

// トークン検証
const verifySimpleToken = (token: string): (TokenPayload & { timestamp: number; expires: number }) | null => {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    const { data, signature } = decoded;
    
    // 署名検証
    const expectedSignature = crypto.createHmac('sha256', process.env.JWT_SECRET || 'emergency-assistance-secret')
      .update(data)
      .digest('base64');
    
    if (signature !== expectedSignature) {
      console.log('❌ Token signature verification failed');
      return null;
    }
    
    const payload = JSON.parse(data);
    
    // 期限チェック
    if (Date.now() > payload.expires) {
      console.log('❌ Token expired');
      return null;
    }
    
    return payload;
  } catch (e) {
    console.log('❌ Token parsing failed:', e);
    return null;
  }
};

// ログインエンドポイント（トークンベース）
router.post('/token-login', async (req, res) => {
  try {
    console.log('🔐 Token-based login attempt:', {
      body: req.body,
      headers: {
        origin: req.headers.origin,
        userAgent: req.headers['user-agent']?.substring(0, 50)
      }
    });
    
    const { username, password } = req.body;

    if (!username || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({
        success: false,
        error: 'ユーザー名とパスワードを入力してください'
      });
    }

    // データベースからユーザーを検索
    console.log('🔍 Searching user in database:', username);
    const user = await db.select().from(users).where(eq(users.username, username)).limit(1);
    
    if (user.length === 0) {
      console.log('❌ User not found:', username);
      return res.status(401).json({
        success: false,
        error: 'ユーザー名またはパスワードが違います'
      });
    }

    const foundUser = user[0];
    console.log('✅ User found:', { id: foundUser.id, username: foundUser.username, role: foundUser.role });
    
    // パスワード検証
    const isValidPassword = await bcrypt.compare(password, foundUser.password).catch(() => false);
    if (!isValidPassword) {
      console.log('❌ Invalid password for:', username);
      return res.status(401).json({
        success: false,
        error: 'ユーザー名またはパスワードが違います'
      });
    }

    console.log('✅ Login successful for:', username);

    // トークン生成
    const token = generateSimpleToken({
      userId: foundUser.id,
      username: foundUser.username,
      role: foundUser.role
    });

    console.log('🎫 Token generated for user:', username);

    // 成功レスポンス
    return res.json({
      success: true,
      message: 'ログインに成功しました',
      user: {
        id: foundUser.id,
        username: foundUser.username,
        displayName: foundUser.displayName || foundUser.username,
        role: foundUser.role,
        department: foundUser.department || 'General'
      },
      token: token
    });

  } catch (error) {
    console.error('❌ Token login error:', error);
    return res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
});

// トークンベースでのユーザー情報取得
router.get('/token-me', async (req, res) => {
  try {
    console.log('🔍 Token-based /me endpoint called');
    
    // Authorization ヘッダーからトークン取得
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No Bearer token found');
      return res.status(401).json({
        success: false,
        error: '認証トークンがありません'
      });
    }

    const token = authHeader.substring(7);
    const payload = verifySimpleToken(token);
    
    if (!payload) {
      console.log('❌ Token verification failed');
      return res.status(401).json({
        success: false,
        error: '無効なトークンです'
      });
    }

    console.log('🔍 Token verified, searching user by ID:', payload.userId);
    
    // データベースからユーザー情報を再取得
    const user = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    
    if (user.length === 0) {
      console.log('❌ User not found in database:', payload.userId);
      return res.status(401).json({
        success: false,
        error: 'ユーザーが見つかりません'
      });
    }

    const foundUser = user[0];
    console.log('✅ User found:', { id: foundUser.id, username: foundUser.username, role: foundUser.role });
    
    return res.json({
      success: true,
      user: {
        id: foundUser.id,
        username: foundUser.username,
        displayName: foundUser.displayName || foundUser.username,
        role: foundUser.role,
        department: foundUser.department || 'General'
      }
    });
  } catch (error) {
    console.error('❌ Token me error:', error);
    return res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
});

// デバッグ用エンドポイント - 環境変数とセッション状態を確認
router.get('/debug/env', (req, res) => {
  console.log('🔍 デバッグエンドポイント呼び出し');
  
  const debugInfo = {
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
      JWT_SECRET: process.env.JWT_SECRET ? '[SET]' : '[NOT SET]',
    },
    session: {
      sessionId: req.session?.id,
      userId: req.session?.userId,
      userRole: req.session?.userRole,
      hasSession: !!req.session,
    },
    request: {
      headers: {
        cookie: req.headers.cookie ? '[SET]' : '[NOT SET]',
        authorization: req.headers.authorization ? '[SET]' : '[NOT SET]',
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

export default router;
