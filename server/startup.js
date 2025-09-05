// Azure App Service startup script
// This ensures proper environment setup for Azure deployment

console.log('🚀 Azure App Service startup script');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Port:', process.env.PORT || '8000');

// Set default port for Azure
if (!process.env.PORT) {
    process.env.PORT = '8000';
}

// Set production environment if not set
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
}

// Start the main application
require('./dist/index.js');
