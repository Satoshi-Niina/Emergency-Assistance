#!/usr/bin/env node

/**
 * Azure本番環境 包括的診断・修正スクリプト
 * niinaユーザー権限、データベース接続、Blob Storage接続の問題を解決
 */

const { Client } = require('pg');
const { BlobServiceClient } = require('@azure/storage-blob');

console.log('🚀 Azure本番環境 包括的診断・修正スクリプト');
console.log('===========================================');

// 環境変数の確認
function checkEnvironmentVariables() {
  console.log('\n📊 環境変数確認');
  console.log('================');
  
  const requiredVars = [
    'DATABASE_URL',
    'AZURE_STORAGE_CONNECTION_STRING',
    'AZURE_STORAGE_ACCOUNT_NAME',
    'AZURE_STORAGE_ACCOUNT_KEY'
  ];
  
  const envStatus = {};
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    envStatus[varName] = {
      exists: !!value,
      length: value ? value.length : 0,
      preview: value ? `${value.substring(0, 20)}...` : 'undefined'
    };
    console.log(`${varName}: ${envStatus[varName].exists ? '✅' : '❌'} (${envStatus[varName].preview})`);
  }
  
  return envStatus;
}

// データベース接続テスト
async function testDatabaseConnection() {
  console.log('\n🔗 データベース接続テスト');
  console.log('========================');
  
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL環境変数が見つかりません');
    return false;
  }
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    query_timeout: 5000
  });
  
  try {
    console.log('🔗 データベースに接続中...');
    await client.connect();
    console.log('✅ データベース接続成功');
    
    // 基本クエリテスト
    const testResult = await client.query('SELECT NOW() as current_time, version()');
    console.log('📊 サーバー時刻:', testResult.rows[0].current_time);
    console.log('📊 PostgreSQLバージョン:', testResult.rows[0].version.substring(0, 50) + '...');
    
    return true;
  } catch (error) {
    console.log('❌ データベース接続失敗:', error.message);
    return false;
  } finally {
    try {
      await client.end();
    } catch (e) {
      // 接続終了のエラーは無視
    }
  }
}

// niinaユーザー権限診断・修正
async function fixNiinaUserPermissions() {
  console.log('\n👤 niinaユーザー権限診断・修正');
  console.log('==============================');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    
    // 1. 現在のniinaユーザー確認
    const checkResult = await client.query(
      'SELECT id, username, role, display_name, department FROM users WHERE username = $1',
      ['niina']
    );
    
    console.log('📊 現在のniinaユーザー状況:');
    if (checkResult.rows.length === 0) {
      console.log('❌ niinaユーザーが存在しません');
      
      // niinaユーザーを作成
      console.log('🔧 niinaユーザーを作成中...');
      await client.query(`
        INSERT INTO users (
          id, username, password, role, display_name, department, created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          $1, $2, $3, $4, $5, NOW(), NOW()
        )
      `, [
        'niina',
        '$2b$10$JkW0ciQRzRVsha5SiU5rz.bsEhffHP2AShZQjrnfMgxCTf5ZM70KS',
        'system_admin',
        'Niina Administrator',
        'システム管理'
      ]);
      console.log('✅ niinaユーザーを作成しました');
    } else {
      console.table(checkResult.rows);
      
      const user = checkResult.rows[0];
      if (user.role !== 'system_admin') {
        console.log('🔧 権限をsystem_adminに修正中...');
        await client.query(`
          UPDATE users 
          SET role = $1, display_name = $2, department = $3, updated_at = NOW()
          WHERE username = $4
        `, ['system_admin', 'Niina Administrator', 'システム管理', 'niina']);
        console.log('✅ 権限を修正しました');
      } else {
        console.log('✅ 権限は既に正しく設定されています');
      }
    }
    
    // 2. 最終確認
    const finalResult = await client.query(
      'SELECT username, role, display_name, department FROM users WHERE username = $1',
      ['niina']
    );
    console.log('📊 修正後のniinaユーザー:');
    console.table(finalResult.rows);
    
    // 3. 全システム管理者一覧
    const adminResult = await client.query(
      'SELECT username, role, display_name FROM users WHERE role = $1 ORDER BY username',
      ['system_admin']
    );
    console.log('👑 全システム管理者一覧:');
    console.table(adminResult.rows);
    
    return true;
  } catch (error) {
    console.log('❌ niinaユーザー権限修正失敗:', error.message);
    return false;
  } finally {
    try {
      await client.end();
    } catch (e) {
      // 無視
    }
  }
}

// 機種データテスト
async function testMachineData() {
  console.log('\n🔧 機種データ取得テスト');
  console.log('======================');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    
    // machine_typesテーブルの確認
    const machineTypesResult = await client.query('SELECT * FROM machine_types ORDER BY machine_type_name');
    console.log('📊 機種データ:', machineTypesResult.rows.length, '件');
    if (machineTypesResult.rows.length > 0) {
      console.table(machineTypesResult.rows.slice(0, 5)); // 最初の5件を表示
    }
    
    // machinesテーブルの確認
    const machinesResult = await client.query(`
      SELECT m.machine_number, mt.machine_type_name 
      FROM machines m 
      JOIN machine_types mt ON m.machine_type_id = mt.id 
      ORDER BY mt.machine_type_name, m.machine_number 
      LIMIT 10
    `);
    console.log('📊 機械データ:', machinesResult.rows.length, '件');
    if (machinesResult.rows.length > 0) {
      console.table(machinesResult.rows);
    }
    
    return true;
  } catch (error) {
    console.log('❌ 機種データ取得失敗:', error.message);
    return false;
  } finally {
    try {
      await client.end();
    } catch (e) {
      // 無視
    }
  }
}

// Blob Storage接続テスト
async function testBlobStorageConnection() {
  console.log('\n☁️ Blob Storage接続テスト');
  console.log('==========================');
  
  if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
    console.log('❌ AZURE_STORAGE_CONNECTION_STRING環境変数が見つかりません');
    return false;
  }
  
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING
    );
    
    console.log('🔗 Blob Storageに接続中...');
    
    // コンテナ一覧を取得
    const containers = [];
    for await (const container of blobServiceClient.listContainers()) {
      containers.push(container.name);
    }
    
    console.log('✅ Blob Storage接続成功');
    console.log('📊 利用可能なコンテナ:', containers);
    
    // knowledgeコンテナの存在確認
    if (containers.includes('knowledge')) {
      console.log('✅ knowledgeコンテナが見つかりました');
      
      const containerClient = blobServiceClient.getContainerClient('knowledge');
      const blobs = [];
      for await (const blob of containerClient.listBlobsFlat({ prefix: 'troubleshooting/' })) {
        blobs.push(blob.name);
        if (blobs.length >= 5) break; // 最初の5件のみ
      }
      console.log('📁 troubleshootingフォルダのファイル例:', blobs);
    } else {
      console.log('❌ knowledgeコンテナが見つかりません');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Blob Storage接続失敗:', error.message);
    return false;
  }
}

// メイン実行関数
async function runComprehensiveDiagnostics() {
  try {
    console.log(`🚀 診断開始: ${new Date().toISOString()}`);
    
    // 1. 環境変数確認
    const envStatus = checkEnvironmentVariables();
    
    // 2. データベース接続テスト
    const dbConnected = await testDatabaseConnection();
    
    if (dbConnected) {
      // 3. niinaユーザー権限修正
      const userFixed = await fixNiinaUserPermissions();
      
      // 4. 機種データテスト
      const machineDataOk = await testMachineData();
    }
    
    // 5. Blob Storage接続テスト
    const blobConnected = await testBlobStorageConnection();
    
    // 6. 結果サマリー
    console.log('\n📋 診断結果サマリー');
    console.log('=================');
    console.log(`データベース接続: ${dbConnected ? '✅' : '❌'}`);
    console.log(`niinaユーザー権限: ${dbConnected ? '✅' : '❌'}`);
    console.log(`Blob Storage接続: ${blobConnected ? '✅' : '❌'}`);
    
    if (dbConnected && blobConnected) {
      console.log('\n🎉 すべての診断が成功しました！');
      console.log('💡 フロントエンドでログアウト→再ログインしてください');
      console.log('💡 ブラウザのハードリロード（Ctrl+Shift+R）を実行してください');
    } else {
      console.log('\n⚠️ 一部の診断で問題が検出されました');
      console.log('💡 Azure環境変数の設定を確認してください');
    }
    
  } catch (error) {
    console.error('💥 診断実行中にエラーが発生しました:', error);
  }
}

// スクリプト実行
if (require.main === module) {
  runComprehensiveDiagnostics().catch(error => {
    console.error('💥 実行エラー:', error);
    process.exit(1);
  });
}

module.exports = { runComprehensiveDiagnostics };
