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

async function updateNiinaPassword() {
  try {
    console.log('🔍 niinaユーザーの現在の状態を確認中...');
    
    // 既存のniinaユーザーを確認
    const existingUser = await db.select().from(users).where(eq(users.username, 'niina')).limit(1);
    
    if (existingUser.length === 0) {
      console.log('❌ niinaユーザーが見つかりません');
      return;
    }
    
    const user = existingUser[0];
    console.log('📝 現在のユーザー情報:', {
      id: user.id,
      username: user.username,
      password: user.password,
      passwordLength: user.password.length,
      displayName: user.displayName,
      role: user.role
    });
    
    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash('0077', 10);
    console.log('🔐 ハッシュ化されたパスワード:', hashedPassword.substring(0, 20) + '...');
    
    // パスワードを更新
    const updatedUser = await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.username, 'niina'))
      .returning();
    
    console.log('✅ パスワードが正常に更新されました:', {
      id: updatedUser[0].id,
      username: updatedUser[0].username,
      password: updatedUser[0].password.substring(0, 20) + '...',
      displayName: updatedUser[0].displayName,
      role: updatedUser[0].role
    });
    
    // パスワード検証テスト
    const isValid = await bcrypt.compare('0077', updatedUser[0].password);
    console.log('🔐 パスワード検証テスト:', isValid);
    
  } catch (error) {
    console.error('❌ パスワード更新エラー:', error);
  } finally {
    await client.end();
  }
}

// スクリプト実行
updateNiinaPassword(); 