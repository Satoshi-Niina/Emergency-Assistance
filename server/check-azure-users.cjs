const { Pool } = require('pg');

console.log('🔍 Azure PostgreSQL のユーザー情報を確認中...');

// Azure PostgreSQL の接続設定
const dbConfig = {
  connectionString:
    'postgresql://satoshi_niina:SecurePass2025ABC@emergencyassistance-db.postgres.database.azure.com:5432/emergency_assistance?sslmode=require',
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000, // 15秒に延長
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
};

const pool = new Pool(dbConfig);

async function checkAzureUsers() {
  try {
    console.log('📡 Azure PostgreSQL に接続中...');

    // 接続テスト
    const testResult = await pool.query('SELECT NOW() as current_time');
    console.log('✅ 接続成功:', testResult.rows[0].current_time);

    // テーブル一覧を確認
    console.log('\n📋 テーブル一覧:');
    const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);

    tablesResult.rows.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });

    // usersテーブルの存在確認
    const usersTableExists = tablesResult.rows.some(
      row => row.table_name === 'users'
    );

    if (!usersTableExists) {
      console.log('\n❌ usersテーブルが存在しません');
      return;
    }

    console.log('\n✅ usersテーブルが存在します');

    // ユーザー一覧を取得
    console.log('\n👥 ユーザー一覧を取得中...');
    const usersResult = await pool.query(`
            SELECT id, username, display_name, role, department, created_at
            FROM users 
            ORDER BY created_at DESC
        `);

    console.log(`\n📊 登録ユーザー数: ${usersResult.rows.length}`);

    if (usersResult.rows.length > 0) {
      console.log('\n👤 ユーザー詳細:');
      usersResult.rows.forEach((user, index) => {
        console.log(`\n${index + 1}. ユーザー情報:`);
        console.log(`   ID: ${user.id}`);
        console.log(`   ユーザー名: ${user.username}`);
        console.log(`   表示名: ${user.display_name}`);
        console.log(`   ロール: ${user.role}`);
        console.log(`   部署: ${user.department || '未設定'}`);
        console.log(`   作成日: ${user.created_at}`);
      });

      // パスワードの形式を確認
      console.log('\n🔐 パスワード形式確認:');
      const passwordResult = await pool.query(`
                SELECT username, 
                       CASE 
                           WHEN password LIKE '$2%' THEN 'bcryptハッシュ'
                           WHEN LENGTH(password) > 20 THEN 'ハッシュ化済み'
                           ELSE '平文パスワード'
                       END as password_type,
                       LENGTH(password) as password_length
                FROM users 
                ORDER BY username
            `);

      passwordResult.rows.forEach(user => {
        console.log(
          `- ${user.username}: ${user.password_type} (長さ: ${user.password_length})`
        );
      });
    } else {
      console.log('\n⚠️ ユーザーが登録されていません');

      // テーブル構造を確認
      console.log('\n📋 usersテーブルの構造:');
      const structureResult = await pool.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                ORDER BY ordinal_position
            `);

      structureResult.rows.forEach(col => {
        console.log(
          `  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL可' : 'NOT NULL'})`
        );
      });
    }
  } catch (error) {
    console.error('❌ エラー:', error.message);

    if (error.message.includes('timeout')) {
      console.log('\n⏰ 接続タイムアウトが発生しました');
      console.log('💡 考えられる原因:');
      console.log('  1. Azure PostgreSQL サーバーが停止している');
      console.log('  2. ファイアウォール設定でIPアドレスがブロックされている');
      console.log('  3. 接続文字列が間違っている');
      console.log('  4. ネットワーク接続の問題');
    }
  } finally {
    await pool.end();
    console.log('\n🔚 データベース接続を閉じました');
  }
}

checkAzureUsers();
