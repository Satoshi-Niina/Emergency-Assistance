const fs = require('fs');
const path = require('path');

// Build process helper
const distDir = path.join(process.cwd(), 'dist');
const sourceFile = path.join(distDir, 'index-minimal.js');
const targetFile = path.join(distDir, 'index.js');

console.log('🔧 Post-build processing...');

if (fs.existsSync(sourceFile)) {
  // Remove existing index.js if it exists
  if (fs.existsSync(targetFile)) {
    fs.unlinkSync(targetFile);
    console.log('✅ Removed existing index.js');
  }
  
  // Rename index-minimal.js to index.js
  fs.renameSync(sourceFile, targetFile);
  console.log('✅ Renamed index-minimal.js to index.js');
} else {
  console.log('⚠️ index-minimal.js not found in dist directory');
  process.exit(1);
}

console.log('✅ Build process completed successfully');
