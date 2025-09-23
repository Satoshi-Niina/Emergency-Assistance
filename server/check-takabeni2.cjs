import { db } from './db/index.js';
import { users } from './db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function checkTakabeni2() {
  try {
    console.log('🔍 takabeni2ユーザーの状態確認...');

    // takabeni2ユーザーを検索
    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, 'takabeni2'))
      .limit(1);

    if (user.length === 0) {
      console.log('❌ takabeni2ユーザーが見つかりません');
      return;
    }

    const takabeni2 = user[0];
    console.log('📊 takabeni2ユーザー情報:');
    console.log(JSON.stringify(takabeni2, null, 2));

    // パスワードテスト
    // const testPassword = 'Takabeni&2'; // 未使用のため削除
    console.log(`\n🔐 パスワードテスト: "${testPassword}"`);

    // bcryptテスト
    try {
      const bcryptMatch = await bcrypt.compare(
        testPassword,
        takabeni2.password
      );
      console.log(`bcrypt認証: ${bcryptMatch ? '✅ 成功' : '❌ 失敗'}`);
    } catch (error) {
      console.log(`bcrypt認証エラー: ${error.message}`);
    }

    // 平文テスト
    const plainMatch = takabeni2.password === testPassword;
    console.log(`平文認証: ${plainMatch ? '✅ 成功' : '❌ 失敗'}`);

    // パスワードの状態確認
    console.log(`\n🔍 パスワード状態:`);
    console.log(`- 長さ: ${takabeni2.password.length}`);
    console.log(`- 先頭: ${takabeni2.password.substring(0, 10)}...`);
    console.log(
      `- bcrypt形式: ${takabeni2.password.startsWith('$2b$') ? 'はい' : 'いいえ'}`
    );
  } catch (error) {
    console.error('❌ エラー:', error);
  }
  process.exit(0);
}

checkTakabeni2();
