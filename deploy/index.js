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

    // Try database authentication first
    if (dbClient) {
      try {
        console.log('🔍 Checking database for user:', username);
        const query = 'SELECT id, username, password_hash, role, display_name, department FROM users WHERE username = $1';
        const result = await dbClient.query(query, [username]);
        
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
        console.error('❌ Database query error:', dbError);
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
