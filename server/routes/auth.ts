
import express from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// ユーザーデータファイルのパス
const usersFilePath = path.join(__dirname, '../data/users.json');

// ユーザーデータを読み込む関数
async function loadUsers() {
  try {
    const data = await fs.readFile(usersFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading users:', error);
    return [];
  }
}

// ログインエンドポイント
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt:', req.body);
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required'
      });
    }

    // ユーザーデータを読み込み
    const users = await loadUsers();
    console.log('👥 Available users:', users.map(u => u.username));
    
    // ユーザー認証
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
      console.log('❌ Invalid credentials for:', username);
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // JWT_SECRETを環境変数から取得（開発環境対応）
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
    console.log('🔑 JWT Secret configured:', jwtSecret ? 'YES' : 'NO');

    // JWTトークンを生成（1時間有効）
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role 
      },
      jwtSecret,
      { expiresIn: '1h' }
    );

    console.log('✅ Login successful for:', username);

    // 成功レスポンス（Reactの認証コンテキストに合わせる）
    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        role: user.role,
        department: user.department || 'General'
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// ログアウトエンドポイント
router.post('/logout', (req, res) => {
  try {
    console.log('🚪 Logout request');
    return res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// 現在のユーザー情報取得
router.get('/me', (req, res) => {
  try {
    // JWTトークンからユーザー情報を取得する実装
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
    
    try {
      const decoded = jwt.verify(token, jwtSecret) as any;
      return res.json({
        success: true,
        user: {
          id: decoded.id,
          username: decoded.username,
          role: decoded.role
        }
      });
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Invalid token'
      });
    }
  } catch (error) {
    console.error('❌ Get user error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

export default router;
