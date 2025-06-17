
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
    const { username, password } = req.body;
    
    logInfo(`ログイン試行: ${username}`);
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'ユーザー名とパスワードが必要です'
      });
    }

    // ユーザー検索
    const user = await db.query.users.findFirst({
      where: eq(users.username, username)
    });

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

    logInfo(`ログイン成功: ${username} (${user.role})`);

    res.json({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      department: user.department
    });

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
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        message: '認証されていません'
      });
    }

    res.json({
      id: req.session.userId,
      username: req.session.username,
      display_name: req.session.username, // display_nameがない場合はusernameを使用
      role: req.session.userRole
    });
  } catch (error) {
    logError('ユーザー情報取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

export const authRouter = router;
