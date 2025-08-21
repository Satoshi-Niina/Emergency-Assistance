// Emergency Assistance Backend for Azure Web App
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 8000;

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
    environment: process.env.NODE_ENV || 'production'
  });
});

// Simple login endpoint for testing
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login request received:', req.body);
    
    const { username, password } = req.body;
    
    // Simple hardcoded authentication for testing
    if (username === 'niina' && password === 'G&896845') {
      const token = jwt.sign(
        { 
          userId: 1, 
          username: username,
          role: 'admin'
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '24h' }
      );
      
      console.log('Login successful for user:', username);
      
      res.json({
        success: true,
        token,
        user: {
          id: 1,
          username: username,
          role: 'admin',
          name: 'Satoshi Niina'
        }
      });
    } else {
      console.log('Login failed for user:', username);
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
