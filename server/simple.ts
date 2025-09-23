import express from 'express';
import cors from 'cors';

const app = express();
const port = 3001;

// CORS設定
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:4173', // Vite preview port
  'http://localhost:5001', // Vite dev port
  'http://127.0.0.1:3000',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:5001',
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log('CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Origin',
      'Accept',
      'credentials',
      'cache-control',
    ],
    exposedHeaders: ['Set-Cookie'],
  })
);

// JSONパース
app.use(express.json());

// ヘルスチェック
app.get('/api/health', (_, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// テスト用ログインAPI
app.post('/api/auth/login', (req, res) => {
  console.log('Login request:', req.body);
  res.json({
    message: 'ログイン成功',
    user: { id: '123', name: 'テストユーザー' },
    timestamp: new Date().toISOString(),
  });
});

// ユーザー情報取得API
app.get('/api/auth/me', (req, res) => {
  res.json({
    id: '123',
    username: 'niina',
    displayName: '管理者',
    role: 'admin',
    department: 'システム管理',
  });
});

// チャット関連API（ダミー）
app.get('/api/chats/:chatId/last-export', (req, res) => {
  console.log('Get last export request for chat:', req.params.chatId);
  res.json({
    lastExport: null,
    timestamp: new Date().toISOString(),
  });
});

// その他のチャットAPI（ダミー）
app.get('/api/chats/:chatId/*', (req, res) => {
  console.log('Chat API request:', req.path);
  res.json({
    success: true,
    data: [],
    timestamp: new Date().toISOString(),
  });
});

// サーバー起動
app.listen(port, () => {
  console.log(`🚀 Simple server listening on port ${port}`);
  console.log(`🔧 CORS allowed origins:`, allowedOrigins);
});
