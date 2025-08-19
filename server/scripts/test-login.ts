import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from '../db/schema';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

// データベース接続
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URLが設定されていません');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function testLogin() {
  try {
    const username = 'niina';
    const password = '0077';
    
    console.log('🔐 ログインテスト開始:', { username, password });
    
    // データベースからユーザーを検索
    console.log('🔍 ユーザー検索中...');
    const user = await db.select().from(users).where(eq(users.username, username)).limit(1);
    
    if (user.length === 0) {
      console.log('❌ ユーザーが見つかりません:', username);
      return;
    }
    
    const foundUser = user[0];
    console.log('✅ ユーザーが見つかりました:', {
      id: foundUser.id,
      username: foundUser.username,
      role: foundUser.role,
      password: foundUser.password.substring(0, 20) + '...',
      passwordLength: foundUser.password.length
    });
    
    // パスワードチェック
    console.log('🔐 パスワード検証中...');
    
    // bcryptでハッシュ化されたパスワードをチェック
    try {
      const bcryptValid = await bcrypt.compare(password, foundUser.password);
      console.log('🔐 bcrypt検証結果:', bcryptValid);
      
      if (bcryptValid) {
        console.log('✅ bcrypt認証成功！');
        return;
      }
    } catch (error) {
      console.log('❌ bcrypt検証エラー:', error);
    }
    
    // 平文パスワードをチェック
    const plainTextValid = (foundUser.password === password);
    console.log('🔐 平文パスワード検証結果:', plainTextValid);
    
    if (plainTextValid) {
      console.log('✅ 平文パスワード認証成功！');
    } else {
      console.log('❌ 認証失敗');
      console.log('📝 詳細:', {
        inputPassword: password,
        storedPassword: foundUser.password,
        inputLength: password.length,
        storedLength: foundUser.password.length,
        isHashed: foundUser.password.startsWith('$2b$')
      });
    }
    
  } catch (error) {
    console.error('❌ テストエラー:', error);
  } finally {
    await client.end();
  }
}

// スクリプト実行
testLogin(); 