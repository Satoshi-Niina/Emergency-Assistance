const http = require('http');

async function callAPI(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            success: result.success,
            data: result.data,
            message: result.message || result.error
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            success: false,
            message: 'Parse error',
            rawData: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({
        error: error.message
      });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function quickFix() {
  console.log('🔧 クイック修正開始...');
  
  try {
    // 1. 現在のユーザーを確認
    console.log('📋 現在のユーザーを確認中...');
    const checkResult = await callAPI('/api/debug-auth/users');
    
    if (checkResult.success) {
      console.log('現在のユーザー:');
      checkResult.data.forEach(user => {
        if (['niina', 'takabeni1', 'takabeni2'].includes(user.username)) {
          console.log(`- ${user.username}: ${user.password} (${user.displayName}, ${user.role})`);
        }
      });
    }
    
    // 2. ユーザーを修正
    console.log('\n🔄 ユーザーを修正中...');
    const fixResult = await callAPI('/api/direct-fix/fix-all-users-direct', 'POST');
    
    if (fixResult.success) {
      console.log('✅ ユーザー修正成功！');
      console.log('修正されたユーザー:');
      fixResult.data.forEach(user => {
        console.log(`- ${user.username}: ${user.password} (${user.displayName}, ${user.role})`);
      });
    } else {
      console.log('❌ ユーザー修正失敗:', fixResult.message);
    }
    
    // 3. ログインテスト
    console.log('\n🔐 ログインテスト中...');
    const users = [
      { username: 'niina', password: 'G&896845' },
      { username: 'takabeni1', password: 'Takabeni&1' },
      { username: 'takabeni2', password: 'Takaben&2' }
    ];
    
    for (const user of users) {
      try {
        const loginResult = await callAPI('/api/auth/login', 'POST', user);
        console.log(`${user.username}: ${loginResult.success ? '✅ 成功' : '❌ 失敗'}`);
      } catch (error) {
        console.log(`${user.username}: ❌ エラー`);
      }
    }
    
  } catch (error) {
    console.log('❌ エラー:', error.error || error.message);
  }
}

// 少し待ってから実行
setTimeout(quickFix, 5000);
