import { db } from '../server/db/index.js';
import { users } from '../server/db/schema.js';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

async function createDefaultUsers() {
  console.log('👥 デフォルトユーザー作成開始...');

  try {
    // 管理者ユーザー
    const adminExists = await (db as any).query.users.findFirst({
      where: eq(users.username, 'niina')
    });

    if (!adminExists) {
      const hashedAdminPassword = await bcrypt.hash('0077', 10);
      await (db as any).insert(users).values({
        username: 'niina',
        password: hashedAdminPassword,
        display_name: '管理者',
        role: 'admin',
        department: '管理部',
        description: 'システム管理者',
        created_at: new Date()
      });
      console.log('✅ 管理者ユーザー (niina) を作成しました');
    } else {
      console.log('⚠️ 管理者ユーザー (niina) は既に存在します');
    }

    // 一般ユーザー
    const employeeExists = await (db as any).query.users.findFirst({
      where: eq(users.username, 'employee')
    });

    if (!employeeExists) {
      const hashedEmployeePassword = await bcrypt.hash('employee123', 10);
      await (db as any).insert(users).values({
        username: 'employee',
        password: hashedEmployeePassword,
        display_name: '一般ユーザー',
        role: 'employee',
        department: '技術部',
        description: '一般社員',
        created_at: new Date()
      });
      console.log('✅ 一般ユーザー (employee) を作成しました');
    } else {
      console.log('⚠️ 一般ユーザー (employee) は既に存在します');
    }

    console.log('✅ デフォルトユーザー作成完了');
  } catch (error) {
    console.error('❌ デフォルトユーザー作成エラー:', error);
  }

  process.exit(0);
}

createDefaultUsers();