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
      headers: req.headers['content-type'],
      origin: req.headers.origin,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      host: req.headers.host,
      referer: req.headers.referer
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
    console.log('🔐 パスワード検証中...');
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('🔑 パスワード検証:', { 
      username,
      isValid: isValidPassword 
    });

    if (!isValidPassword) {
      logError(`パスワードが正しくありません: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'ユーザー名またはパスワードが正しくありません'
      });
    }

    // セッションにユーザー情報を保存
    if (req.session) {
      req.session.userId = user.id;
      req.session.userRole = user.role;
      console.log('💾 セッション保存:', { 
        userId: user.id,
        userRole: user.role
      });
    }

    // レスポンスデータ
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

    console.log('✅ ログイン成功:', responseData);
    res.status(200).json(responseData);
  } catch (error) {
    console.error('❌ ログインエラー:', error);
    logError(`ログインエラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

// ユーザー登録
router.post('/register', async (req, res) => {
  try {
    console.log('📝 ユーザー登録リクエスト受信:', { 
      body: req.body,
      hasSession: !!req.session
    });
    
    const { username, password, displayName, role = 'employee' } = req.body;
    
    if (!username || !password || !displayName) {
      return res.status(400).json({
        success: false,
        message: 'ユーザー名、パスワード、表示名が必要です'
      });
    }

    // 既存ユーザーの確認
    const existingUser = await db.query.users.findFirst({
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
    const newUser = await db.insert(users).values({
      username,
      password: hashedPassword,
      display_name: displayName,
      role,
      department: req.body.department || null
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
    logError(`ユーザー登録エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

// ログアウト
router.post('/logout', (req, res) => {
  console.log('🚪 ログアウトリクエスト受信:', {
    hasSession: !!req.session,
    userId: req.session?.userId
  });
  
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
    console.log('⚠️ セッションが存在しません');
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
  
  // データベースからユーザー情報を取得
  const user = await db.query.users.findFirst({
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
});

export const authRouter = router;
