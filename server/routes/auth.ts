
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
    console.log('🔐 Login attempt:', {
      body: req.body,
      session: req.session,
      sessionId: req.session?.id,
      headers: {
        cookie: req.headers.cookie ? '[SET]' : '[NOT SET]',
        origin: req.headers.origin,
        host: req.headers.host,
        referer: req.headers.referer
      }
    });
    
    const { username, password } = req.body;

    if (!username || !password) {
      console.log('❌ Missing credentials:', { username: !!username, password: !!password });
      return res.status(400).json({
        success: false,
        error: 'ユーザー名とパスワードを入力してください'
      });
    }

    // データベースからユーザーを検索
    const foundUsers = await db.select().from(users).where(eq(users.username, username)).limit(1);
    
    if (foundUsers.length === 0) {
      console.log('❌ User not found:', username);
      return res.status(401).json({
        success: false,
        error: 'ユーザー名またはパスワードが正しくありません'
      });
    }

    const foundUser = foundUsers[0];
    console.log('✅ User found:', { id: foundUser.id, username: foundUser.username, role: foundUser.role });
    
    // パスワード比較（bcrypt）
    const isPasswordValid = await bcrypt.compare(password, foundUser.password);
    if (!isPasswordValid) {
      console.log('❌ Invalid password for:', username);
      return res.status(401).json({
        success: false,
        error: 'ユーザー名またはパスワードが正しくありません'
      });
    }

    console.log('✅ Login successful for:', username);

    // セッションにユーザー情報を保存
    req.session.userId = foundUser.id;
    req.session.userRole = foundUser.role;
    
    console.log('💾 Session data before save:', {
      userId: req.session.userId,
      userRole: req.session.userRole,
      sessionId: req.session.id,
      sessionData: req.session
    });
    
    // セッションを明示的に保存
    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.status(500).json({
          success: false,
          error: 'セッションの保存に失敗しました'
        });
      }
      
      console.log('💾 Session saved successfully:', {
        userId: req.session.userId,
        userRole: req.session.userRole,
        sessionId: req.session.id,
        sessionData: req.session
      });

      // 成功レスポンス（Reactの認証コンテキストに合わせる）
      return res.json({
        success: true,
        message: 'ログインに成功しました',
        user: {
          id: foundUser.id,
          username: foundUser.username,
          displayName: foundUser.displayName || foundUser.username,
          role: foundUser.role,
          department: foundUser.department || 'General'
        }
      });
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
  try {
    console.log('🚪 Logout request');
    
    // セッションを破棄
    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Session destroy error:', err);
        return res.status(500).json({
          error: 'Logout failed'
        });
      }
      
      return res.json({
        success: true,
        message: 'Logout successful'
      });
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// 現在のユーザー情報取得
router.get('/me', async (req, res) => {
  try {
    console.log('🔍 /me endpoint called:', {
      session: req.session,
      sessionId: req.session?.id,
      userId: req.session?.userId,
      userRole: req.session?.userRole,
      headers: {
        cookie: req.headers.cookie ? '[SET]' : '[NOT SET]',
        origin: req.headers.origin,
        host: req.headers.host,
        referer: req.headers.referer
      }
    });
    
    // セッションからユーザーIDを取得
    const userId = req.session?.userId;
    
    if (!userId) {
      console.log('❌ No user ID in session');
      return res.status(401).json({
        success: false,
        error: '認証されていません'
      });
    }

    console.log('🔍 Searching user by ID:', userId);
    // データベースからユーザー情報を取得
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (user.length === 0) {
      console.log('❌ User not found in database:', userId);
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
    console.error('❌ Get user error:', error);
    return res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
});

module.exports = router;
