import * as bcrypt from 'bcrypt';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

async function createDefaultUsers() {
  try {
    console.log('🔄 デフォルトユーザー作成開始...');

    // 既存のniinaユーザーを削除して再作成
    await db.delete(users).where(eq(users.username, 'niina'));
    console.log('🗑️ 既存のniinaユーザーを削除しました');

    // 管理者ユーザー (niina / 0077) を再作成
    const hashedPassword = await bcrypt.hash('0077', 10);
    console.log('🔐 新しいパスワードハッシュを生成:', hashedPassword);

    await db.insert(users).values({
      username: 'niina',
      password: hashedPassword,
      display_name: '新名管理者',
      role: 'admin',
      department: '情報システム部',
      description: 'システム管理者',
      created_at: new Date()
    });
    console.log('✅ 管理者ユーザー (niina) を再作成しました');

    // 一般ユーザー (takabeni1 / takabeni123)
    const employeeUser = await db.select().from(users).where(eq(users.username, 'takabeni1')).limit(1);
    if (employeeUser.length === 0) {
      const hashedPassword2 = await bcrypt.hash('takabeni123', 10);
      await db.insert(users).values({
        username: 'takabeni1',
        password: hashedPassword2,
        display_name: '高辺一般',
        role: 'employee',
        department: '運用部',
        description: '一般ユーザー',
        created_at: new Date()
      });
      console.log('✅ 一般ユーザー (takabeni1) を作成しました');
    } else {
      console.log('takabeni1ユーザーは既に存在します');
    }

    console.log('デフォルトユーザーの作成が完了しました');
  } catch (error) {
    console.error('❌ デフォルトユーザー作成エラー:', error);
    throw error;
  }
}

export { createDefaultUsers };

// 直接実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
  createDefaultUsers()
    .then(() => {
      console.log('✅ デフォルトユーザー作成完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ エラー:', error);
      process.exit(1);
    });
}