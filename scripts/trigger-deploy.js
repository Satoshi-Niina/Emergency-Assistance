#!/usr/bin/env node

// デプロイトリガー用スクリプト
// 使用方法: node scripts/trigger-deploy.js

const fs = require('fs');
const path = require('path');

console.log('🚀 Triggering deployment...');

// trigger.txtを更新してGitHub Actionsをトリガー
const triggerFile = path.join(__dirname, '..', 'trigger.txt');
const timestamp = new Date().toISOString();
const content = `deploy-${timestamp}`;

fs.writeFileSync(triggerFile, content);

console.log(`✅ Trigger file updated: ${content}`);
console.log('📤 Please commit and push to trigger deployment:');
console.log('   git add trigger.txt');
console.log('   git commit -m "Trigger deployment"');
console.log('   git push origin backup');
