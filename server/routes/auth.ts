
import { Router } from 'express';
import bcrypt from 'bcrypt';
import { users } from '../db/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { logInfo, logError } from '../lib/logger';

const router = Router();

// ログイン
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 ログインリクエスト受信:', { 
      body: req.body, 
      hasSession: !!req.session,
      headers: req.headers['content-type']
    });
    const { username, password } = req.body;
    
    logInfo(`ログイン試行: ${username}`);
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'ユーザー名とパスワードが必要です'
      });
    }

    // データベース接続確認
    console.log('🔍 データベース接続状況を確認中...');
    try {
      // 簡単な接続テスト
      await db.select().from(users).limit(1);
      console.log('✅ データベース接続正常');
    } catch (dbError) {
      console.error('❌ データベース接続エラー:', dbError);
      throw new Error('データベースに接続できません');
    }

    // ユーザー検索
    console.log('🔍 データベースからユーザー検索中:', username);
    const user = await db.query.users.findFirst({
      where: eq(users.username, username)
    });
    console.log('📊 ユーザー検索結果:', user ? 'ユーザー見つかりました' : 'ユーザーが見つかりません');

    if (!user) {
      logError(`ユーザーが見つかりません: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'ユーザー名またはパスワードが正しくありません'
      });
    }

    // パスワード検証
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      logError(`パスワードが正しくありません: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'ユーザー名またはパスワードが正しくありません'
      });
    }

    // セッション設定
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.userRole = user.role;

    console.log('✅ セッション設定完了:', {
      userId: req.session.userId,
      username: req.session.username,
      role: req.session.userRole
    });

    logInfo(`ログイン成功: ${username} (${user.role})`);

    const responseData = {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name || user.username,
        role: user.role,
        department: user.department
      }
    };

    console.log('📤 ログインレスポンス:', responseData);
    res.json(responseData.user);

  } catch (error) {
    logError('ログインエラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ログアウト
router.post('/logout', (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        logError('ログアウトエラー:', err);
        return res.status(500).json({
          success: false,
          message: 'ログアウトに失敗しました'
        });
      }
      
      res.clearCookie('connect.sid');
      res.json({
        success: true,
        message: 'ログアウトしました'
      });
    });
  } catch (error) {
    logError('ログアウトエラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

// 現在のユーザー情報取得
router.get('/me', (req, res) => {
  try {
    console.log('🔍 認証チェック - セッション状態:', {
      hasSession: !!req.session,
      userId: req.session?.userId,
      username: req.session?.username,
      role: req.session?.userRole
    });

    if (!req.session || !req.session.userId) {
      console.log('❌ 認証失敗 - セッションまたはユーザーIDなし');
      return res.status(401).json({
        success: false,
        message: '認証されていません'
      });
    }

    const userData = {
      id: req.session.userId,
      username: req.session.username,
      display_name: req.session.username,
      role: req.session.userRole,
      department: req.session.userDepartment || null
    };

    console.log('📤 認証成功 - ユーザー情報:', userData);
    res.json(userData);
  } catch (error) {
    console.error('❌ ユーザー情報取得エラー:', error);
    logError('ユーザー情報取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export const authRouter = router;
