const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3001; // フロントエンドが期待するポート
const DATABASE_URL = "postgresql://postgres:password@localhost:5432/emergency_assistance";
const SESSION_SECRET = "local-test-secret-key-12345";

const pool = new Pool({ connectionString: DATABASE_URL });

// CORS設定
app.use(cors({ 
  origin: ['http://localhost:5173', 'http://localhost:5002', 'http://localhost:5003'],
  credentials: true 
}));

app.use(express.json());
app.use(cookieParser());

const signToken = (payload) => jwt.sign(payload, SESSION_SECRET, { expiresIn: '7d' });

// ヘルスチェック
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ 
      status: 'ok', 
      db: 'ok', 
      port: PORT,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ 
      status: 'error', 
      db: 'fail', 
      message: e.message, 
      port: PORT 
    });
  }
});

// ログインAPI
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  console.log(`[LOGIN] ログイン試行: ${username}`);

  try {
    const { rows } = await pool.query(
      'SELECT id, username, password, display_name, role FROM users WHERE username=$1 LIMIT 1',
      [username]
    );
    const user = rows[0];

    if (!user) {
      console.log(`[LOGIN] ユーザーが見つかりません: ${username}`);
      return res.status(401).json({ 
        success: false, 
        message: 'ユーザー名またはパスワードが間違っています' 
      });
    }

    // 平文パスワードを直接比較（ローカル開発用）
    if (user.password !== password) {
      console.log(`[LOGIN] パスワードが一致しません: ${username}`);
      return res.status(401).json({ 
        success: false, 
        message: 'ユーザー名またはパスワードが間違っています' 
      });
    }

    const token = signToken({
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.display_name,
    });

    res.cookie('sid', token, {
      httpOnly: true,
      secure: false, // ローカル開発用
      sameSite: 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    console.log(`[LOGIN] ログイン成功: ${username}`);
    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('[LOGIN] エラー:', error);
    res.status(500).json({ 
      success: false, 
      message: 'サーバーエラーが発生しました', 
      error: error.message 
    });
  }
});

// ユーザー情報取得API
app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.cookies.sid;
    if (!token) {
      return res.status(401).json({ success: false, message: '認証が必要です' });
    }

    const decoded = jwt.verify(token, SESSION_SECRET);
    res.status(200).json({
      success: true,
      user: {
        id: decoded.id,
        username: decoded.username,
        displayName: decoded.displayName,
        role: decoded.role,
      },
    });
  } catch (error) {
    console.error('[ME] エラー:', error);
    res.status(401).json({ success: false, message: '認証に失敗しました' });
  }
});

// ログアウトAPI
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('sid');
  res.status(200).json({ success: true, message: 'ログアウトしました' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] ローカルテストサーバー起動: http://0.0.0.0:${PORT}`);
  console.log(`[SERVER] データベース: ${DATABASE_URL}`);
  console.log(`[SERVER] テストユーザー: testuser / test123`);
});
