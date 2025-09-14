const https = require('https');
const http = require('http');

async function fixUsers() {
  try {
    console.log('🔍 ユーザー権限を修正中...');
    
    // まず全ユーザーを確認
    console.log('📋 現在のユーザー一覧を取得中...');
    const listOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/user-management/all',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const listReq = http.request(listOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('現在のユーザー一覧:');
          if (result.success && result.data) {
            result.data.forEach(user => {
              console.log(`- ${user.username} (${user.display_name}) - ${user.role} - ${user.department}`);
            });
          }
          
          // niinaユーザーを修正
          console.log('\n🔧 niinaユーザーを修正中...');
          fixNiinaUser();
        } catch (error) {
          console.log('📄 レスポンス（テキスト）:', data);
        }
      });
    });
    
    listReq.on('error', (error) => {
      console.error('❌ リクエストエラー:', error.message);
    });
    
    listReq.end();
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

function fixNiinaUser() {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/user-management/fix-niina',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const req = http.request(options, (res) => {
    console.log(`ステータス: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('✅ niinaユーザー修正結果:', result);
      } catch (error) {
        console.log('📄 レスポンス（テキスト）:', data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ リクエストエラー:', error.message);
  });
  
  req.end();
}

// 少し待ってから実行
setTimeout(fixUsers, 3000);
