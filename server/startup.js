// Azure App Service startup script
// This ensures proper environment setup for Azure deployment

console.log('🚀 Azure App Service startup script');
console.log('Current working directory:', process.cwd());
console.log('Node version:', process.version);
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Port:', process.env.PORT || '8000');

// Set default port for Azure
if (!process.env.PORT) {
    process.env.PORT = '8000';
    console.log('Set default PORT to 8000');
}

// Set production environment if not set
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
    console.log('Set NODE_ENV to production');
}

// Check if dist/index.js exists
const fs = require('fs');
const path = require('path');
const distPath = path.join(__dirname, 'dist', 'index.js');

console.log('Looking for main app file:', distPath);
console.log('File exists:', fs.existsSync(distPath));

if (!fs.existsSync(distPath)) {
    console.error('❌ Main application file not found:', distPath);
    console.log('Directory contents:');
    try {
        const files = fs.readdirSync(__dirname);
        files.forEach(file => {
            const stats = fs.statSync(path.join(__dirname, file));
            console.log(`  - ${file} ${stats.isDirectory() ? '(dir)' : '(file)'}`);
        });
    } catch (error) {
        console.error('Error reading directory:', error.message);
    }
    
    // Try alternative paths
    const alternatives = [
        path.join(__dirname, 'index.js'),
        path.join(__dirname, 'server.js'),
        path.join(__dirname, 'app.js')
    ];
    
    for (const alt of alternatives) {
        if (fs.existsSync(alt)) {
            console.log('Found alternative:', alt);
            require(alt);
            return;
        }
    }
    
    console.error('❌ No valid entry point found');
    process.exit(1);
}

console.log('✅ Starting main application');
try {
    require(distPath);
} catch (error) {
    console.error('❌ Error starting application:', error.message);
    console.error(error.stack);
    process.exit(1);
}
