import express from "express";
import cors from "cors";

const app = express();
const port = 3001;

// CORS設定
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Origin',
    'Accept',
    'credentials',
    'cache-control'
  ],
  exposedHeaders: ['Set-Cookie']
}));

// JSONパース
app.use(express.json());

// ヘルスチェック
app.get("/api/health", (_, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// テスト用ログインAPI
app.post("/api/auth/login", (req, res) => {
  console.log('Login request:', req.body);
  res.json({ 
    message: "ログイン成功", 
    user: { id: '123', name: 'テストユーザー' },
    timestamp: new Date().toISOString()
  });
});

// ユーザー情報取得API
app.get("/api/auth/me", (req, res) => {
  res.json({
    id: '123',
    username: 'niina',
    displayName: '管理者',
    role: 'admin',
    department: 'システム管理'
  });
});

// チャット関連API（ダミー）
app.get("/api/chats/:chatId/last-export", (req, res) => {
  console.log('Get last export request for chat:', req.params.chatId);
  res.json({ 
    lastExport: null,
    timestamp: new Date().toISOString()
  });
});

// その他のチャットAPI（ダミー）
app.get("/api/chats/:chatId/*", (req, res) => {
  console.log('Chat API request:', req.path);
  res.json({ 
    success: true,
    data: [],
    timestamp: new Date().toISOString()
  });
});

// サーバー起動
app.listen(port, () => {
  console.log(`🚀 Simple server listening on port ${port}`);
  console.log(`🔧 CORS origin:`, process.env.FRONTEND_URL);
}); 