#!/usr/bin/env node

/**
 * 本番環境APIテストスクリプト
 * 使用方法: node test-production-apis.js
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net';

// テストするAPIエンドポイント
const API_ENDPOINTS = [
  '/api/health/json',
  '/api/debug/routes',
  '/api/users',
  '/api/machines/machine-types',
  '/api/machines/all-machines',
  '/api/storage/list'
];

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function testEndpoint(endpoint) {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`\n🔍 Testing: ${url}`);
  
  try {
    const response = await makeRequest(url);
    const contentType = response.headers['content-type'] || '';
    const isJson = contentType.includes('application/json');
    
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Content-Type: ${contentType}`);
    console.log(`   Is JSON: ${isJson}`);
    
    if (isJson) {
      try {
        const jsonData = JSON.parse(response.data);
        console.log(`   Data: ${JSON.stringify(jsonData, null, 2).substring(0, 200)}...`);
      } catch (e) {
        console.log(`   Data (raw): ${response.data.substring(0, 200)}...`);
      }
    } else {
      console.log(`   Data: ${response.data.substring(0, 200)}...`);
    }
    
    return {
      endpoint,
      success: response.statusCode === 200 && isJson,
      statusCode: response.statusCode,
      contentType,
      isJson
    };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return {
      endpoint,
      success: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('🚀 本番環境APIテスト開始');
  console.log(`Base URL: ${BASE_URL}`);
  
  const results = [];
  
  for (const endpoint of API_ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    results.push(result);
  }
  
  console.log('\n📊 テスト結果サマリー:');
  console.log('='.repeat(50));
  
  let successCount = 0;
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.endpoint} - ${result.statusCode || 'ERROR'}`);
    if (result.success) successCount++;
  });
  
  console.log('='.repeat(50));
  console.log(`成功: ${successCount}/${results.length}`);
  
  if (successCount === results.length) {
    console.log('🎉 すべてのAPIテストが成功しました！');
  } else {
    console.log('⚠️  一部のAPIテストが失敗しました。');
  }
}

main().catch(console.error);
