/**
 * テスト用ユーザー作成スクリプト - 3段階の権限テスト
 */

const bcrypt = require('bcrypt');
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { eq } = require('drizzle-orm');
const { users } = require('./db/schema.ts');  // TSファイルを直接読み込み
require('dotenv').config({ path: './.env' });  // サーバーディレクトリの.envファイル

// データベース接続
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL環境変数が設定されていません');
  process.exit(1);
}

const sql = postgres(connectionString, { ssl: false });
const db = drizzle(sql);

/**
 * テスト用ユーザーを作成
 */
async function createTestUsers() {
  console.log('🔧 テスト用ユーザー作成開始...');

  const testUsers = [
    {
      username: 'sysadmin',
      password: 'Admin123!',
      displayName: 'システム管理者',
      role: 'system_admin',
      department: 'システム管理部'
    },
    {
      username: 'operator',
      password: 'Ope123!',
      displayName: '運用管理者',
      role: 'operator', 
      department: '運用部'
    },
    {
      username: 'user1',
      password: 'User123!',
      displayName: '一般ユーザー',
      role: 'user',
      department: '現場作業部'
    }
  ];

  try {
    for (const userData of testUsers) {
      // 既存ユーザーチェック
      const existingUser = await db.select().from(users).where(eq(users.username, userData.username));
      
      if (existingUser.length > 0) {
        console.log(`⚠️  ユーザー '${userData.username}' は既に存在します - スキップ`);
        continue;
      }

      // パスワードハッシュ化
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // ユーザー作成
      const newUser = await db.insert(users).values({
        username: userData.username,
        password: hashedPassword,
        displayName: userData.displayName,
        role: userData.role,
        department: userData.department,
        created_at: new Date()
      }).returning();

      console.log(`✅ ユーザー作成完了: ${userData.username} (${userData.role})`);
    }

    console.log('\n📋 テスト用ユーザー一覧:');
    console.log('┌─────────────┬────────────┬────────────────┬──────────────────┐');
    console.log('│ ユーザー名   │ パスワード  │ 権限レベル      │ 説明             │');
    console.log('├─────────────┼────────────┼────────────────┼──────────────────┤');
    console.log('│ sysadmin    │ Admin123!  │ system_admin   │ すべての権限     │');
    console.log('│ operator    │ Ope123!    │ operator       │ システム使用全般 │');
    console.log('│ user1       │ User123!   │ user           │ チャット機能のみ │');
    console.log('└─────────────┴────────────┴────────────────┴──────────────────┘');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await sql.end();
  }
}

// 実行
createTestUsers().catch(console.error);
