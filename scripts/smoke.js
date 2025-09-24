#!/usr/bin/env node

// CI互換スモークテスト - 最初に成功したパスで即 exit 0
// GitHub Actions のスモークテスト用

const BASE_URL = process.env.BASE_URL || 'https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net';

async function smokeTest() {
  console.log('🚀 Starting smoke test...');
  console.log(`📡 Target: ${BASE_URL}`);

  try {
    // 1) ヘルスチェック
    console.log('1️⃣ Testing /api/health...');
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      if (healthData.ok === true) {
        console.log('✅ /api/health: OK');
        console.log('🎉 Smoke test passed - exiting with success');
        process.exit(0);
      }
    }
    
    console.log(`❌ /api/health failed: ${healthResponse.status}`);
    
    // 2) Handshake チェック
    console.log('2️⃣ Testing /api/auth/handshake...');
    const handshakeResponse = await fetch(`${BASE_URL}/api/auth/handshake`);
    
    if (handshakeResponse.ok) {
      const handshakeData = await handshakeResponse.json();
      if (handshakeData.ok === true) {
        console.log('✅ /api/auth/handshake: OK');
        console.log('🎉 Smoke test passed - exiting with success');
        process.exit(0);
      }
    }
    
    console.log(`❌ /api/auth/handshake failed: ${handshakeResponse.status}`);
    
    // 3) ルートヘルスチェック
    console.log('3️⃣ Testing /health...');
    const rootHealthResponse = await fetch(`${BASE_URL}/health`);
    
    if (rootHealthResponse.ok) {
      const rootHealthData = await rootHealthResponse.json();
      if (rootHealthData.ok === true) {
        console.log('✅ /health: OK');
        console.log('🎉 Smoke test passed - exiting with success');
        process.exit(0);
      }
    }
    
    console.log(`❌ /health failed: ${rootHealthResponse.status}`);
    
    // 4) ルートヘルスチェック（healthz）
    console.log('4️⃣ Testing /healthz...');
    const healthzResponse = await fetch(`${BASE_URL}/healthz`);
    
    if (healthzResponse.ok) {
      const healthzData = await healthzResponse.json();
      if (healthzData.ok === true) {
        console.log('✅ /healthz: OK');
        console.log('🎉 Smoke test passed - exiting with success');
        process.exit(0);
      }
    }
    
    console.log(`❌ /healthz failed: ${healthzResponse.status}`);
    
    // すべて失敗
    console.log('❌ All smoke tests failed');
    process.exit(1);
    
  } catch (error) {
    console.error('❌ Smoke test error:', error.message);
    process.exit(1);
  }
}

smokeTest();