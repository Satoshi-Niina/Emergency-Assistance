#!/usr/bin/env node

/**
 * Azure環境での環境変数とAPI接続確認スクリプト
 */

const https = require('https');
const http = require('http');

console.log('🔍 Azure環境確認スクリプト開始...\n');

// 環境変数確認
console.log('📋 環境変数確認:');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('- PORT:', process.env.PORT || 'NOT SET');
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('- SESSION_SECRET:', process.env.SESSION_SECRET ? 'SET' : 'NOT SET');
console.log('- FRONTEND_URL:', process.env.FRONTEND_URL || 'NOT SET');
console.log('- AZURE_STORAGE_CONNECTION_STRING:', process.env.AZURE_STORAGE_CONNECTION_STRING ? 'SET' : 'NOT SET');
console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET');

// API接続テスト
const testEndpoints = [
  {
    name: 'Backend Health Check',
    url: 'https://emergency-backend-api.azurewebsites.net/api/health',
    method: 'GET'
  },
  {
    name: 'Frontend App',
    url: 'https://emergency-assistance-app.azurestaticapps.net',
    method: 'GET'
  }
];

async function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const url = new URL(endpoint.url);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: endpoint.method,
      timeout: 10000,
      headers: {
        'User-Agent': 'Azure-Environment-Check/1.0'
      }
    };

    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          name: endpoint.name,
          url: endpoint.url,
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          data: data.substring(0, 200) + (data.length > 200 ? '...' : '')
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        name: endpoint.name,
        url: endpoint.url,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name: endpoint.name,
        url: endpoint.url,
        error: 'Request timeout'
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('\n🌐 API接続テスト:');
  
  for (const endpoint of testEndpoints) {
    console.log(`\n📡 テスト: ${endpoint.name}`);
    console.log(`   URL: ${endpoint.url}`);
    
    const result = await testEndpoint(endpoint);
    
    if (result.error) {
      console.log(`   ❌ エラー: ${result.error}`);
    } else {
      console.log(`   ✅ ステータス: ${result.status} ${result.statusText}`);
      console.log(`   📋 レスポンスヘッダー:`, result.headers);
      if (result.data) {
        console.log(`   📄 レスポンスデータ: ${result.data}`);
      }
    }
  }
}

// 実行
runTests().then(() => {
  console.log('\n✅ 環境確認完了');
}).catch((error) => {
  console.error('\n❌ エラー:', error);
  process.exit(1);
}); 