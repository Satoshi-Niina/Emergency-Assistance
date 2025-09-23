// デバッグ用起動スクリプト
const fs = require('fs');

console.log('🔍 Debug startup script started');
console.log('🔧 Environment variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('WEBSITE_SITE_NAME:', process.env.WEBSITE_SITE_NAME);
console.log(
  'WEBSITE_NODE_DEFAULT_VERSION:',
  process.env.WEBSITE_NODE_DEFAULT_VERSION
);

console.log('📁 Current directory:', process.cwd());
console.log('📁 Files in current directory:');
try {
  const files = fs.readdirSync('.');
  console.log(files);
} catch (error) {
  console.error('Error reading directory:', error);
}

console.log('🚀 Starting simple server...');
try {
  require('./simple-server.js');
} catch (error) {
  console.error('❌ Error starting server:', error);
  process.exit(1);
}
