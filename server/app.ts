import express, { Request, Response } from 'express';
import session from 'express-session';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config(); // .env 読み込み（省略していた部分）

const app = express();

// CORS設定（フロントエンドからのリクエストを許可）
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// JSONパース
app.use(express.json());

// セッション設定（セッションでログイン情報を保持）
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // 本番では true に（HTTPSのみで送信されるようになる）
    maxAge: 1000 * 60 * 60 // 1時間
  }
}));

// ✅ ヘルスチェックAPI
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ✅ ダミーログインAPI（セッションに保存）
app.post('/api/auth/login', (req: Request, res: Response) => {
  req.session.user = {
    id: '123',
    name: 'テストユーザー'
  };
  res.json({ message: 'ログイン成功', user: req.session.user });
});

// ✅ ログイン中ユーザー取得API
app.get('/api/auth/user', (req: Request, res: Response) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: '未ログイン' });
  }
  res.json(req.session.user);
});

// ✅ ログアウトAPI
app.post('/api/auth/logout', (req: Request, res: Response) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'ログアウト失敗' });
    res.json({ message: 'ログアウトしました' });
  });
});

// 👇 サーバーを外部ファイルで起動する場合に備えて export
export default app;

