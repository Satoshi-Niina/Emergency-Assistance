import { db } from './db/index.js';
import { users } from './db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function fixUserRoles() {
  try {
    console.log('🔧 ユーザー権限修正開始...');
    
    // 現在のユーザー一覧を確認
    const allUsers = await db.select().from(users);
    console.log('📊 現在のユーザー一覧:');
    allUsers.forEach(user => {
      console.log(`- ${user.username}: ${user.role} (ID: ${user.id})`);
    });
    
    // niinaユーザーをadminに修正
    const niinaUser = allUsers.find(u => u.username === 'niina');
    if (niinaUser) {
      console.log(`\n🔧 niinaユーザーの権限を修正中...`);
      console.log(`現在の権限: ${niinaUser.role}`);
      
      await db.update(users)
        .set({ role: 'admin' })
        .where(eq(users.username, 'niina'));
      
      console.log('✅ niinaユーザーの権限をadminに修正しました');
    } else {
      console.log('❌ niinaユーザーが見つかりません');
    }
    
    // takabeni1ユーザーのパスワードをリセット
    const takabeni1User = allUsers.find(u => u.username === 'takabeni1');
    if (takabeni1User) {
      console.log(`\n🔧 takabeni1ユーザーのパスワードをリセット中...`);
      
      // 平文パスワードを設定（開発環境用）
      await db.update(users)
        .set({ password: 'Takabeni&1' })
        .where(eq(users.username, 'takabeni1'));
      
      console.log('✅ takabeni1ユーザーのパスワードを平文にリセットしました');
    }
    
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

fixUserRoles();
