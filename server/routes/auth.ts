
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
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required'
      });
    }

    // ユーザーデータを読み込み
    const users = await loadUsers();
    
    // ユーザー認証
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // JWT_SECRETを環境変数から取得
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET environment variable is not set');
      return res.status(500).json({
        error: 'Server configuration error'
      });
    }

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

    // 成功レスポンス
    res.json({
      message: 'Login successful',
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
      error: 'Internal server error'
    });
  }
});

export default router;
