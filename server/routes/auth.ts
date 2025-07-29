
import * as express from 'express';
import * as bcrypt from 'bcrypt';
import { users } from '../db/schema.js';
import { db } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { logInfo, logError } from '../lib/logger.js';

const router = express.Router();

console.log('🔧 [AUTH ROUTER] 認証ルーター初期化開始');

// ログイン
router.post('/login', async (req, res) => {
  console.log('\n🚀 ===== ログイン処理開始 =====');
  console.log('📍 リクエスト詳細:', {
    method: req.method,
    url: req.url,
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    body: req.body,
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
      'origin': req.headers.origin
    }
  });
  
  try {
    const { username, password } = req.body;
    
    // 入力検証
    if (!username || !password) {
      console.log('❌ 入力検証失敗:', { username: !!username, password: !!password });
      return res.status(400).json({
        success: false,
        message: 'ユーザー名とパスワードが必要です'
      });
    }

    console.log('🔍 ログイン試行:', { username });

    // データベース接続テスト
    console.log('🔍 データベース接続テスト中...');
    try {
      const testQuery = await db.select().from(users).limit(1);
      console.log('✅ データベース接続成功, レコード数:', testQuery.length);
    } catch (dbError) {
      console.error('❌ データベース接続エラー:', dbError);
      return res.status(500).json({
        success: false,
        message: 'データベース接続エラー'
      });
    }

    // ユーザー検索（型エラー回避のためany使用）
    console.log('🔍 ユーザー検索開始:', username);
    let user;
    try {
      user = await (db as any).query.users.findFirst({
        where: eq(users.username, username)
      });
      console.log('📊 ユーザー検索結果:', user ? '見つかりました' : '見つかりません');
    } catch (queryError) {
      console.error('❌ ユーザー検索エラー:', queryError);
      return res.status(500).json({
        success: false,
        message: 'ユーザー検索エラー'
      });
    }

    if (!user) {
      console.log('❌ ユーザーが存在しません:', username);
      return res.status(401).json({
        success: false,
        message: 'ユーザー名またはパスワードが正しくありません'
      });
    }

    // パスワード検証
    console.log('🔐 パスワード検証中...');
    let isValidPassword;
    try {
      isValidPassword = await bcrypt.compare(password, user.password);
      console.log('🔑 パスワード検証結果:', isValidPassword);
    } catch (bcryptError) {
      console.error('❌ パスワード検証エラー:', bcryptError);
      return res.status(500).json({
        success: false,
        message: 'パスワード検証エラー'
      });
    }

    if (!isValidPassword) {
      console.log('❌ パスワードが正しくありません:', username);
      return res.status(401).json({
        success: false,
        message: 'ユーザー名またはパスワードが正しくありません'
      });
    }

    // セッション設定
    if (req.session) {
      req.session.userId = user.id;
      req.session.userRole = user.role;
      console.log('💾 セッション保存完了:', { 
        userId: user.id,
        userRole: user.role
      });
    } else {
      console.log('⚠️ セッションが利用できません');
    }

    // 成功レスポンス
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
    logInfo(`ログイン成功: ${username}`);
    
    res.status(200).json(responseData);
    
  } catch (error) {
    console.error('❌ ログイン処理例外:', error);
    logError(`ログイン処理例外: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
