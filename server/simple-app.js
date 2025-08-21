const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

// CORS設定
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// JSON解析設定
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ 
    message: 'Emergency Backend API is running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    port: port,
    version: '1.0.1'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 認証エンドポイント
app.get('/api/auth/me', (req, res) => {
  res.json({
    user: null,
    message: 'Authentication not implemented yet'
  });
});

app.post('/api/auth/login', (req, res) => {
  res.json({
    success: false,
    message: 'Login not implemented yet'
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Database URL configured: ${!!process.env.DATABASE_URL}`);
});
