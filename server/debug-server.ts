import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import session from 'express-session';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

console.log('🚀 デバッグサーバー起動開始');

const app = express();
const PORT = 3001;

console.log('📝 Expressアプリケーション作成完了');

// ミドルウェア
app.use(cors({
  origin: ['http://localhost:5002', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

console.log('📝 CORSとJSONミドルウェア設定完了');

// セッション設定
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // 開発環境ではfalse
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24時間
  }
}));

console.log('📝 セッション設定完了');

// データベース接続
console.log('🔍 データベース接続開始');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URLが設定されていません');
  process.exit(1);
}

console.log('📝 DATABASE_URL確認完了');

const client = postgres(connectionString);
const db = drizzle(client);

console.log('📝 データベース接続完了');

// ヘルスチェック
app.get('/api/health', (req, res) => {
  console.log('🔍 ヘルスチェックリクエスト受信');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

console.log('📝 ヘルスチェックエンドポイント設定完了');

// ログインエンドポイント
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 ログインリクエスト受信:', req.body);
    
    const { username, password } = req.body;

    if (!username || !password) {
      console.log('❌ ユーザー名またはパスワードが不足');
      return res.status(400).json({
        success: false,
        error: 'ユーザー名とパスワードを入力してください'
      });
    }

    console.log('🔍 データベースからユーザー検索開始:', username);
    
    // データベースからユーザーを検索
    const user = await db.select().from(users).where(eq(users.username, username)).limit(1);
    
    if (user.length === 0) {
      console.log('❌ ユーザーが見つかりません:', username);
      return res.status(401).json({
        success: false,
        error: 'ユーザー名またはパスワードが違います'
      });
    }

    const foundUser = user[0];
    console.log('✅ ユーザーが見つかりました:', { id: foundUser.id, username: foundUser.username });
    
    // パスワードチェック
    console.log('🔐 パスワード検証開始');
    let isValidPassword = false;
    
    try {
      isValidPassword = await bcrypt.compare(password, foundUser.password);
      console.log('🔐 bcrypt検証結果:', isValidPassword);
    } catch (error) {
      console.log('❌ bcrypt比較エラー:', error);
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
    
    console.log('💾 セッション保存開始');
    
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

      // 成功レスポンス
      res.json({
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
    console.error('❌ ログインエラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
});

console.log('📝 ログインエンドポイント設定完了');

// 認証確認エンドポイント
app.get('/api/auth/me', async (req, res) => {
  try {
    console.log('🔍 認証確認リクエスト受信:', {
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
    const user = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
    
    if (user.length === 0) {
      console.log('❌ ユーザーが見つかりません:', req.session.userId);
      return res.status(401).json({
        success: false,
        error: 'ユーザーが見つかりません'
      });
    }

    const foundUser = user[0];
    console.log('✅ 認証済みユーザー:', foundUser.username);

    res.json({
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
    console.error('❌ 認証確認エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
});

console.log('📝 認証確認エンドポイント設定完了');

// ログアウトエンドポイント
app.post('/api/auth/logout', (req, res) => {
  try {
    console.log('🔐 ログアウトリクエスト受信');
    
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

console.log('📝 ログアウトエンドポイント設定完了');

// サーバー起動
console.log('🚀 サーバー起動開始 - ポート:', PORT);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ デバッグサーバーが起動しました: http://localhost:${PORT}`);
  console.log(`🔐 ログインエンドポイント: http://localhost:${PORT}/api/auth/login`);
  console.log(`👤 テストユーザー: niina / 0077`);
  console.log(`🔍 ヘルスチェック: http://localhost:${PORT}/api/health`);
});

console.log('📝 サーバー起動処理完了');

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕捉例外:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未処理のPromise拒否:', reason);
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('🛑 サーバーを停止中...');
  client.end();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 サーバーを停止中...');
  client.end();
  process.exit(0);
});

console.log('�� エラーハンドリング設定完了'); 