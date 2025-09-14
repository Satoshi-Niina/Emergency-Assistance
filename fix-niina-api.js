const https = require('https');
const http = require('http');

async function fixNiinaUser() {
  try {
    console.log('🔍 niinaユーザーを修正中...');
    
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
      console.log(`ヘッダー:`, res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('✅ レスポンス:', result);
        } catch (error) {
          console.log('📄 レスポンス（テキスト）:', data);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ リクエストエラー:', error.message);
    });
    
    req.end();
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

fixNiinaUser();
