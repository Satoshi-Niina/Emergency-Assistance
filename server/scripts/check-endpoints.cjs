const http = require('http');

const endpoints = [
  { method: 'GET', path: '/api/knowledge-base' },
  { method: 'GET', path: '/api/files' },
  { method: 'GET', path: '/api/fault-history' },
];

function callEndpoint(ep) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: ep.path,
      method: ep.method,
      headers: {
        'Accept': 'application/json',
        'Origin': 'http://localhost:5173'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({ ep, statusCode: res.statusCode, headers: res.headers, body });
      });
    });

    req.on('error', (e) => {
      resolve({ ep, error: e.message });
    });

    req.end();
  });
}

(async () => {
  for (const e of endpoints) {
    process.stdout.write(`→ calling ${e.method} ${e.path} ... `);
    const r = await callEndpoint(e);
    if (r.error) {
      console.log(`ERROR: ${r.error}`);
    } else {
      console.log(`status=${r.statusCode}`);
      try {
        if (r.body) {
          const parsed = JSON.parse(r.body);
          console.log(JSON.stringify(parsed, null, 2).slice(0, 2000));
        } else {
          console.log('(no body)');
        }
      } catch (err) {
        console.log('non-json body or parse error');
        if (r.body) console.log(r.body.slice(0, 2000));
        else console.log('(no body)');
      }
    }
    console.log('------------------------------------------------------------');
  }
  process.exit(0);
})();