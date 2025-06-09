
const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['http://localhost:3000', 'https://*.replit.dev', 'https://*.repl.co'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// セッション設定
app.use(session({
  secret: process.env.SESSION_SECRET || 'emergency-recovery-system-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  name: 'emergency.session',
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24時間
    sameSite: 'lax'
  }
}));

// knowledge-base静的ファイル配信
const knowledgeBasePath = path.resolve(__dirname, '../knowledge-base');
app.use('/knowledge-base', express.static(knowledgeBasePath));

// 静的ファイル配信
const distPath = path.resolve(__dirname, '../client/dist');
app.use(express.static(distPath));

// 認証エンドポイント
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    // デモ用認証
    if ((username === 'niina' && password === '0077') || 
        (username === 'employee' && password === 'employee123')) {
        const user = {
            id: username === 'niina' ? '1' : '2',
            username: username,
            display_name: username === 'niina' ? '管理者' : '一般ユーザー',
            role: username === 'niina' ? 'admin' : 'employee'
        };
        
        // セッションにユーザー情報を保存
        req.session.userId = user.id;
        req.session.user = user;
        
        res.json({
            success: true,
            user: user
        });
    } else {
        res.status(401).json({
            success: false,
            message: 'ユーザー名またはパスワードが正しくありません'
        });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('セッション破棄エラー:', err);
            return res.status(500).json({ success: false, message: 'ログアウトに失敗しました' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

app.get('/api/auth/me', (req, res) => {
    if (req.session && req.session.user) {
        res.json(req.session.user);
    } else {
        res.status(401).json({ message: 'Not authenticated' });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// SPAルーティング（APIルート以外は全てindex.htmlを返す）
app.get('*', (req, res) => {
    const fs = require('fs');
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(503).send('<h1>Application not built</h1><p>Run: npm run build:client</p>');
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
