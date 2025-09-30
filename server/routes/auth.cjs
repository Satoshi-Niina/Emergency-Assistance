const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const router = express.Router();

// JWT発行ユーティリティ
const issueJwt = (userId, options = {}) => {
  const payload = { uid: userId };
  const jwtOptions = { expiresIn: '1d' };
  if (options.exp) {
    jwtOptions.expiresIn = Math.floor((options.exp - Date.now()) / 1000) + 's';
  }
  return jwt.sign(payload, process.env.JWT_SECRET, jwtOptions);
};

// ログインエンドポイント
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    
    // 入力検証
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'bad_request',
        message: 'ユーザー名とパスワードが必要です'
      });
    }

    // データベース接続確認
    if (!global.dbPool) {
      return res.status(500).json({
        success: false,
        error: 'database_unavailable',
        message: 'データベース接続が利用できません'
      });
    }

    // ユーザー検索
    const userQuery = 'SELECT id, username, password_hash, role FROM users WHERE username = $1';
    const userResult = await global.dbPool.query(userQuery, [username]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'invalid_credentials',
        message: 'ユーザー名またはパスワードが正しくありません'
      });
    }

    const user = userResult.rows[0];
    
    // パスワード検証
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'invalid_credentials',
        message: 'ユーザー名またはパスワードが正しくありません'
      });
    }

    // JWT発行
    const token = issueJwt(user.id);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'internal_error',
      message: 'ログイン処理中にエラーが発生しました'
    });
  }
});

// ハンドシェイクエンドポイント
router.get('/handshake', (req, res) => {
  res.json({
    success: true,
    message: 'Authentication service is running',
    timestamp: new Date().toISOString()
  });
});

// トークン検証エンドポイント
router.get('/verify', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'no_token',
        message: '認証トークンが必要です'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    res.json({
      success: true,
      user: {
        id: decoded.uid
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      error: 'invalid_token',
      message: '無効な認証トークンです'
    });
  }
});

module.exports = router;
