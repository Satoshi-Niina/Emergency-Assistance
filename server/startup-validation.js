#!/usr/bin/env node

// Startup validation script for production deployment
// This script validates the environment and dependencies before starting the server

console.log('🔍 Starting production validation...');

// セーフモード判定
const isSafeMode = process.env.SAFE_MODE === 'true';
const bypassJwt = process.env.BYPASS_JWT === 'true';

console.log('🛡️ Safe Mode Configuration:', {
  SAFE_MODE: isSafeMode,
  BYPASS_JWT: bypassJwt,
  timestamp: new Date().toISOString(),
});

// 1. Node.js version check
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
if (majorVersion < 18) {
  console.error('❌ Node.js version check failed');
  console.error(`   Required: Node.js 18+`);
  console.error(`   Current: ${nodeVersion}`);
  process.exit(1);
}
console.log(`✅ Node.js version: ${nodeVersion}`);

// 2. Environment variables validation（セーフモード時は警告のみ）
const requiredEnvVars = ['JWT_SECRET', 'SESSION_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  if (isSafeMode) {
    console.warn('⚠️ Environment variables validation (Safe Mode):');
    console.warn(`   Missing: ${missingVars.join(', ')}`);
    console.warn('   Safe mode: Continuing with warnings');
  } else {
    console.error('❌ Environment variables validation failed');
    console.error(`   Missing: ${missingVars.join(', ')}`);
    console.error('   Please configure these in Azure App Service settings');
    process.exit(1);
  }
} else {
  console.log('✅ Environment variables: All required variables are set');
}

// 3. JWT_SECRET strength check（セーフモード時はスキップ）
if (!isSafeMode && process.env.JWT_SECRET) {
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret.length < 32) {
    console.error('❌ JWT_SECRET strength check failed');
    console.error(`   Required: 32+ characters`);
    console.error(`   Current: ${jwtSecret.length} characters`);
    process.exit(1);
  }
  console.log('✅ JWT_SECRET strength: Sufficient length');
} else if (isSafeMode) {
  console.log('🛡️ JWT_SECRET strength check: Skipped (Safe Mode)');
}

// 4. SESSION_SECRET strength check（セーフモード時はスキップ）
if (!isSafeMode && process.env.SESSION_SECRET) {
  const sessionSecret = process.env.SESSION_SECRET;
  if (sessionSecret.length < 32) {
    console.error('❌ SESSION_SECRET strength check failed');
    console.error(`   Required: 32+ characters`);
    console.error(`   Current: ${sessionSecret.length} characters`);
    process.exit(1);
  }
  console.log('✅ SESSION_SECRET strength: Sufficient length');
} else if (isSafeMode) {
  console.log('🛡️ SESSION_SECRET strength check: Skipped (Safe Mode)');
}

// 5. Port availability check
const port = process.env.PORT || 8080;
if (isNaN(port) || port < 1 || port > 65535) {
  console.error('❌ Port validation failed');
  console.error(`   Invalid port: ${port}`);
  process.exit(1);
}
console.log(`✅ Port validation: ${port}`);

// 6. Working directory check
const cwd = process.cwd();
if (!cwd || cwd.length === 0) {
  console.error('❌ Working directory check failed');
  console.error('   Unable to determine working directory');
  process.exit(1);
}
console.log(`✅ Working directory: ${cwd}`);

// 7. Package.json check
try {
  const packageJson = require('../package.json');
  if (!packageJson.name || !packageJson.version) {
    throw new Error('Invalid package.json');
  }
  console.log(
    `✅ Package validation: ${packageJson.name} v${packageJson.version}`
  );
} catch (error) {
  console.error('❌ Package.json validation failed');
  console.error(`   Error: ${error.message}`);
  process.exit(1);
}

console.log('🎉 All validation checks passed!');
console.log('📊 Validation summary:', {
  nodeVersion,
  environment: process.env.NODE_ENV || 'development',
  port,
  workingDirectory: cwd,
  safeMode: isSafeMode,
  bypassJwt: bypassJwt,
  timestamp: new Date().toISOString(),
});
