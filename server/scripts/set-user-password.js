#!/usr/bin/env node
/**
 * セキュアなユーザーパスワード設定スクリプト
 * 使用方法: node set-user-password.js <username> <new_password>
 */

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// 環境変数からデータベース接続情報を取得
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});

async function setUserPassword(username, newPassword) {
  if (!username || !newPassword) {
    console.error(
      '❌ 使用方法: node set-user-password.js <username> <new_password>'
    );
    process.exit(1);
  }

  if (newPassword.length < 8) {
    console.error('❌ パスワードは8文字以上である必要があります');
    process.exit(1);
  }

  try {
    // パスワードをハッシュ化
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // データベースでユーザーを更新
    const client = await pool.connect();
    try {
      const result = await client.query(
        'UPDATE users SET password = $1 WHERE username = $2 RETURNING username, display_name, role',
        [hashedPassword, username]
      );

      if (result.rows.length === 0) {
        console.error(`❌ ユーザー '${username}' が見つかりません`);
        process.exit(1);
      }

      const user = result.rows[0];
      console.log('✅ パスワードが正常に更新されました');
      console.log(`   ユーザー名: ${user.username}`);
      console.log(`   表示名: ${user.display_name}`);
      console.log(`   ロール: ${user.role}`);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// コマンドライン引数を取得
const [, , username, password] = process.argv;
setUserPassword(username, password);
