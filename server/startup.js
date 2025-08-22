// Azure App Service startup script
const path = require('path');
const { spawn } = require('child_process');

console.log('Starting Emergency Assistance Server...');
console.log('Current directory:', process.cwd());
console.log('Files in current directory:', require('fs').readdirSync('.'));

// Start the application
const app = spawn('node', ['dist/app.js'], {
  stdio: 'inherit',
  env: process.env
});

app.on('error', (err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});

app.on('close', (code) => {
  console.log(`Application exited with code ${code}`);
  process.exit(code);
});
