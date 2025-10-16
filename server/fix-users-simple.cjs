const { db } = require('./db/index.js');
const { users } = require('./db/schema.js');
const { eq } = require('drizzle-orm');

async function fixUsers() {
  try {
    console.log('🔧 ユーザー修正開始...');

    // niinaユーザーをadminに修正
    console.log('🔧 niinaユーザーの権限をadminに修正中...');
    await db
      .update(users)
      .set({ role: 'admin' })
      .where(eq(users.username, 'niina'));
    console.log('✅ niinaユーザーの権限をadminに修正しました');

    // takabeni1ユーザーのパスワードを平文にリセット
    console.log('🔧 takabeni1ユーザーのパスワードを平文にリセット中...');
    await db
      .update(users)
  .set({ password: process.env.SEED_TAKABENI1_PASSWORD || 'Takabeni&1' })
      .where(eq(users.username, 'takabeni1'));
    console.log('✅ takabeni1ユーザーのパスワードを平文にリセットしました');

    // 修正後のユーザー一覧を確認
    console.log('\n📊 修正後のユーザー一覧:');
    const updatedUsers = await db.select().from(users);
    updatedUsers.forEach(user => {
      console.log(`- ${user.username}: ${user.role} (ID: ${user.id})`);
    });
  } catch (error) {
    console.error('❌ エラー:', error);
  }
  process.exit(0);
}

fixUsers();
