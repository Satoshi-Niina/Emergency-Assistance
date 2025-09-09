#!/usr/bin/env node

/**
 * Azure本番環境 緊急修正スクリプト
 * niinaユーザー権限を即座に修正します
 */

const { Client } = require('pg');

console.log('🚨 Azure緊急修正: niinaユーザー権限設定');
console.log('=========================================');

async function emergencyFixNiinaUser() {
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL環境変数が設定されていません');
    console.log('💡 Azure App Service の構成で DATABASE_URL を確認してください');
    return false;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    query_timeout: 10000
  });

  try {
    console.log('🔗 データベースに接続中...');
    await client.connect();
    console.log('✅ データベース接続成功');

    // niinaユーザーのUPSERT（存在しなければ作成、存在すれば更新）
    console.log('🔧 niinaユーザーを修正中...');
    
    const result = await client.query(`
      INSERT INTO users (
        id, username, password, role, display_name, department, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        $1, $2, $3, $4, $5, NOW(), NOW()
      )
      ON CONFLICT (username) DO UPDATE SET
        role = $3,
        display_name = $4,
        department = $5,
        updated_at = NOW()
      RETURNING username, role, display_name;
    `, [
      'niina',
      '$2b$10$JkW0ciQRzRVsha5SiU5rz.bsEhffHP2AShZQjrnfMgxCTf5ZM70KS', // G&896845のハッシュ
      'system_admin',
      'Niina Administrator',
      'システム管理'
    ]);

    console.log('✅ niinaユーザー修正完了:');
    console.table(result.rows);

    // 全管理者確認
    const adminCheck = await client.query(
      'SELECT username, role, display_name FROM users WHERE role = $1 ORDER BY username',
      ['system_admin']
    );

    console.log('👑 システム管理者一覧:');
    console.table(adminCheck.rows);

    console.log('\n🎉 修正完了！');
    console.log('💡 フロントエンドでniinaユーザーでログインしてください');
    console.log('💡 パスワード: G&896845');

    return true;
    
  } catch (error) {
    console.log('❌ 修正失敗:', error.message);
    console.log('💡 詳細エラー:', error.code, error.detail);
    return false;
  } finally {
    try {
      await client.end();
    } catch (e) {
      // 無視
    }
  }
}

// 実行
emergencyFixNiinaUser().then(success => {
  if (success) {
    console.log('\n✅ 緊急修正が正常に完了しました');
  } else {
    console.log('\n❌ 緊急修正に失敗しました');
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 実行エラー:', error);
  process.exit(1);
});
