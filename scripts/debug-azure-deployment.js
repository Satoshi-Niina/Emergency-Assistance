#!/usr/bin/env node

/**
 * Azureデプロイメントのデバッグスクリプト
 * フロントエンドとバックエンドの接続状況を確認
 */

const https = require('https');
const http = require('http');

// 設定
const config = {
  frontendUrl: 'https://emergency-assistance-app.azurestaticapps.net',
  backendUrl: 'https://emergency-backend-api.azurewebsites.net',
  testEndpoints: [
    '/api/health',
    '/api/auth/login'
  ]
};

// HTTPリクエスト関数
function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Azure-Debug-Script/1.0'
      }
    };

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    }

    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// CORSプリフライトテスト
async function testCorsPreflight(url) {
  try {
    const response = await makeRequest(url, 'OPTIONS');
    console.log(`✅ CORSプリフライト成功: ${url}`);
    console.log(`   ステータス: ${response.statusCode}`);
    console.log(`   CORSヘッダー:`, {
      'Access-Control-Allow-Origin': response.headers['access-control-allow-origin'],
      'Access-Control-Allow-Methods': response.headers['access-control-allow-methods'],
      'Access-Control-Allow-Headers': response.headers['access-control-allow-headers']
    });
    return true;
  } catch (error) {
    console.log(`❌ CORSプリフライト失敗: ${url}`);
    console.log(`   エラー: ${error.message}`);
    return false;
  }
}

// エンドポイントテスト
async function testEndpoint(baseUrl, endpoint) {
  const url = `${baseUrl}${endpoint}`;
  try {
    console.log(`\n🔍 テスト中: ${url}`);
    const response = await makeRequest(url);
    console.log(`✅ 成功: ${endpoint}`);
    console.log(`   ステータス: ${response.statusCode}`);
    console.log(`   レスポンス: ${response.body.substring(0, 200)}...`);
    return true;
  } catch (error) {
    console.log(`❌ 失敗: ${endpoint}`);
    console.log(`   エラー: ${error.message}`);
    return false;
  }
}

// メイン実行関数
async function main() {
  console.log('🚀 Azureデプロイメントデバッグ開始');
  console.log('=' .repeat(50));
  
  console.log(`📡 フロントエンド: ${config.frontendUrl}`);
  console.log(`🔧 バックエンド: ${config.backendUrl}`);
  console.log('');

  // バックエンドのヘルスチェック
  console.log('🔍 バックエンドヘルスチェック...');
  await testEndpoint(config.backendUrl, '/api/health');

  // CORSプリフライトテスト
  console.log('\n🔍 CORSプリフライトテスト...');
  await testCorsPreflight(`${config.backendUrl}/api/auth/login`);

  // 認証エンドポイントテスト
  console.log('\n🔍 認証エンドポイントテスト...');
  await testEndpoint(config.backendUrl, '/api/auth/login');

  // フロントエンドアクセステスト
  console.log('\n🔍 フロントエンドアクセステスト...');
  try {
    const response = await makeRequest(config.frontendUrl);
    console.log(`✅ フロントエンドアクセス成功`);
    console.log(`   ステータス: ${response.statusCode}`);
  } catch (error) {
    console.log(`❌ フロントエンドアクセス失敗: ${error.message}`);
  }

  console.log('\n' + '=' .repeat(50));
  console.log('🏁 デバッグ完了');
}

// スクリプト実行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { makeRequest, testEndpoint, testCorsPreflight }; 