#!/usr/bin/env node

// Production server startup script for Azure App Service
// This script ensures proper configuration for production deployment

console.log('🚀 Starting Emergency Assistance Production Server...');

// セーフモード判定
const isSafeMode = process.env.SAFE_MODE === 'true';
const bypassJwt = process.env.BYPASS_JWT === 'true';

console.log('🛡️ Safe Mode Configuration:', {
  SAFE_MODE: isSafeMode,
  BYPASS_JWT: bypassJwt,
  timestamp: new Date().toISOString(),
});

// 0. Run startup validation（セーフモード時は警告のみ）
try {
  require('./startup-validation.js');
} catch (error) {
  if (isSafeMode) {
    console.warn('⚠️ Startup validation failed (Safe Mode):', error.message);
    console.warn('🛡️ Safe mode: Continuing with warnings');
  } else {
    console.error('❌ Startup validation failed:', error.message);
    process.exit(1);
  }
}

// 1. Environment validation（セーフモード時は警告のみ）
const requiredEnvVars = ['JWT_SECRET', 'SESSION_SECRET'];
const optionalEnvVars = ['DATABASE_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

console.log('🔧 Environment validation:', {
  required: requiredEnvVars.map(v => ({
    [v]: process.env[v] ? '[SET]' : '[NOT SET]',
  })),
  optional: optionalEnvVars.map(v => ({
    [v]: process.env[v] ? '[SET]' : '[NOT SET]',
  })),
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  SAFE_MODE: isSafeMode,
});

if (missingVars.length > 0) {
  if (isSafeMode) {
    console.warn(
      '⚠️ Missing required environment variables (Safe Mode):',
      missingVars
    );
    console.warn('🛡️ Safe mode: Continuing with warnings');
  } else {
    console.error('❌ Missing required environment variables:', missingVars);
    console.error(
      '🔧 Please configure these variables in Azure App Service settings'
    );
    console.error('📝 Required: JWT_SECRET, SESSION_SECRET');
    console.error('📝 Optional: DATABASE_URL (for database features)');
    process.exit(1);
  }
}

// 2. Set production defaults
process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || 8080;

// 3. Trust proxy for Azure App Service
process.env.TRUST_PROXY = '1';

console.log('✅ Environment validation passed');
console.log('📊 Production configuration:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  TRUST_PROXY: process.env.TRUST_PROXY,
  SAFE_MODE: isSafeMode,
  BYPASS_JWT: bypassJwt,
  JWT_SECRET: process.env.JWT_SECRET ? '[SET]' : '[NOT SET]',
  SESSION_SECRET: process.env.SESSION_SECRET ? '[SET]' : '[NOT SET]',
  DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
});

// 4. Start the application（絶対に起動させる）
try {
  const app = require('./app.js').default;
  const PORT = Number(process.env.PORT) || 8080;

  // Trust proxy for Azure App Service
  app.set('trust proxy', 1);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Production server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🏓 Ping endpoint: http://localhost:${PORT}/api/ping`);
    console.log(
      `🔐 Auth endpoint: http://localhost:${PORT}/api/auth/handshake`
    );
    console.log(`🔧 Trust proxy: ${app.get('trust proxy')}`);
    console.log(`🌐 Node version: ${process.version}`);
    console.log(`📁 Working directory: ${process.cwd()}`);
    console.log(`⏰ Start time: ${new Date().toISOString()}`);
    console.log(`🛡️ Safe Mode: ${isSafeMode}`);
    console.log(`🔓 BYPASS_JWT: ${bypassJwt}`);
  });
} catch (error) {
  console.error('❌ Failed to start production server:', error);
  console.error('❌ Error details:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    code: error.code,
    errno: error.errno,
    syscall: error.syscall,
    address: error.address,
    port: error.port,
  });
  console.error('❌ Environment at failure:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    PWD: process.cwd(),
    NODE_VERSION: process.version,
    PLATFORM: process.platform,
    ARCH: process.arch,
    SAFE_MODE: isSafeMode,
    BYPASS_JWT: bypassJwt,
  });

  // セーフモード時でも起動に失敗した場合は終了
  console.error(
    '❌ Critical failure: Unable to start server even in safe mode'
  );
  process.exit(1);
}
