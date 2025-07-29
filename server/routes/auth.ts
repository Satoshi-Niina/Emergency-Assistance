import * as express from 'express';
import * as bcrypt from 'bcrypt';
import { users } from '../db/schema.js';
import { db } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { logInfo, logError } from '../lib/logger.js';
import { Request, Response } from 'express';

const router = express.Router();

console.log('🔧 [AUTH ROUTER] 認証ルーター初期化開始');

// ログイン
router.post('/login', async (req: Request, res: Response) => {
    console.log('🔐 [AUTH] ログインリクエスト受信:', { 
      body: req.body,
      hasUsername: !!req.body?.username,
      hasPassword: !!req.body?.password 
    });

    try {
      const { username, password } = req.body;

      if (!username || !password) {
        console.log('❌ [AUTH] ユーザー名またはパスワードが未入力');
        return res.status(400).json({ 
          success: false, 
          message: 'ユーザー名とパスワードが必要です' 
        });
      }

      console.log('🔍 [AUTH] データベースでユーザー検索:', username);

      const user = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      console.log('🔍 [AUTH] ユーザー検索結果:', { 
        found: user.length > 0,
        userId: user[0]?.id,
        userRole: user[0]?.role 
      });

      if (user.length === 0) {
        console.log('❌ [AUTH] ユーザーが見つかりません:', username);
        return res.status(401).json({ 
          success: false, 
          message: 'ユーザー名またはパスワードが正しくありません' 
        });
      }

      const foundUser = user[0];
      console.log('🔍 [AUTH] パスワード照合開始');

      const isValidPassword = await bcrypt.compare(password, foundUser.password);
      console.log('🔍 [AUTH] パスワード照合結果:', isValidPassword);

      if (!isValidPassword) {
        console.log('❌ [AUTH] パスワードが正しくありません');
        return res.status(401).json({ 
          success: false, 
          message: 'ユーザー名またはパスワードが正しくありません' 
        });
      }

      // セッション作成
      console.log('✅ [AUTH] 認証成功 - セッション作成開始');
      req.session.userId = foundUser.id;
      req.session.user = {
        id: foundUser.id,
        username: foundUser.username,
        displayName: foundUser.displayName,
        role: foundUser.role,
        department: foundUser.department || ''
      };

      console.log('✅ [AUTH] セッション作成完了:', { 
        sessionId: req.sessionID,
        userId: foundUser.id 
      });

      const response = {
        success: true,
        user: {
          id: foundUser.id,
          username: foundUser.username,
          displayName: foundUser.displayName,
          role: foundUser.role,
          department: foundUser.department || ''
        }
      };

      console.log('📤 [AUTH] レスポンス送信:', response);
      res.json(response);

    } catch (error) {
      console.error('❌ [AUTH] ログインエラー:', error);
      res.status(500).json({ 
        success: false, 
        message: 'サーバーエラーが発生しました' 
      });
    }
  });

// ユーザー登録
router.post('/register', async (req, res) => {
  console.log('📝 ユーザー登録リクエスト受信:', { 
    body: req.body,
    hasSession: !!req.session
  });

  try {
    const { username, password, displayName, role = 'employee' } = req.body;

    if (!username || !password || !displayName) {
      return res.status(400).json({
        success: false,
        message: 'ユーザー名、パスワード、表示名が必要です'
      });
    }

    // 既存ユーザーの確認
    const existingUser = await (db as any).query.users.findFirst({
      where: eq(users.username, username)
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'このユーザー名は既に使用されています'
      });
    }

    // パスワードのハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);

    // ユーザーの作成
    const newUser = await (db as any).insert(users).values({
      username: username,
      password: hashedPassword,
      display_name: displayName,
      role: role,
      department: req.body.department || '',
      description: req.body.description || '',
      created_at: new Date()
    }).returning();

    const user = newUser[0];

    // セッションにユーザー情報を保存
    if (req.session) {
      req.session.userId = user.id;
      req.session.userRole = user.role;
    }

    const responseData = {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
        department: user.department
      }
    };

    console.log('✅ ユーザー登録成功:', responseData);
    res.status(201).json(responseData);
  } catch (error) {
    console.error('❌ ユーザー登録エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

// ログアウト
router.post('/logout', (req, res) => {
  console.log('🚪 ログアウトリクエスト受信');

  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('❌ セッション削除エラー:', err);
        return res.status(500).json({
          success: false,
          message: 'ログアウト中にエラーが発生しました'
        });
      }
      console.log('✅ ログアウト成功');
      res.status(200).json({
        success: true,
        message: 'ログアウトしました'
      });
    });
  } else {
    res.status(200).json({
      success: true,
      message: 'ログアウトしました'
    });
  }
});

// 現在のユーザー情報取得
router.get('/me', async (req, res) => {
  console.log('👤 ユーザー情報取得リクエスト:', {
    hasSession: !!req.session,
    userId: req.session?.userId
  });

  if (!req.session || !req.session.userId) {
    console.log('❌ 認証されていません');
    return res.status(401).json({
      success: false,
      message: '認証されていません'
    });
  }

  try {
    const user = await (db as any).query.users.findFirst({
      where: eq(users.id, req.session.userId)
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'ユーザーが見つかりません'
      });
    }

    const userData = {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      department: user.department
    };

    console.log('✅ ユーザー情報取得成功:', userData);
    res.status(200).json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error('❌ ユーザー情報取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラー'
    });
  }
});

console.log('✅ [AUTH ROUTER] 認証ルーター初期化完了');
console.log('📍 登録されたルート: POST /login, POST /register, POST /logout, GET /me');

export { router as authRouter };
export default router;