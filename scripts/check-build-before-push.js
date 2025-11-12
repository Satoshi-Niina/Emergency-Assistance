#!/usr/bin/env node

/**
 * ビルドチェックスクリプト - プッシュ前の必須確認
 * git push前に自動実行される
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CLIENT_DIST_PATH = path.join(__dirname, '../client/dist');
const REQUIRED_FILES = ['index.html', 'main.js', 'style.css', 'runtime-config.js'];

console.log('🔍 Pre-push build verification...');

// 1. client/distフォルダの存在確認
if (!fs.existsSync(CLIENT_DIST_PATH)) {
    console.error('❌ ERROR: client/dist folder not found!');
    console.error('📋 Run: npm run build (or cd client && npm run build)');
    process.exit(1);
}

// 2. 必須ファイルの存在確認
const missingFiles = REQUIRED_FILES.filter(file =>
    !fs.existsSync(path.join(CLIENT_DIST_PATH, file))
);

if (missingFiles.length > 0) {
    console.error(`❌ ERROR: Missing required build files: ${missingFiles.join(', ')}`);
    console.error('📋 Run: npm run build (or cd client && npm run build)');
    process.exit(1);
}

// 3. ビルドファイルの新しさ確認
const packageJsonPath = path.join(__dirname, '../client/package.json');
const distStats = fs.statSync(path.join(CLIENT_DIST_PATH, 'index.html'));
const packageStats = fs.statSync(packageJsonPath);

if (packageStats.mtime > distStats.mtime) {
    console.warn('⚠️  WARNING: package.json is newer than build files');
    console.warn('💡 Consider running: npm run build');
}

// 4. ファイル数確認（Azure制限対策）
const distFiles = fs.readdirSync(CLIENT_DIST_PATH);
if (distFiles.length > 10) {
    console.warn(`⚠️  WARNING: ${distFiles.length} files in dist (recommended: <10 for Azure)`);
}

console.log(`✅ Build verification passed! ${distFiles.length} files ready for deployment:`);
distFiles.forEach(file => console.log(`   📄 ${file}`));
