const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

console.log('🚀 Emergency Backend API starting...');
console.log('📊 Environment variables:');
console.log('  - NODE_ENV:', process.env.NODE_ENV);
console.log('  - PORT:', port);
console.log('  - DATABASE_URL:', process.env.DATABASE_URL ? '[SET]' : '[NOT SET]');

// CORS設定
const corsOptions = {
  origin: [
    'https://witty-river-012f39e00.1.azurestaticapps.net',
    'https://salmon-desert-065ec5000.1.azurestaticapps.net',
    'http://localhost:5002',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept', 'Cookie']
};

app.use(cors(corsOptions));
app.use(express.json());

// ログミドルウェア
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  console.log('  Origin:', req.headers.origin);
  console.log('  Headers:', JSON.stringify(req.headers, null, 2).substring(0, 200));
  next();
});

// ルートエンドポイント
app.get('/', (req, res) => {
  res.json({ 
    message: 'Emergency Backend API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// ヘルスチェック
app.get('/api/health', (req, res) => {
  console.log('🏥 Health check requested');
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: process.env.DATABASE_URL ? 'configured' : 'not configured'
  });
});

// ログインエンドポイント（モックデータ）
app.post('/api/auth/login', (req, res) => {
  console.log('🔐 Login request received:', req.body);
  
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'ユーザー名とパスワードが必要です'
    });
  }
  
  // モック認証
  if (username === 'niina' && password === '0077') {
    console.log('✅ Login successful for user:', username);
    res.json({
      success: true,
      user: {
        id: 1,
        username: 'niina',
        displayName: 'Niina Satoshi',
        display_name: 'Niina Satoshi',
        role: 'admin',
        department: 'IT'
      }
    });
  } else {
    console.log('❌ Login failed for user:', username);
    res.status(401).json({
      success: false,
      error: 'ユーザー名またはパスワードが正しくありません'
    });
  }
});

// ユーザー情報取得エンドポイント
app.get('/api/auth/me', (req, res) => {
  console.log('👤 User info requested');
  
  // モックデータ（実際の実装ではセッションから取得）
  res.json({
    isAuthenticated: false,
    user: null
  });
});

// ログアウトエンドポイント
app.post('/api/auth/logout', (req, res) => {
  console.log('🚪 Logout requested');
  res.json({
    success: true,
    message: 'ログアウトしました'
  });
});

// エラーハンドラー
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message
  });
});

// 404ハンドラー
app.use('*', (req, res) => {
  console.log('🔍 404 Not Found:', req.method, req.originalUrl);
  res.status(404).json({
    success: false,
    error: 'Not Found',
    path: req.originalUrl,
    method: req.method
  });
});

app.listen(port, () => {
  console.log(`🌐 Emergency Backend API listening on port ${port}`);
  console.log(`📍 Server URL: http://localhost:${port}`);
  console.log('✅ Server started successfully');
});
