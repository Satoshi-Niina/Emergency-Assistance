const http = require('http');
const username = process.env.SEED_LOGIN_USERNAME || 'niina';
const password = process.env.SEED_NIINA_PASSWORD;

if (!password) {
  console.error('SEED_NIINA_PASSWORD is not set. Set it in environment to run this script.');
  process.exit(1);
}

const data = JSON.stringify({ username, password });

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
