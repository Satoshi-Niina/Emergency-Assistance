const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

console.log('噫 Emergency Backend API starting...');
console.log('投 Environment variables:');
console.log('  - NODE_ENV:', process.env.NODE_ENV);
console.log('  - PORT:', port);
console.log('  - DATABASE_URL:', process.env.DATABASE_URL ? '[SET]' : '[NOT SET]');

// CORS險ｭ螳・
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

// 繝ｭ繧ｰ繝溘ラ繝ｫ繧ｦ繧ｧ繧｢
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  console.log('  Origin:', req.headers.origin);
  console.log('  Headers:', JSON.stringify(req.headers, null, 2).substring(0, 200));
  next();
});

// 繝ｫ繝ｼ繝医お繝ｳ繝峨・繧､繝ｳ繝・
app.get('/', (req, res) => {
  res.json({ 
    message: 'Emergency Backend API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// 繝倥Ν繧ｹ繝√ぉ繝・け
app.get('/api/health', (req, res) => {
  console.log('唱 Health check requested');
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: process.env.DATABASE_URL ? 'configured' : 'not configured'
  });
});

// 繝ｭ繧ｰ繧､繝ｳ繧ｨ繝ｳ繝峨・繧､繝ｳ繝茨ｼ医Δ繝・け繝・・繧ｿ・・
app.post('/api/auth/login', (req, res) => {
  console.log('柏 Login request received:', req.body);
  
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: '繝ｦ繝ｼ繧ｶ繝ｼ蜷阪→繝代せ繝ｯ繝ｼ繝峨′蠢・ｦ√〒縺・
    });
  }
  
  // 繝｢繝・け隱崎ｨｼ
  if (username === 'niina' && password === '0077') {
    console.log('笨・Login successful for user:', username);
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
    console.log('笶・Login failed for user:', username);
    res.status(401).json({
      success: false,
      error: '繝ｦ繝ｼ繧ｶ繝ｼ蜷阪∪縺溘・繝代せ繝ｯ繝ｼ繝峨′豁｣縺励￥縺ゅｊ縺ｾ縺帙ｓ'
    });
  }
});

// 繝ｦ繝ｼ繧ｶ繝ｼ諠・ｱ蜿門ｾ励お繝ｳ繝峨・繧､繝ｳ繝・
app.get('/api/auth/me', (req, res) => {
  console.log('側 User info requested');
  
  // 繝｢繝・け繝・・繧ｿ・亥ｮ滄圀縺ｮ螳溯｣・〒縺ｯ繧ｻ繝・す繝ｧ繝ｳ縺九ｉ蜿門ｾ暦ｼ・
  res.json({
    isAuthenticated: false,
    user: null
  });
});

// 繝ｭ繧ｰ繧｢繧ｦ繝医お繝ｳ繝峨・繧､繝ｳ繝・
app.post('/api/auth/logout', (req, res) => {
  console.log('坎 Logout requested');
  res.json({
    success: true,
    message: '繝ｭ繧ｰ繧｢繧ｦ繝医＠縺ｾ縺励◆'
  });
});

// 繧ｨ繝ｩ繝ｼ繝上Φ繝峨Λ繝ｼ
app.use((err, req, res, next) => {
  console.error('笶・Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message
  });
});

// 404繝上Φ繝峨Λ繝ｼ
app.use('*', (req, res) => {
  console.log('剥 404 Not Found:', req.method, req.originalUrl);
  res.status(404).json({
    success: false,
    error: 'Not Found',
    path: req.originalUrl,
    method: req.method
  });
});

app.listen(port, () => {
  console.log(`倹 Emergency Backend API listening on port ${port}`);
  console.log(`桃 Server URL: http://localhost:${port}`);
  console.log('笨・Server started successfully');
});
