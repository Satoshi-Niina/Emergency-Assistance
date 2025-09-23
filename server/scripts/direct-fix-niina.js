import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

async function directFixNiina() {
  try {
    console.log('🔍 データベースに直接接続中...');

    // 全ユーザーを確認
    console.log('📋 現在の全ユーザー:');
    const allUsers = await db
      .select({
        username: users.username,
        displayName: users.displayName,
        role: users.role,
        department: users.department,
      })
      .from(users);

    allUsers.forEach((user, index) => {
      console.log(
        `${index + 1}. ${user.username} (${user.displayName}) - ${user.role} - ${user.department}`
      );
    });

    // niinaユーザーを確認
    const niinaUser = await db
      .select()
      .from(users)
      .where(eq(users.username, 'niina'));

    if (niinaUser.length === 0) {
      console.log('❌ niinaユーザーが見つかりません。新規作成します...');

      const newUser = await db
        .insert(users)
        .values({
          username: 'niina',
          // password: 'G&896845', // 未使用のため削除
          displayName: '新納 智志',
          role: 'admin',
          department: 'システム管理部',
          description: '運用管理者',
        })
        .returning();

      console.log('✅ niinaユーザーを新規作成しました:', newUser[0]);
    } else {
      console.log('🔧 niinaユーザーが見つかりました。権限を更新します...');
      console.log('現在の状態:', niinaUser[0]);

      const updatedUser = await db
        .update(users)
        .set({
          role: 'admin',
          department: 'システム管理部',
          description: '運用管理者',
        })
        .where(eq(users.username, 'niina'))
        .returning();

      console.log('✅ niinaユーザーの権限を更新しました:', updatedUser[0]);
    }

    // 最終確認
    console.log('📋 更新後のniinaユーザー:');
    const finalUser = await db
      .select()
      .from(users)
      .where(eq(users.username, 'niina'));
    console.log('✅ 最終状態:', finalUser[0]);
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

directFixNiina();
