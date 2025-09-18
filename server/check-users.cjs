const { Pool } = require('pg');

// 環境変数を設定
process.env.DATABASE_URL = "postgresql://satoshi_niina:SecurePass2025ABC@emergencyassistance-db.postgres.database.azure.com:5432/emergency_assistance?sslmode=require";

console.log('🔍 ユーザー一覧を確認中...');

// データベース接続設定
const dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 0,
};

const pool = new Pool(dbConfig);

async function checkUsers() {
    try {
        console.log('📡 データベースに接続中...');
        
        // ユーザーテーブルの存在確認
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            );
        `);
        
        if (!tableCheck.rows[0].exists) {
            console.log('❌ usersテーブルが存在しません');
            return;
        }
        
        console.log('✅ usersテーブルが存在します');
        
        // ユーザー一覧を取得
        const usersResult = await pool.query(`
            SELECT id, username, display_name, role, department, created_at
            FROM users 
            ORDER BY created_at DESC
        `);
        
        console.log(`\n👥 登録ユーザー数: ${usersResult.rows.length}`);
        
        if (usersResult.rows.length > 0) {
            console.log('\n📋 ユーザー一覧:');
            usersResult.rows.forEach((user, index) => {
                console.log(`${index + 1}. ユーザー名: ${user.username}`);
                console.log(`   表示名: ${user.display_name}`);
                console.log(`   ロール: ${user.role}`);
                console.log(`   部署: ${user.department || '未設定'}`);
                console.log(`   作成日: ${user.created_at}`);
                console.log('   ---');
            });
        } else {
            console.log('⚠️ ユーザーが登録されていません');
        }
        
        // パスワードの確認（ハッシュ化されているかチェック）
        const passwordCheck = await pool.query(`
            SELECT username, 
                   CASE 
                       WHEN password LIKE '$2%' THEN 'bcryptハッシュ'
                       WHEN LENGTH(password) > 20 THEN 'ハッシュ化済み'
                       ELSE '平文パスワード'
                   END as password_type
            FROM users 
            LIMIT 3
        `);
        
        console.log('\n🔐 パスワード形式:');
        passwordCheck.rows.forEach(user => {
            console.log(`- ${user.username}: ${user.password_type}`);
        });
        
    } catch (error) {
        console.error('❌ エラー:', error.message);
        
        // モックデータベースの情報を表示
        console.log('\n🔍 モックデータベースの情報:');
        console.log('ユーザー名: admin');
        console.log('表示名: 管理者');
        console.log('ロール: admin');
        console.log('部署: システム管理部');
        console.log('パスワード: 実際のパスワードは不明（bcryptハッシュ化済み）');
        
    } finally {
        await pool.end();
        console.log('\n🔚 データベース接続を閉じました');
    }
}

checkUsers();
