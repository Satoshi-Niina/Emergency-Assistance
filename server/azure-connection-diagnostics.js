const { Client } = require('pg');
const dns = require('dns').promises;
const net = require('net');

console.log('🔍 Azure PostgreSQL 接続問題詳細診断');
console.log('=====================================');

async function runDiagnostics() {
  // 1. DNS解決テスト
  console.log('\n1️⃣ DNS解決テスト');
  try {
    const addresses = await dns.resolve4('emergencyassistance-db.postgres.database.azure.com');
    console.log('✅ DNS解決成功:', addresses);
  } catch (error) {
    console.log('❌ DNS解決失敗:', error.message);
  }

  // 2. ポートスキャンテスト
  console.log('\n2️⃣ ポートスキャンテスト');
  const testPort = (host, port) => {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = 5000;
      
      socket.setTimeout(timeout);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve({ success: true, message: '接続成功' });
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve({ success: false, message: 'タイムアウト' });
      });
      
      socket.on('error', (error) => {
        resolve({ success: false, message: error.message });
      });
      
      socket.connect(port, host);
    });
  };

  const portTest = await testPort('emergencyassistance-db.postgres.database.azure.com', 5432);
  console.log(`ポート5432: ${portTest.success ? '✅' : '❌'} ${portTest.message}`);

  // 3. 接続文字列テスト
  console.log('\n3️⃣ 接続文字列テスト');
  const connectionStrings = [
    {
      name: 'SSL必須（推奨）',
      config: {
        host: 'emergencyassistance-db.postgres.database.azure.com',
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: 'TEST_PASSWORD',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000
      }
    },
    {
      name: 'SSL無効（テスト用）',
      config: {
        host: 'emergencyassistance-db.postgres.database.azure.com',
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: 'TEST_PASSWORD',
        connectionTimeoutMillis: 10000
      }
    }
  ];

  for (const conn of connectionStrings) {
    console.log(`\nテスト: ${conn.name}`);
    const client = new Client(conn.config);
    
    try {
      await client.connect();
      console.log('✅ 接続成功');
      await client.end();
    } catch (error) {
      console.log('❌ 接続失敗:', error.message);
      
      // エラーの詳細分析
      if (error.message.includes('ETIMEDOUT')) {
        console.log('   → ファイアウォールまたはネットワーク設定の問題');
      } else if (error.message.includes('authentication failed')) {
        console.log('   → 認証情報の問題（接続自体は成功）');
      } else if (error.message.includes('ENOTFOUND')) {
        console.log('   → DNS解決の問題');
      } else if (error.message.includes('ECONNREFUSED')) {
        console.log('   → サービスが起動していない、またはポートが閉じている');
      }
    }
  }

  // 4. 推奨される解決策
  console.log('\n4️⃣ 推奨される解決策');
  console.log('📋 現在のクライアントIP: 153.171.234.141');
  console.log('🔧 Azure Portalでの設定手順:');
  console.log('   1. Azure Portal > PostgreSQL サーバー > emergencyassistance-db');
  console.log('   2. 左メニュー > 接続セキュリティ');
  console.log('   3. ファイアウォール規則 > + クライアントIPの追加');
  console.log('   4. 規則名: EmergencyAssistance-Client');
  console.log('   5. 開始IP: 153.171.234.141');
  console.log('   6. 終了IP: 153.171.234.141');
  console.log('   7. 保存');
  
  console.log('\n⏰ 設定変更後、反映まで数分かかる場合があります');
  console.log('🔄 設定後、再度接続テストを実行してください');
}

runDiagnostics().catch(console.error);
