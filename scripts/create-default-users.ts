#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { users } from '../shared/schema.js';
import bcrypt from 'bcrypt';

// 環境変数の読み込み
dotenv.config();

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('🚀 Creating default users...');

  try {
    // PostgreSQL接続の作成
    const sql = postgres(databaseUrl, { max: 1 });
    const db = drizzle(sql);

    // 既存ユーザーの確認
    const existingUsers = await db.select().from(users);
    console.log(`📊 Found ${existingUsers.length} existing users`);

    // デフォルトユーザーの作成
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const defaultUsers = [
      {
        username: 'admin',
        password: hashedPassword,
        display_name: 'システム管理者',
        role: 'admin',
        department: 'IT',
        description: 'システム全体の管理権限を持つ管理者'
      },
      {
        username: 'operator',
        password: hashedPassword,
        display_name: 'オペレーター',
        role: 'employee',
        department: '運営',
        description: '日常的な運営業務を担当'
      },
      {
        username: 'user',
        password: hashedPassword,
        display_name: '一般ユーザー',
        role: 'employee',
        department: '一般',
        description: '基本的な機能を使用する一般ユーザー'
      }
    ];

    for (const user of defaultUsers) {
      // 既存ユーザーの確認
      const existingUser = existingUsers.find(u => u.username === user.username);
      
      if (existingUser) {
        console.log(`⚠️ User already exists: ${user.username}`);
      } else {
        await db.insert(users).values(user);
        console.log(`✅ Created user: ${user.username} (${user.display_name})`);
      }
    }

    console.log('✅ Default users creation completed');
    console.log('📝 Default password for all users: admin123');
    console.log('⚠️ Please change passwords after first login');
    
    // 接続を閉じる
    await sql.end();
  } catch (error) {
    console.error('❌ Default users creation failed:', error);
    process.exit(1);
  }
}

main(); 