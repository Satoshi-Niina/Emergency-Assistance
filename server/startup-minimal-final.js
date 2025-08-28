// 最小限の起動スクリプト - ESM方式
console.log('🚀 Minimal startup script starting...');

import http from 'http';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OK');
});

const port = process.env.PORT || process.env.WEBSITES_PORT || 8080;

server.listen(port, () => {
  console.log(`✅ Server started on port ${port}`);
  console.log(`🎉 Application is ready!`);
});

server.on('error', (error) => {
  console.error('Server error:', error);
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close(() => process.exit(0));
});