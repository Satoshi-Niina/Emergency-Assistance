// Simple startup file for Azure App Service
// This file helps Azure App Service detect and start the Node.js application

const path = require('path');
const fs = require('fs');

// Check if built files exist
const distPath = path.join(__dirname, 'dist', 'index.js');

console.log('🔍 Azure App Service Startup Check');
console.log('  - Current working directory:', process.cwd());
console.log('  - Script directory:', __dirname);
console.log('  - Looking for:', distPath);
console.log('  - Exists:', fs.existsSync(distPath));

if (fs.existsSync(distPath)) {
  console.log('✅ Starting application from built files');
  require('./dist/index.js');
} else {
  console.log('❌ Built files not found');
  console.log('📁 Directory contents:');
  try {
    const files = fs.readdirSync(__dirname);
    files.forEach(file => {
      const stats = fs.statSync(path.join(__dirname, file));
      console.log(`  - ${file} ${stats.isDirectory() ? '(dir)' : '(file)'}`);
    });
  } catch (error) {
    console.error('Error reading directory:', error.message);
  }
  
  console.log('⚠️  Attempting fallback startup...');
  process.exit(1);
}
