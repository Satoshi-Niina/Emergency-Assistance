// Simple Azure App Service entry point
console.log('🚀 Simple server starting...');

const http = require('http');
const port = process.env.PORT || 8000;

console.log(`Port configured: ${port}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`Working directory: ${process.cwd()}`);

// Create simple HTTP server first
const server = http.createServer((req, res) => {
  console.log(`📡 Request: ${req.method} ${req.url}`);
  
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }
  
  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'emergency-assistance-backend'
    }));
    return;
  }
  
  // Default response
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(port, '0.0.0.0', () => {
  console.log(`✅ Simple server running on http://0.0.0.0:${port}`);
  console.log(`🔍 Health endpoints:`);
  console.log(`  - GET /`);
  console.log(`  - GET /health`);
  console.log(`  - GET /api/health`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error.message);
  process.exit(1);
});

// Try to load the main application after basic server is running
setTimeout(() => {
  try {
    console.log('🔄 Attempting to load main application...');
    const fs = require('fs');
    const path = require('path');
    
    const distPath = path.join(__dirname, 'dist', 'index.js');
    if (fs.existsSync(distPath)) {
      console.log('✅ Loading main application from:', distPath);
      // Close simple server and start main app
      server.close(() => {
        require(distPath);
      });
    } else {
      console.log('⚠️ Main application not found, continuing with simple server');
      console.log('📁 Available files:');
      const files = fs.readdirSync(__dirname);
      files.forEach(file => {
        const stats = fs.statSync(path.join(__dirname, file));
        console.log(`  - ${file} ${stats.isDirectory() ? '(dir)' : '(file)'}`);
      });
    }
  } catch (error) {
    console.error('❌ Error loading main application:', error.message);
    console.log('⚠️ Continuing with simple server');
  }
}, 5000); // Wait 5 seconds before trying to load main app
