import postgres from 'postgres';
import dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config();

// Azure PostgreSQL データベース接続文字列
const azureDbUrl = 'postgresql://postgres:YOUR_PASSWORD@emergencyassistance-db.postgres.database.azure.com:5432/postgres?sslmode=require';

async function testAzureConnection() {
  console.log('🔍 Azure PostgreSQL データベース接続テスト開始...');
  console.log('📍 エンドポイント: emergencyassistance-db.postgres.database.azure.com');
  
  let sql: postgres.Sql | null = null;
  
  try {
    // Azure PostgreSQL に接続
    sql = postgres(azureDbUrl, {
      ssl: { rejectUnauthorized: false },
      max: 1,
      idle_timeout: 20,
      connect_timeout: 30,
    });
    
    console.log('✅ 接続確立完了');
    
    // 接続テスト
    const result = await sql`SELECT NOW() as current_time, version() as db_version`;
    console.log('✅ クエリ実行成功:');
    console.log('   - 現在時刻:', result[0].current_time);
    console.log('   - データベースバージョン:', result[0].db_version);
    
    // テーブル一覧を取得
    const tables = await sql`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    console.log('📋 テーブル一覧:');
    if (tables.length === 0) {
      console.log('   - テーブルが見つかりません');
    } else {
      tables.forEach(table => {
        console.log(`   - ${table.table_name} (${table.table_type})`);
      });
    }
    
    console.log('🎉 Azure PostgreSQL データベース接続テスト完了！');
    
  } catch (error) {
    console.error('❌ 接続エラー:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.error('🔧 解決方法: ファイアウォール設定を確認してください');
      } else if (error.message.includes('authentication failed')) {
        console.error('🔧 解決方法: ユーザー名とパスワードを確認してください');
      } else if (error.message.includes('ENOTFOUND')) {
        console.error('🔧 解決方法: ホスト名を確認してください');
      }
    }
    
  } finally {
    if (sql) {
      await sql.end();
      console.log('🔌 接続を閉じました');
    }
  }
}

// スクリプト実行
testAzureConnection().catch(console.error);
