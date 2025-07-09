import { db, users } from '../db/schema.js';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

export async function createDefaultUsers() {
    try {
        // 管理者ユーザーの確認
        const adminUser = await db.select().from(users).where(eq(users.username, 'admin'));
        
        if (adminUser.length === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await (db as any).insert(users).values({
                username: 'admin',
                password: hashedPassword,
                display_name: '管理者',
                role: 'admin',
                department: 'IT',
                description: '',
                created_at: new Date()
            });
            console.log('管理者ユーザーを作成しました');
        } else {
            console.log('管理者ユーザーは既に存在します');
        }

        // 一般ユーザーの確認
        const employeeUser = await db.select().from(users).where(eq(users.username, 'employee'));
        
        if (employeeUser.length === 0) {
            const hashedPassword = await bcrypt.hash('employee123', 10);
            await (db as any).insert(users).values({
                username: 'employee',
                password: hashedPassword,
                display_name: '一般ユーザー',
                role: 'employee',
                department: '一般',
                description: '',
                created_at: new Date()
            });
            console.log('一般ユーザーを作成しました');
        } else {
            console.log('一般ユーザーは既に存在します');
        }

        console.log('デフォルトユーザーの作成が完了しました');
    } catch (error) {
        console.error('デフォルトユーザー作成エラー:', error);
    }
} 