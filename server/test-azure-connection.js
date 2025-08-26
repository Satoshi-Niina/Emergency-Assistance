const { Client } = require('pg');

// Azure PostgreSQL 接続設定
const config = {
  host: 'emergencyassistance-db.postgres.database.azure.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'YOUR_ACTUAL_PASSWORD', // 実際のパスワードに置き換えてください
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 20000
};

async function testConnection() {
  console.log('🔍 Azure PostgreSQL データベース接続テスト開始...');
  console.log('📍 エンドポイント:', config.host);
  
  const client = new Client(config);
  
  try {
    console.log('📡 接続確立中...');
    await client.connect();
    console.log('✅ 接続確立完了');
    
    // 接続テスト
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    console.log('✅ クエリ実行成功:');
    console.log('   - 現在時刻:', result.rows[0].current_time);
    console.log('   - データベースバージョン:', result.rows[0].db_version);
    
    // テーブル一覧を取得
    const tables = await client.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 テーブル一覧:');
    if (tables.rows.length === 0) {
      console.log('   - テーブルが見つかりません');
    } else {
      tables.rows.forEach(table => {
        console.log(`   - ${table.table_name} (${table.table_type})`);
      });
    }
    
    console.log('🎉 Azure PostgreSQL データベース接続テスト完了！');
    
  } catch (error) {
    console.error('❌ 接続エラー:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('🔧 解決方法: ファイアウォール設定を確認してください');
    } else if (error.message.includes('authentication failed')) {
      console.error('🔧 解決方法: ユーザー名とパスワードを確認してください');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('🔧 解決方法: ホスト名を確認してください');
    } else if (error.message.includes('timeout')) {
      console.error('🔧 解決方法: ネットワーク接続とファイアウォール設定を確認してください');
    }
    
  } finally {
    await client.end();
    console.log('🔌 接続を閉じました');
  }
}

// スクリプト実行
testConnection().catch(console.error);
