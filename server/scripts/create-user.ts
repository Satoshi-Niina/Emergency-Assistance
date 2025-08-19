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

async function createNiinaUser() {
  try {
    console.log('🔍 niinaユーザーの存在確認中...');
    
    // 既存のniinaユーザーを確認
    const existingUser = await db.select().from(users).where(eq(users.username, 'niina')).limit(1);
    
    if (existingUser.length > 0) {
      console.log('✅ niinaユーザーは既に存在します:', existingUser[0]);
      return;
    }
    
    console.log('📝 niinaユーザーを作成中...');
    
    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash('0077', 10);
    
    // ユーザーを作成
    const newUser = await db.insert(users).values({
      username: 'niina',
      password: hashedPassword,
      displayName: '新納',
      role: 'admin',
      department: 'システム管理部'
    }).returning();
    
    console.log('✅ niinaユーザーが正常に作成されました:', newUser[0]);
    
  } catch (error) {
    console.error('❌ ユーザー作成エラー:', error);
  } finally {
    await client.end();
  }
}

// スクリプト実行
createNiinaUser(); 