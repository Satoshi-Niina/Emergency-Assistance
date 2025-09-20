const express = require('express');
const cors = require('cors');

const app = express();

// CORS設定
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With']
}));

// ミドルウェア
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ヘルスチェック
app.get('/api/health/json', (req, res) => {
  res.json({
    ok: true,
    time: new Date().toISOString(),
    message: 'Server is running'
  });
});

// 認証API
app.get('/api/auth/me', (req, res) => {
  res.json({
    success: true,
    message: 'Auth API is working',
    timestamp: new Date().toISOString(),
    user: null
  });
});

// その他のAPI
app.get('/api/users', (req, res) => {
  res.json({
    success: true,
    message: 'Users API is working',
    users: []
  });
});

app.get('/api/machines/machine-types', (req, res) => {
  res.json({
    success: true,
    message: 'Machine Types API is working',
    machineTypes: []
  });
});

app.get('/api/machines/all-machines', (req, res) => {
  res.json({
    success: true,
    message: 'All Machines API is working',
    machines: []
  });
});

app.get('/api/storage/list', (req, res) => {
  res.json({
    success: true,
    message: 'Storage API is working',
    data: []
  });
});

// 404ハンドリング
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method
  });
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Simple server running on port ${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   - GET /api/health/json`);
  console.log(`   - GET /api/auth/me`);
  console.log(`   - GET /api/users`);
  console.log(`   - GET /api/machines/machine-types`);
  console.log(`   - GET /api/machines/all-machines`);
  console.log(`   - GET /api/storage/list`);
});

module.exports = app;
