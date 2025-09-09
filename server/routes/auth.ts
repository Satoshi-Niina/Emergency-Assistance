
import express from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

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
    
    let currentPasswordHash = foundUser.password;
    let passwordValidated = false;
    const isBcryptHash = currentPasswordHash.startsWith('$2a$') || currentPasswordHash.startsWith('$2b$') || currentPasswordHash.startsWith('$2y$');
    if (isBcryptHash) {
      passwordValidated = await bcrypt.compare(password, currentPasswordHash).catch(err => {
        console.warn('bcrypt compare error:', err);
        return false;
      });
    } else {
      // レガシー: 平文で保存されていた場合（旧実装の暫定措置）
      if (password === currentPasswordHash) {
        passwordValidated = true;
        try {
          const newHash = await bcrypt.hash(password, 10);
          await db.update(users).set({ password: newHash }).where(eq(users.id, foundUser.id));
          currentPasswordHash = newHash;
          console.log('🔄 Legacy plaintext password migrated to bcrypt hash for user:', username);
        } catch (mErr) {
          console.warn('⚠️ Failed migrating legacy password hash:', mErr);
        }
      }
    }
    if (!passwordValidated) {
      console.log('❌ Invalid password for:', username, { reason: isBcryptHash ? 'bcrypt_mismatch' : 'legacy_plaintext_mismatch' });
      return res.status(401).json({ success: false, error: 'ユーザー名またはパスワードが違います' });
    }

    console.log('✅ Login successful for:', username);

    // セッションにユーザー情報を保存
    req.session.userId = foundUser.id;
    // 旧ロール名を新ロールへマッピング（DBは後で移行可能）
    const normalizedRole = ((): string => {
      if (foundUser.role === 'admin') return 'system_admin';
      if (foundUser.role === 'employee') return 'user';
      return foundUser.role;
    })();
    req.session.userRole = normalizedRole;
    
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
        },
        debugCookie: {
          secure: req.session.cookie.secure,
          sameSite: req.session.cookie.sameSite,
          originalMaxAge: req.session.cookie.originalMaxAge,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          partitioned: (req.session.cookie as any).partitioned || false
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

// ユーザー登録エンドポイント
router.post('/register', async (req, res) => {
  try {
  const { username, password, displayName, role = 'employee', department, description } = req.body || {};

    // 入力バリデーション
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'ユーザー名とパスワードは必須です'
      });
    }

    if (typeof username !== 'string' || username.length < 3 || username.length > 50) {
      return res.status(400).json({ success: false, error: 'ユーザー名は3〜50文字で入力してください' });
    }
    if (typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'パスワード形式が不正です' });
    }
    // パスワード強度ポリシー: 8文字以上 / 大文字 / 小文字 / 数字 / 記号
    const policy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
    if (!policy.test(password)) {
      return res.status(400).json({ success: false, error: 'パスワードは英大文字・英小文字・数字・記号を各1文字以上含む8文字以上にしてください' });
    }
    if (role && !['employee', 'admin', 'system_admin', 'operator', 'user'].includes(role)) {
      return res.status(400).json({ success: false, error: 'role は system_admin/operator/user など定義済みの値を指定してください' });
    }

    // 既存ユーザー確認
    const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'このユーザー名は既に使用されています' });
    }

    // パスワードハッシュ
    const hashed = await bcrypt.hash(password, 10);

    // 作成
    const inserted = await db
      .insert(users)
      .values({
        username,
        password: hashed,
        displayName: displayName || username,
        role: role || 'employee',
        department: department ?? null,
        description: description ?? null
      })
      .returning();

    const created = inserted[0];

    return res.status(201).json({
      success: true,
      message: 'ユーザー登録成功',
      user: {
        id: created.id,
        username: created.username,
        displayName: created.displayName,
        role: created.role,
        department: created.department,
        description: created.description
      }
    });
  } catch (error) {
    console.error('ユーザー登録エラー:', error);
    return res.status(500).json({ success: false, error: 'ユーザー登録処理中にエラーが発生しました' });
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

export default router;
