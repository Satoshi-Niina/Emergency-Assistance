const { Pool } = require('pg');

// 環境変数を設定
process.env.DATABASE_URL = "postgresql://satoshi_niina:SecurePass2025ABC@emergencyassistance-db.postgres.database.azure.com:5432/emergency_assistance?sslmode=require";
process.env.POSTGRES_CONNECTION_STRING = "postgresql://satoshi_niina:SecurePass2025ABC@emergencyassistance-db.postgres.database.azure.com:5432/emergency_assistance?sslmode=require";

console.log('🔍 接続文字列の確認:');
console.log('接続文字列:', process.env.DATABASE_URL);

console.log('🔍 環境変数確認:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '設定済み' : '未設定');
console.log('POSTGRES_CONNECTION_STRING:', process.env.POSTGRES_CONNECTION_STRING ? '設定済み' : '未設定');

// データベース接続設定
const dbConfig = {
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

console.log('\n🔍 データベース接続テスト開始...');

const pool = new Pool(dbConfig);

async function testConnection() {
    try {
        console.log('📡 データベースに接続中...');
        const result = await pool.query('SELECT NOW() as current_time, version() as postgres_version');
        
        console.log('✅ データベース接続成功!');
        console.log('⏰ 現在時刻:', result.rows[0].current_time);
        console.log('🐘 PostgreSQL バージョン:', result.rows[0].postgres_version);
        
        // テーブル一覧を確認
        console.log('\n📋 テーブル一覧を確認中...');
        const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log('📊 テーブル一覧:');
        tablesResult.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });
        
        // ユーザーテーブルの確認
        console.log('\n👥 ユーザーテーブルの確認...');
        const usersResult = await pool.query('SELECT COUNT(*) as user_count FROM users');
        console.log(`👤 ユーザー数: ${usersResult.rows[0].user_count}`);
        
        if (usersResult.rows[0].user_count > 0) {
            const sampleUsers = await pool.query('SELECT id, username, display_name, role FROM users LIMIT 3');
            console.log('👥 サンプルユーザー:');
            sampleUsers.rows.forEach(user => {
                console.log(`  - ${user.username} (${user.display_name}) - ${user.role}`);
            });
        }
        
    } catch (error) {
        console.error('❌ データベース接続エラー:', error.message);
        console.error('詳細:', error);
    } finally {
        await pool.end();
        console.log('\n🔚 データベース接続を閉じました');
    }
}

testConnection();
