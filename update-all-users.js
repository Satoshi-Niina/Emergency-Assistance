const http = require('http');

async function updateAllUsers() {
  try {
    console.log('🔍 全ユーザーの権限を更新中...');
    
    // takabeni1を運用管理者に設定
    console.log('🔧 takabeni1を運用管理者に設定中...');
    await updateUser('takabeni1', {
      role: 'admin',
      department: 'システム管理部',
      description: '運用管理者'
    });
    
    // takabeni2を一般ユーザーに設定
    console.log('🔧 takabeni2を一般ユーザーに設定中...');
    await updateUser('takabeni2', {
      role: 'employee',
      department: '保守部',
      description: '一般ユーザー'
    });
    
    // niinaを一般ユーザーに設定
    console.log('🔧 niinaを一般ユーザーに設定中...');
    await updateUser('niina', {
      role: 'employee',
      department: 'システム管理部',
      description: '一般ユーザー'
    });
    
    // 最終確認
    console.log('\n📋 最終確認中...');
    await listAllUsers();
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

function updateUser(username, updates) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api/user-management/${username}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.success) {
            console.log(`✅ ${username} 更新完了:`, result.data);
          } else {
            console.log(`❌ ${username} 更新失敗:`, result.error);
          }
          resolve(result);
        } catch (error) {
          console.log(`📄 ${username} レスポンス（テキスト）:`, data);
          resolve({ success: false, error: 'Parse error' });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`❌ ${username} リクエストエラー:`, error.message);
      reject(error);
    });
    
    req.write(JSON.stringify(updates));
    req.end();
  });
}

function listAllUsers() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/user-management/all',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('\n📋 更新後の全ユーザー一覧:');
          if (result.success && result.data) {
            result.data.forEach(user => {
              console.log(`- ${user.username} (${user.display_name}) - ${user.role} - ${user.department}`);
            });
          }
          resolve(result);
        } catch (error) {
          console.log('📄 レスポンス（テキスト）:', data);
          resolve({ success: false, error: 'Parse error' });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ リクエストエラー:', error.message);
      reject(error);
    });
    
    req.end();
  });
}

// 少し待ってから実行
setTimeout(updateAllUsers, 2000);
