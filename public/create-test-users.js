// 権限テスト用ユーザー作成スクリプト
async function createTestUser(username, password, displayName, role, department) {
  try {
    const response = await fetch('http://localhost:3001/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        username,
        password,
        displayName,
        role,
        department
      })
    });

    const data = await response.json();
    console.log(`${username}:`, data);
    return data;
  } catch (error) {
    console.error(`${username} エラー:`, error);
    return { success: false, error: error.message };
  }
}

// システム管理者でログインしてからユーザー作成
async function loginAsAdmin() {
  const response = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      username: 'niina',
      password: 'G&896845'
    })
  });
  return response.json();
}

// メイン処理
async function main() {
  console.log('🔐 管理者でログイン中...');
  const loginResult = await loginAsAdmin();
  console.log('ログイン結果:', loginResult);

  if (loginResult.success) {
    console.log('👥 テスト用ユーザー作成開始...');
    
    // システム管理者
    await createTestUser(
      'sysadmin', 
      'Admin123!', 
      'システム管理者', 
      'system_admin', 
      'システム管理部'
    );
    
    // 運用管理者
    await createTestUser(
      'operator', 
      'Ope123!', 
      '運用管理者', 
      'operator', 
      '運用部'
    );
    
    // 一般ユーザー
    await createTestUser(
      'user1', 
      'User123!', 
      '一般ユーザー', 
      'user', 
      '現場作業部'
    );

    console.log('✅ ユーザー作成完了！');
  } else {
    console.error('❌ ログイン失敗:', loginResult);
  }
}

main().catch(console.error);
