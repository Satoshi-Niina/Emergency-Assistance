// Emergency Assistance Backend for Azure Web App
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

const app = express();
const PORT = process.env.PORT || 8000;

// Database connection setup
let dbClient = null;

async function initializeDatabase() {
  try {
    if (process.env.DATABASE_URL) {
      dbClient = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      
      await dbClient.connect();
      console.log('✅ Database connected successfully');
      
      // Test database connection with users table
      const result = await dbClient.query('SELECT COUNT(*) FROM users');
      console.log(`📊 Users in database: ${result.rows[0].count}`);
    } else {
      console.warn('⚠️ DATABASE_URL not configured, using fallback authentication');
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.warn('⚠️ Falling back to hardcoded authentication');
  }
}

// Initialize database connection
initializeDatabase();

// Enable CORS for Azure Static Web Apps
app.use(cors({
  origin: [
    'https://witty-river-012f39e00.1.azurestaticapps.net',
    'http://localhost:5173',
    'http://localhost:5002'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('Health check requested');
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    database: dbClient ? 'connected' : 'not connected'
  });
});

// Database-enabled login endpoint
app.post('/api/auth/login', async (req, res) => {
  // Set request timeout to 30 seconds
  req.setTimeout(30000);
  
  try {
    console.log('Login request received:', req.body);
    
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    let user = null;
    let isValidLogin = false;

    // Try database authentication first with timeout
    if (dbClient) {
      try {
        console.log('🔍 Checking database for user:', username);
        
        // Add query timeout to prevent hanging
        const query = 'SELECT id, username, password_hash, role, display_name, department FROM users WHERE username = $1';
        const queryPromise = dbClient.query(query, [username]);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Database query timeout')), 5000); // 5 second timeout
        });
        
        const result = await Promise.race([queryPromise, timeoutPromise]);
        
        if (result.rows.length > 0) {
          const dbUser = result.rows[0];
          console.log('👤 User found in database:', {
            id: dbUser.id,
            username: dbUser.username,
            role: dbUser.role,
            hasPasswordHash: !!dbUser.password_hash
          });
          
          // Verify password
          if (dbUser.password_hash) {
            isValidLogin = await bcrypt.compare(password, dbUser.password_hash);
          }
          
          if (isValidLogin) {
            user = {
              id: dbUser.id,
              username: dbUser.username,
              role: dbUser.role || 'employee',
              displayName: dbUser.display_name || dbUser.username,
              department: dbUser.department
            };
          }
        } else {
          console.log('👤 User not found in database:', username);
        }
      } catch (dbError) {
        console.error('❌ Database query error:', dbError.message);
        console.log('🔄 Will fallback to hardcoded authentication');
      }
    }

    // Fallback to hardcoded authentication if database failed or user not found
    if (!user) {
      console.log('🔄 Falling back to hardcoded authentication');
      
      // Test users
      const testUsers = [
        { username: 'niina', password: 'Test896845', displayName: 'Satoshi Niina', role: 'admin' },
        { username: 'niina', password: 'G&896845', displayName: 'Satoshi Niina', role: 'admin' },
        { username: 'admin', password: 'admin123', displayName: 'Administrator', role: 'admin' },
        { username: 'test', password: 'test123', displayName: 'Test User', role: 'employee' }
      ];
      
      const matchedUser = testUsers.find(u => u.username === username && u.password === password);
      
      if (matchedUser) {
        isValidLogin = true;
        user = {
          id: 1,
          username: matchedUser.username,
          role: matchedUser.role,
          displayName: matchedUser.displayName,
          department: 'IT'
        };
      }
    }

    if (isValidLogin && user) {
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username,
          role: user.role
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '24h' }
      );
      
      console.log('✅ Login successful for user:', user.username);
      
      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          displayName: user.displayName,
          department: user.department
        }
      });
    } else {
      console.log('❌ Login failed for user:', username);
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Machine types endpoint
app.get('/api/machines/machine-types', (req, res) => {
  console.log('Machine types request received');
  
  // Sample machine types data
  const machineTypes = [
    {
      id: '001',
      name: '新幹線E5系',
      category: '新幹線',
      description: '東北新幹線の主力車両',
      specifications: {
        maxSpeed: '320km/h',
        capacity: '731席',
        powerSystem: '交流25kV'
      }
    },
    {
      id: '002', 
      name: '新幹線N700S',
      category: '新幹線',
      description: '東海道新幹線の最新車両',
      specifications: {
        maxSpeed: '320km/h',
        capacity: '1323席',
        powerSystem: '交流25kV'
      }
    },
    {
      id: '003',
      name: 'E233系',
      category: '通勤電車',
      description: '首都圏の主力通勤電車',
      specifications: {
        maxSpeed: '120km/h',
        capacity: '1447名',
        powerSystem: '直流1500V'
      }
    },
    {
      id: '004',
      name: 'EF66形',
      category: '機関車',
      description: '貨物列車用電気機関車',
      specifications: {
        maxSpeed: '110km/h',
        power: '3900kW',
        powerSystem: '直流1500V'
      }
    },
    {
      id: '005',
      name: 'キハE200系',
      category: 'ディーゼル車',
      description: 'ハイブリッド気動車',
      specifications: {
        maxSpeed: '100km/h',
        capacity: '134名',
        fuelType: 'ディーゼル+蓄電池'
      }
    }
  ];
  
  res.json({
    success: true,
    data: machineTypes,
    count: machineTypes.length
  });
});

// Knowledge base endpoint for troubleshooting
app.get('/api/knowledge/troubleshooting/:machineId', (req, res) => {
  console.log('Troubleshooting knowledge request for machine:', req.params.machineId);
  
  const troubleshootingData = {
    machineId: req.params.machineId,
    commonIssues: [
      {
        issue: 'モーター異音',
        severity: 'medium',
        solution: 'モーターベアリングの点検・交換を実施してください。',
        steps: [
          '電源を切断する',
          'モーターカバーを取り外す',
          'ベアリングの状態を確認する',
          '必要に応じてベアリング交換',
          '動作確認を行う'
        ]
      },
      {
        issue: 'ブレーキ性能低下',
        severity: 'high',
        solution: 'ブレーキパッドとディスクの点検・交換が必要です。',
        steps: [
          '車両を安全な場所に停車',
          'ブレーキパッドの厚さを測定',
          'ディスクの摩耗状況を確認',
          'パッド交換またはディスク研磨',
          '制動試験の実施'
        ]
      }
    ]
  };
  
  res.json({
    success: true,
    data: troubleshootingData
  });
});

// Chat endpoint for AI assistance
app.post('/api/chat', async (req, res) => {
  console.log('Chat request received:', req.body);
  
  const { message, machineType, context } = req.body;
  
  // Simulate AI response based on machine type and message
  const aiResponse = {
    response: `${machineType}に関するお問い合わせですね。「${message}」について回答いたします。\n\n現在の症状から判断すると、以下の対応をお勧めします：\n\n1. 基本点検の実施\n2. 関連部品の確認\n3. 必要に応じた部品交換\n\n詳細な手順については、保守マニュアルをご確認ください。`,
    confidence: 0.85,
    relatedTopics: ['定期点検', '部品交換', '安全確認'],
    timestamp: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: aiResponse
  });
});

// Users API endpoint
app.get('/api/users', (req, res) => {
  console.log('Users API request received');
  
  // Sample users data
  const users = [
    {
      id: 1,
      username: 'niina',
      displayName: 'Satoshi Niina',
      role: 'admin',
      department: 'IT',
      email: 'niina@example.com',
      createdAt: '2025-01-01T00:00:00Z',
      lastLogin: '2025-08-21T06:00:00Z',
      status: 'active'
    },
    {
      id: 2,
      username: 'admin',
      displayName: 'Administrator',
      role: 'admin',
      department: 'IT',
      email: 'admin@example.com',
      createdAt: '2025-01-01T00:00:00Z',
      lastLogin: '2025-08-20T18:00:00Z',
      status: 'active'
    },
    {
      id: 3,
      username: 'maintenance1',
      displayName: '保守担当者1',
      role: 'employee',
      department: '保守部',
      email: 'maintenance1@example.com',
      createdAt: '2025-01-15T00:00:00Z',
      lastLogin: '2025-08-20T16:00:00Z',
      status: 'active'
    },
    {
      id: 4,
      username: 'operator1',
      displayName: '運転士1',
      role: 'employee',
      department: '運転部',
      email: 'operator1@example.com',
      createdAt: '2025-01-20T00:00:00Z',
      lastLogin: '2025-08-20T14:00:00Z',
      status: 'active'
    }
  ];
  
  res.json({
    success: true,
    data: users,
    count: users.length
  });
});

// Knowledge base API endpoint
app.get('/api/knowledge-base', (req, res) => {
  console.log('Knowledge base API request received');
  
  // Sample knowledge base data
  const knowledgeData = [
    {
      id: 1,
      title: '新幹線E5系メンテナンスガイド',
      category: 'maintenance',
      content: '新幹線E5系の定期メンテナンス手順について説明します。',
      tags: ['新幹線', 'E5系', 'メンテナンス'],
      created: '2025-01-01T00:00:00Z',
      updated: '2025-08-01T00:00:00Z'
    },
    {
      id: 2,
      title: 'ブレーキシステム診断',
      category: 'troubleshooting',
      content: 'ブレーキシステムの異常診断と対処法について説明します。',
      tags: ['ブレーキ', '診断', 'トラブルシューティング'],
      created: '2025-01-15T00:00:00Z',
      updated: '2025-07-15T00:00:00Z'
    },
    {
      id: 3,
      title: '電気系統トラブル対応',
      category: 'emergency',
      content: '電気系統のトラブル発生時の緊急対応手順について説明します。',
      tags: ['電気系統', '緊急対応', 'トラブル'],
      created: '2025-02-01T00:00:00Z',
      updated: '2025-07-30T00:00:00Z'
    }
  ];
  
  res.json({
    success: true,
    data: knowledgeData,
    count: knowledgeData.length
  });
});

// Database migration endpoint
app.post('/api/admin/migrate', async (req, res) => {
  try {
    console.log('🔧 Database migration requested');
    
    if (!dbClient) {
      return res.status(500).json({
        success: false,
        message: 'Database not connected'
      });
    }

    // Create extension
    await dbClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    console.log('✅ UUID extension created');

    // Create users table
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        display_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'employee',
        department TEXT,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await dbClient.query(createUsersTable);
    console.log('✅ Users table created');

    // Create indexes
    await dbClient.query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);');
    await dbClient.query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);');
    await dbClient.query('CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);');
    console.log('✅ Indexes created');

    // Insert sample users
    const insertUsers = `
      INSERT INTO users (username, password, display_name, role, department) VALUES
        ('admin', '$2b$10$rQZ8K9vX2mN3pL4qR5sT6uV7wX8yZ9aA0bB1cC2dE3fF4gG5hH6iI7jJ8kK9lL0mM1nN2oO3pP4qQ5rR6sS7tT8uU9vV0wW1xX2yY3zZ', '管理者', 'admin', 'システム管理部'),
        ('employee1', '$2b$10$rQZ8K9vX2mN3pL4qR5sT6uV7wX8yZ9aA0bB1cC2dE3fF4gG5hH6iI7jJ8kK9lL0mM1nN2oO3pP4qQ5rR6sS7tT8uU9vV0wW1xX2yY3zZ', '従業員1', 'employee', '保守部'),
        ('test', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'テストユーザー', 'employee', 'テスト部'),
        ('demo', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'デモユーザー', 'employee', 'デモ部'),
        ('niina', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '新名聡', 'admin', 'システム管理部')
      ON CONFLICT (username) DO NOTHING;
    `;
    await dbClient.query(insertUsers);
    console.log('✅ Sample users inserted');

    res.json({
      success: true,
      message: 'Database migration completed successfully'
    });

  } catch (error) {
    console.error('❌ Migration error:', error);
    res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: error.message
    });
  }
});

// User info endpoint
app.get('/api/auth/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
    
    console.log('User info request for:', decoded.username);
    
    res.json({
      success: true,
      user: {
        id: decoded.userId,
        username: decoded.username,
        role: decoded.role,
        name: 'Satoshi Niina'
      }
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// Catch all for API routes
app.use('/api/*', (req, res) => {
  console.log('API endpoint not found:', req.originalUrl);
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV !== 'production' ? err.message : undefined
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Emergency Assistance Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Login endpoint: http://localhost:${PORT}/api/auth/login`);
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`JWT Secret configured: ${process.env.JWT_SECRET ? 'Yes' : 'No (using default)'}`);
});
