import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

async function fixNiinaUser() {
  try {
    console.log('🔍 データベースに接続中...');

    // niinaユーザーの現在の状態を確認
    console.log('📋 niinaユーザーの現在の状態を確認中...');
    const currentUser = await db
      .select({
        username: users.username,
        displayName: users.displayName,
        role: users.role,
        department: users.department,
        description: users.description,
      })
      .from(users)
      .where(eq(users.username, 'niina'));

    if (currentUser.length > 0) {
      console.log('現在の状態:', currentUser[0]);
    } else {
      console.log('❌ niinaユーザーが見つかりません。新規作成します...');

      // niinaユーザーを新規作成
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
    }

    // niinaユーザーの権限を更新
    console.log('🔧 niinaユーザーの権限を更新中...');
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

    // 最終確認
    console.log('📋 更新後のniinaユーザー:');
    const finalUser = await db
      .select({
        username: users.username,
        displayName: users.displayName,
        role: users.role,
        department: users.department,
        description: users.description,
        createdAt: users.created_at,
      })
      .from(users)
      .where(eq(users.username, 'niina'));

    if (finalUser.length > 0) {
      console.log('✅ 最終状態:', finalUser[0]);
    }
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

fixNiinaUser();
