// E2Eテスト: 認証フロー
// 使用方法: node test-auth-e2e.js

const API_BASE = process.env.API_BASE || 'https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net';

async function testAuthFlow() {
  console.log('🧪 E2E認証テスト開始');
  
  try {
    // 1. ログインテスト
    console.log('1️⃣ ログインテスト');
    const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'niina', password: '0077' })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginRes.status}`);
    }
    
    const loginData = await loginRes.json();
    console.log('✅ ログイン成功:', { success: loginData.success, hasToken: !!loginData.token });
    
    if (!loginData.token) {
      throw new Error('No token received');
    }
    
    // 2. /me テスト（Bearer認証）
    console.log('2️⃣ /me テスト（Bearer認証）');
    const meRes = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    
    if (!meRes.ok) {
      const errorData = await meRes.json();
      throw new Error(`/me failed: ${meRes.status} - ${JSON.stringify(errorData)}`);
    }
    
    const meData = await meRes.json();
    console.log('✅ /me 成功:', { authenticated: meData.authenticated, userId: meData.userId });
    
    // 3. ログアウトテスト
    console.log('3️⃣ ログアウトテスト');
    const logoutRes = await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    
    if (!logoutRes.ok) {
      throw new Error(`Logout failed: ${logoutRes.status}`);
    }
    
    console.log('✅ ログアウト成功');
    
    // 4. ログアウト後の/meテスト（401期待）
    console.log('4️⃣ ログアウト後の/meテスト（401期待）');
    const meAfterLogoutRes = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    
    if (meAfterLogoutRes.status === 401) {
      console.log('✅ 期待通り401（認証失敗）');
    } else {
      console.log('⚠️ 予期しないレスポンス:', meAfterLogoutRes.status);
    }
    
    console.log('🎉 E2E認証テスト完了');
    
  } catch (error) {
    console.error('❌ E2E認証テスト失敗:', error.message);
    process.exit(1);
  }
}

testAuthFlow();
