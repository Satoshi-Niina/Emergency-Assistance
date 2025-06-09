
const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const bcrypt = require('bcrypt');

dotenv.config();

// データベース接続
let db;
try {
  const { db: database } = require('./db');
  const { users } = require('../shared/schema');
  const { eq } = require('drizzle-orm');
  db = database;
  console.log('✅ データベース接続成功');
} catch (error) {
  console.error('❌ データベース接続失敗:', error);
}

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
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    
    console.log(`🔐 ログイン試行: username="${username}"`);
    
    try {
        if (!db) {
            console.error('❌ データベース接続なし - フォールバック認証を使用');
            // フォールバック認証（開発用）
            if (username === 'niina' && password === '0077') {
                const user = {
                    id: '1',
                    username: 'niina',
                    display_name: '管理者',
                    role: 'admin'
                };
                
                req.session.userId = user.id;
                req.session.user = user;
                
                return res.json({
                    success: true,
                    user: user
                });
            } else {
                return res.status(401).json({
                    success: false,
                    message: 'ユーザー名またはパスワードが正しくありません'
                });
            }
        }

        // データベースからユーザーを検索
        const { users } = require('../shared/schema');
        const { eq } = require('drizzle-orm');
        
        const user = await db.query.users.findFirst({
            where: eq(users.username, username)
        });
        
        console.log(`🔍 ユーザー検索結果: ${user ? 'found' : 'not found'}`);
        
        if (!user) {
            console.log(`❌ ユーザーが見つかりません: ${username}`);
            return res.status(401).json({
                success: false,
                message: 'ユーザー名またはパスワードが正しくありません'
            });
        }
        
        // パスワード検証
        let passwordValid = false;
        
        // ハッシュ化されたパスワードをチェック
        if (user.password.startsWith('$2')) {
            // bcryptハッシュの場合
            passwordValid = await bcrypt.compare(password, user.password);
            console.log(`🔒 bcryptパスワード検証: ${passwordValid ? 'success' : 'failed'}`);
        } else {
            // プレーンテキストの場合（後方互換性）
            passwordValid = user.password === password;
            console.log(`🔓 プレーンテキストパスワード検証: ${passwordValid ? 'success' : 'failed'}`);
        }
        
        if (!passwordValid) {
            console.log(`❌ パスワードが一致しません: ${username}`);
            return res.status(401).json({
                success: false,
                message: 'ユーザー名またはパスワードが正しくありません'
            });
        }
        
        // ログイン成功
        const userInfo = {
            id: user.id,
            username: user.username,
            display_name: user.display_name,
            role: user.role,
            department: user.department
        };
        
        req.session.userId = user.id;
        req.session.user = userInfo;
        
        console.log(`✅ ログイン成功: ${username} (role: ${user.role})`);
        
        res.json({
            success: true,
            user: userInfo
        });
        
    } catch (error) {
        console.error('❌ ログインエラー:', error);
        res.status(500).json({
            success: false,
            message: 'サーバーエラーが発生しました'
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

// ユーザー一覧取得（デバッグ用）
app.get('/api/users/list', async (req, res) => {
    try {
        if (!db) {
            return res.json({ message: 'データベース接続なし', users: [] });
        }
        
        const allUsers = await db.query.users.findMany({
            columns: {
                id: true,
                username: true,
                display_name: true,
                role: true,
                department: true,
                created_at: true
            }
        });
        
        res.json({ users: allUsers });
    } catch (error) {
        console.error('ユーザー一覧取得エラー:', error);
        res.status(500).json({ error: error.message });
    }
});

// ユーザー作成エンドポイント
app.post('/api/users/create', async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({ error: 'データベース接続なし' });
        }
        
        const { username, password, display_name, role, department } = req.body;
        
        // パスワードをハッシュ化
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const { users } = require('../shared/schema');
        
        const newUser = await db.insert(users).values({
            username,
            password: hashedPassword,
            display_name,
            role: role || 'employee',
            department
        }).returning();
        
        console.log(`✅ ユーザー作成成功: ${username}`);
        res.json({ success: true, user: newUser[0] });
        
    } catch (error) {
        console.error('ユーザー作成エラー:', error);
        res.status(500).json({ error: error.message });
    }
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
