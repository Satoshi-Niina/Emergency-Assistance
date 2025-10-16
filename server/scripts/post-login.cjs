const http = require('http');
const data = JSON.stringify({ username: 'niina', password: 'G&896845' });

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
    'Origin': 'http://localhost:5173'
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('statusCode:', res.statusCode);
    console.log('headers:', res.headers);
    console.log('body:', body);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('req error:', e.message);
  process.exit(1);
});

req.write(data);
req.end();
