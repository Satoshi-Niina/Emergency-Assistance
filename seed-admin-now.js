// Seed admin user via API call
const https = require('https');

const apiUrl = 'https://emergency-assistantapp.azurewebsites.net/api/_diag/seed-admin';

console.log('Sending seed admin request...');

https.get(apiUrl, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
