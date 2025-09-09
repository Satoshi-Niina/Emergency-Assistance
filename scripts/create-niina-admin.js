/**
 * Azure本番環境でniinaユーザーにシステム管理者権限を付与するスクリプト
 */

const { drizzle } = require('drizzle-orm/node-postgres');
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const { users } = require('../server/db/schema');
const { eq } = require('drizzle-orm');

// Azure PostgreSQL接続設定（環境変数から取得）
const connectionConfig = {
  host: process.env.PGHOST || process.env.DATABASE_HOST,
  port: parseInt(process.env.PGPORT || process.env.DATABASE_PORT || '5432'),
  database: process.env.PGDATABASE || process.env.DATABASE_NAME,
  user: process.env.PGUSER || process.env.DATABASE_USER,
  password: process.env.PGPASSWORD || process.env.DATABASE_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

async function createOrUpdateNiinaAdmin() {
  const client = new Client(connectionConfig);
  
  try {
    console.log('🔗 Azure PostgreSQLデータベースに接続中...');
    await client.connect();
    
    const db = drizzle(client);
    
    const username = 'niina';
    const password = 'G&896845';
    const role = 'system_admin';
    const displayName = 'Niina Administrator';
    const department = 'システム管理';
    
    console.log(`👤 ユーザー "${username}" を確認中...`);
    
    // 既存ユーザーをチェック
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    
    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);
    
    if (existingUser.length > 0) {
      console.log('📝 既存ユーザーを更新中...');
      // 既存ユーザーを更新
      await db
        .update(users)
        .set({
          password: hashedPassword,
          role: role,
          displayName: displayName,
          department: department,
          updatedAt: new Date()
        })
        .where(eq(users.username, username));
      
      console.log(`✅ ユーザー "${username}" を更新しました`);
    } else {
      console.log('🆕 新規ユーザーを作成中...');
      // 新規ユーザーを作成
      await db.insert(users).values({
        username: username,
        password: hashedPassword,
        role: role,
        displayName: displayName,
        department: department,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log(`✅ ユーザー "${username}" を作成しました`);
    }
    
    // 結果を確認
    const updatedUser = await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        displayName: users.displayName,
        department: users.department,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .where(eq(users.username, username));
    
    console.log('📊 ユーザー情報:');
    console.table(updatedUser);
    
    console.log('🎉 処理が完了しました！');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    
    if (error.code === 'ENOTFOUND') {
      console.error('💡 データベースホストが見つかりません。環境変数を確認してください。');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 データベース接続が拒否されました。ファイアウォール設定を確認してください。');
    } else if (error.code === '28P01') {
      console.error('💡 認証に失敗しました。ユーザー名とパスワードを確認してください。');
    }
    
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 データベース接続を閉じました');
  }
}

// スクリプト実行
if (require.main === module) {
  console.log('🚀 Niina管理者ユーザー作成スクリプトを開始...');
  console.log('📍 対象環境:', process.env.NODE_ENV || 'development');
  
  createOrUpdateNiinaAdmin().catch(error => {
    console.error('💥 スクリプト実行エラー:', error);
    process.exit(1);
  });
}

module.exports = { createOrUpdateNiinaAdmin };
