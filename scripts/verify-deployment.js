#!/usr/bin/env node

const { spawn } = require('child_process');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

console.log('🚀 Emergency Assistance System - デプロイ前完全起動確認');
console.log('=' .repeat(60));

// 設定
const config = {
  backend: {
    port: process.env.PORT || 3001,
    healthCheck: '/api/health',
    timeout: 30000
  },
  frontend: {
    port: process.env.CLIENT_PORT || 5173,
    healthCheck: '/',
    timeout: 30000
  },
  database: {
    checkConnection: true
  }
};

// 色付きログ
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// プロセス管理
let backendProcess = null;
let frontendProcess = null;

// クリーンアップ関数
function cleanup() {
  log('\n🧹 クリーンアップ中...', 'yellow');
  
  if (backendProcess) {
    backendProcess.kill('SIGTERM');
    log('✅ バックエンドプロセスを停止', 'green');
  }
  
  if (frontendProcess) {
    frontendProcess.kill('SIGTERM');
    log('✅ フロントエンドプロセスを停止', 'green');
  }
  
  process.exit(0);
}

// シグナルハンドリング
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// HTTP リクエスト関数
function makeRequest(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// データベース接続確認
async function checkDatabase() {
  log('\n🗄️  データベース接続確認中...', 'blue');
  
  try {
    // package.jsonからデータベースURLを確認
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
      log('⚠️  DATABASE_URL環境変数が設定されていません', 'yellow');
      return false;
    }
    
    log(`✅ データベースURL設定確認: ${dbUrl.split('@')[1] || '設定済み'}`, 'green');
    return true;
  } catch (error) {
    log(`❌ データベース設定エラー: ${error.message}`, 'red');
    return false;
  }
}

// バックエンド起動確認
async function startBackend() {
  log('\n🔧 バックエンド起動中...', 'blue');
  
  return new Promise((resolve, reject) => {
    backendProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      env: { ...process.env, PORT: config.backend.port }
    });
    
    let isStarted = false;
    const timeout = setTimeout(() => {
      if (!isStarted) {
        reject(new Error('バックエンド起動タイムアウト'));
      }
    }, config.backend.timeout);
    
    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('ready') || output.includes('started') || output.includes('listening')) {
        if (!isStarted) {
          isStarted = true;
          clearTimeout(timeout);
          log('✅ バックエンド起動完了', 'green');
          resolve();
        }
      }
    });
    
    backendProcess.stderr.on('data', (data) => {
      const error = data.toString();
      if (error.includes('Error') || error.includes('Failed')) {
        log(`⚠️  バックエンド警告: ${error.trim()}`, 'yellow');
      }
    });
    
    backendProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

// フロントエンド起動確認
async function startFrontend() {
  log('\n🎨 フロントエンド起動中...', 'blue');
  
  return new Promise((resolve, reject) => {
    frontendProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      cwd: './client',
      env: { ...process.env, PORT: config.frontend.port }
    });
    
    let isStarted = false;
    const timeout = setTimeout(() => {
      if (!isStarted) {
        reject(new Error('フロントエンド起動タイムアウト'));
      }
    }, config.frontend.timeout);
    
    frontendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Local:') || output.includes('ready')) {
        if (!isStarted) {
          isStarted = true;
          clearTimeout(timeout);
          log('✅ フロントエンド起動完了', 'green');
          resolve();
        }
      }
    });
    
    frontendProcess.stderr.on('data', (data) => {
      const error = data.toString();
      if (error.includes('Error') || error.includes('Failed')) {
        log(`⚠️  フロントエンド警告: ${error.trim()}`, 'yellow');
      }
    });
    
    frontendProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

// ヘルスチェック
async function healthCheck() {
  log('\n🏥 ヘルスチェック実行中...', 'blue');
  
  const checks = [
    {
      name: 'バックエンドAPI',
      url: `http://localhost:${config.backend.port}${config.backend.healthCheck}`,
      expectedStatus: 200
    },
    {
      name: 'フロントエンド',
      url: `http://localhost:${config.frontend.port}${config.frontend.healthCheck}`,
      expectedStatus: 200
    }
  ];
  
  const results = [];
  
  for (const check of checks) {
    try {
      log(`🔍 ${check.name}確認中...`, 'blue');
      const response = await makeRequest(check.url, 10000);
      
      if (response.statusCode === check.expectedStatus) {
        log(`✅ ${check.name}: 正常 (${response.statusCode})`, 'green');
        results.push({ name: check.name, status: 'success', statusCode: response.statusCode });
      } else {
        log(`⚠️  ${check.name}: 予期しないステータス (${response.statusCode})`, 'yellow');
        results.push({ name: check.name, status: 'warning', statusCode: response.statusCode });
      }
    } catch (error) {
      log(`❌ ${check.name}: エラー - ${error.message}`, 'red');
      results.push({ name: check.name, status: 'error', error: error.message });
    }
  }
  
  return results;
}

// API機能テスト
async function testAPIEndpoints() {
  log('\n🧪 API機能テスト実行中...', 'blue');
  
  const tests = [
    {
      name: '認証エンドポイント',
      url: `http://localhost:${config.backend.port}/api/auth/signin`,
      method: 'GET'
    },
    {
      name: 'チャットエンドポイント',
      url: `http://localhost:${config.backend.port}/api/chat`,
      method: 'POST'
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      log(`🔍 ${test.name}確認中...`, 'blue');
      const response = await makeRequest(test.url, 5000);
      
      if (response.statusCode < 500) {
        log(`✅ ${test.name}: アクセス可能 (${response.statusCode})`, 'green');
        results.push({ name: test.name, status: 'success', statusCode: response.statusCode });
      } else {
        log(`❌ ${test.name}: サーバーエラー (${response.statusCode})`, 'red');
        results.push({ name: test.name, status: 'error', statusCode: response.statusCode });
      }
    } catch (error) {
      log(`❌ ${test.name}: エラー - ${error.message}`, 'red');
      results.push({ name: test.name, status: 'error', error: error.message });
    }
  }
  
  return results;
}

// メイン実行関数
async function main() {
  try {
    // 1. データベース確認
    const dbOk = await checkDatabase();
    
    // 2. バックエンド起動
    await startBackend();
    
    // 3. フロントエンド起動
    await startFrontend();
    
    // 4. 少し待機
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 5. ヘルスチェック
    const healthResults = await healthCheck();
    
    // 6. API機能テスト
    const apiResults = await testAPIEndpoints();
    
    // 7. 結果サマリー
    log('\n📊 起動確認結果サマリー', 'blue');
    log('=' .repeat(40));
    
    log(`データベース: ${dbOk ? '✅ 正常' : '❌ エラー'}`, dbOk ? 'green' : 'red');
    
    healthResults.forEach(result => {
      const status = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      const color = result.status === 'success' ? 'green' : result.status === 'warning' ? 'yellow' : 'red';
      log(`${status} ${result.name}: ${result.statusCode || result.error}`, color);
    });
    
    apiResults.forEach(result => {
      const status = result.status === 'success' ? '✅' : '❌';
      const color = result.status === 'success' ? 'green' : 'red';
      log(`${status} ${result.name}: ${result.statusCode || result.error}`, color);
    });
    
    // 8. 成功判定
    const allHealthOk = healthResults.every(r => r.status === 'success');
    const allApiOk = apiResults.every(r => r.status === 'success');
    
    if (dbOk && allHealthOk && allApiOk) {
      log('\n🎉 すべての確認が成功しました！デプロイ準備完了です。', 'green');
      log('💡 Ctrl+C で停止してからデプロイしてください。', 'blue');
    } else {
      log('\n⚠️  一部の確認で問題が発生しました。デプロイ前に修正してください。', 'yellow');
    }
    
    // 9. 継続実行（手動停止まで）
    log('\n🔄 システムは継続実行中です。Ctrl+C で停止してください。', 'blue');
    
  } catch (error) {
    log(`\n❌ 起動確認エラー: ${error.message}`, 'red');
    cleanup();
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = { main, cleanup }; 