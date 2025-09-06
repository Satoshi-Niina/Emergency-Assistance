const express = require('express');
const app = express();
const port = 3003;

app.get('/health', (req, res) => {
  console.log('Health check received');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Simple server working'
  });
});

const server = app.listen(port, 'localhost', () => {
  console.log(`✅ Simple server listening on http://localhost:${port}`);
  console.log(`🔍 Server address:`, server.address());
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

console.log('Server script loaded');
