import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import session from 'express-session';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import path from 'path';
import { fileURLToPath } from 'url';

// セッションの型定義を拡張
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userRole?: string;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// ミドルウェア
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5002',
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../client/dist')));

// セッション設定
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// データベース接続
let db: any = null;
let client: any = null;

async function initializeDatabase() {
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error('❌ DATABASE_URLが設定されていません');
      return false;
    }

    client = postgres(connectionString, {
      max: 5, // 接続数を減らす
      idle_timeout: 15000, // タイムアウトを短縮
      connect_timeout: 5000, // 接続タイムアウトを短縮
      connection: {
        application_name: 'emergency-assistance-server'
      }
    });
    db = drizzle(client);
    
    // データベース接続テスト（タイムアウト付き）
    const testPromise = client`SELECT 1`;
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database connection timeout')), 10000)
    );
    
    await Promise.race([testPromise, timeoutPromise]);
    console.log('✅ データベース接続成功');
    return true;
  } catch (error) {
    console.error('❌ データベース接続エラー:', error);
    return false;
  }
}

// ヘルスチェック
app.get('/healthz', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: db ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  });
});

// APIヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: db ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  });
});

// ログインエンドポイント
app.post('/api/auth/login', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({
        success: false,
        error: 'データベースが利用できません'
      });
    }

    console.log('🔐 ログインリクエスト:', req.body);
    
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'ユーザー名とパスワードを入力してください'
      });
    }

    // データベースからユーザーを検索（簡易版）
    const result = await client`SELECT * FROM users WHERE username = ${username} LIMIT 1`;
    
    if (result.length === 0) {
      console.log('❌ ユーザーが見つかりません:', username);
      return res.status(401).json({
        success: false,
        error: 'ユーザー名またはパスワードが違います'
      });
    }

    const foundUser = result[0];
    console.log('✅ ユーザーが見つかりました:', { id: foundUser.id, username: foundUser.username });
    
    // パスワードチェック
    let isValidPassword = false;
    
    try {
      isValidPassword = await bcrypt.compare(password, foundUser.password);
      console.log('🔐 bcrypt検証結果:', isValidPassword);
    } catch (error) {
      console.log('bcrypt比較エラー:', error);
    }
    
    if (!isValidPassword) {
      console.log('❌ パスワードが無効です');
      return res.status(401).json({
        success: false,
        error: 'ユーザー名またはパスワードが違います'
      });
    }

    console.log('✅ ログイン成功:', username);

    // セッションにユーザー情報を保存
    req.session.userId = foundUser.id;
    req.session.userRole = foundUser.role;
    
    // セッションを明示的に保存
    req.session.save((err) => {
      if (err) {
        console.error('❌ セッション保存エラー:', err);
        return res.status(500).json({
          success: false,
          error: 'セッションの保存に失敗しました'
        });
      }
      
      console.log('💾 セッション保存成功:', {
        userId: req.session.userId,
        userRole: req.session.userRole,
        sessionId: req.session.id
      });

      res.json({
        success: true,
        user: {
          id: foundUser.id,
          username: foundUser.username,
          displayName: foundUser.display_name || foundUser.username,
          role: foundUser.role,
          department: foundUser.department || 'General'
        }
      });
    });

  } catch (error) {
    console.error('❌ ログインエラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
});

// 認証確認エンドポイント
app.get('/api/auth/me', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({
        success: false,
        error: 'データベースが利用できません'
      });
    }

    console.log('🔍 認証確認リクエスト:', {
      sessionId: req.session?.id,
      userId: req.session?.userId,
      userRole: req.session?.userRole
    });

    if (!req.session || !req.session.userId) {
      console.log('❌ セッションが存在しません');
      return res.status(401).json({
        success: false,
        error: '未認証'
      });
    }

    // データベースからユーザー情報を取得
    const result = await client`SELECT * FROM users WHERE id = ${req.session.userId} LIMIT 1`;
    
    if (result.length === 0) {
      console.log('❌ ユーザーが見つかりません:', req.session.userId);
      return res.status(401).json({
        success: false,
        error: 'ユーザーが見つかりません'
      });
    }

    const foundUser = result[0];
    console.log('✅ 認証済みユーザー:', foundUser.username);

    res.json({
      success: true,
      user: {
        id: foundUser.id,
        username: foundUser.username,
        displayName: foundUser.display_name || foundUser.username,
        role: foundUser.role,
        department: foundUser.department || 'General'
      }
    });

  } catch (error) {
    console.error('❌ 認証確認エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
});

// ログアウトエンドポイント
app.post('/api/auth/logout', (req, res) => {
  try {
    console.log('🔐 ログアウトリクエスト');
    
    req.session.destroy((err) => {
      if (err) {
        console.error('❌ セッション削除エラー:', err);
        return res.status(500).json({
          success: false,
          error: 'ログアウトに失敗しました'
        });
      }
      
      console.log('✅ ログアウト成功');
      res.json({
        success: true,
        message: 'ログアウトに成功しました'
      });
    });
  } catch (error) {
    console.error('❌ ログアウトエラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
});

// フロントエンドのルート
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

// サーバー起動
async function startServer() {
  console.log('🚀 本番サーバーを起動中...');
  
  // データベース初期化（並行実行）
  const dbInitPromise = initializeDatabase();
  
  // サーバーを即座に起動
  const server = app.listen(PORT, HOST, () => {
    console.log(`✅ 本番サーバーが起動しました: http://${HOST}:${PORT}`);
    console.log(`🔐 ログインエンドポイント: http://${HOST}:${PORT}/api/auth/login`);
    console.log(`🌍 環境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 プロセスID: ${process.pid}`);
    console.log(`⏰ 起動時刻: ${new Date().toISOString()}`);
  });
  
  // データベース接続結果を待つ（非ブロッキング）
  dbInitPromise.then((dbInitialized) => {
    console.log(`🗄️ データベース: ${dbInitialized ? '接続済み' : '未接続'}`);
  }).catch((error) => {
    console.log('⚠️ データベース接続なしでサーバーを起動します');
  });
  
  return server;
}

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('🛑 サーバーを停止中...');
  if (client) {
    client.end();
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 サーバーを停止中...');
  if (client) {
    client.end();
  }
  process.exit(0);
});

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕捉の例外:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未処理のPromise拒否:', reason);
  process.exit(1);
});

// サーバー起動
startServer().catch((error) => {
  console.error('❌ サーバー起動エラー:', error);
  process.exit(1);
});
