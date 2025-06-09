
import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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
        res.json({
            success: true,
            user: {
                id: username === 'niina' ? '1' : '2',
                username: username,
                display_name: username === 'niina' ? '管理者' : '一般ユーザー',
                role: username === 'niina' ? 'admin' : 'employee'
            }
        });
    } else {
        res.status(401).json({
            success: false,
            message: 'ユーザー名またはパスワードが正しくありません'
        });
    }
});

app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
    res.status(401).json({ message: 'Not authenticated' });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// SPAルーティング（APIルート以外は全てindex.htmlを返す）
app.get('*', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (require('fs').existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(503).send('<h1>Application not built</h1><p>Run: npm run build:client</p>');
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
