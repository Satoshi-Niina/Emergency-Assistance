// ローカル開発専用サーバー（シンプル版）
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const port = 7000; // ローカル専用ポート

// 環境変数
const DATABASE_URL =
  'postgresql://postgres:password@localhost:5432/emergency_assistance';
const SESSION_SECRET = 'local-development-secret-key-12345';
const FRONTEND_ORIGIN = 'http://localhost:5173';

// ミドルウェア設定
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// データベース接続
const pool = new Pool({ connectionString: DATABASE_URL });

// JWTユーティリティ
const signToken = payload =>
  jwt.sign(payload, SESSION_SECRET, { expiresIn: '7d' });

const readUserFromCookie = req => {
  const token = req.cookies?.sid;
  if (!token) return null;
  try {
    return jwt.verify(token, SESSION_SECRET);
  } catch {
    return null;
  }
};

// ヘルスチェック
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'ok', port: port });
  } catch (error) {
    res.json({ status: 'degraded', db: 'fail', error: error.message });
  }
});

// ログイン
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: 'Username and password are required' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, username, password, display_name, role FROM users WHERE username=$1 LIMIT 1',
      [username]
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // パスワードの比較（ハッシュ化されていない場合は直接比較）
    const isValidPassword = user.password === password;
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken({
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.display_name,
    });

    res.cookie('sid', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// 現在のユーザー取得
app.get('/api/auth/me', (req, res) => {
  const user = readUserFromCookie(req);
  if (!user) {
    return res.json({ authenticated: false, user: null });
  }

  res.json({
    authenticated: true,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    },
  });
});

// ログアウト
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('sid');
  res.json({ success: true });
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404ハンドリング
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// サーバー起動
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 ローカル開発サーバー起動: http://localhost:${port}`);
  console.log(`📊 データベース: ${DATABASE_URL}`);
  console.log(`🌐 フロントエンド: ${FRONTEND_ORIGIN}`);
});
