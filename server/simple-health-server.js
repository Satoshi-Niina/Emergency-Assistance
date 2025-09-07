const http = require('http');

const port = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  console.log(`Request: ${req.method} ${req.url}`);
  
  // 基本的なルーティング
  if (req.url === '/health' || req.url === '/' || req.url === '/api/health' || req.url === '/healthz') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
      status: 'ok',
      time: new Date().toISOString(),
      service: 'emergency-assistance-backend'
    }));
  } else {
    res.writeHead(404, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({error: 'Not found'}));
  }
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`✅ Simple HTTP server listening on http://0.0.0.0:${port}`);
});

process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close();
  process.exit(0);
});
