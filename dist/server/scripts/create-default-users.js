import bcrypt from 'bcrypt';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
export async function createDefaultUsers() {
    try {
        // 管理者ユーザーの作成
        const adminExists = await db.query.users.findFirst({
            where: eq(users.username, 'niina')
        });
        if (!adminExists) {
            const hashedAdminPassword = await bcrypt.hash('0077', 10);
            await db.insert(users).values({
                username: 'niina',
                password: hashedAdminPassword,
                display_name: '管理者',
                role: 'admin',
                department: 'システム管理'
            });
            console.log('✅ 管理者ユーザー (niina) を作成しました');
        }
        // 一般ユーザーの作成
        const employeeExists = await db.query.users.findFirst({
            where: eq(users.username, 'employee')
        });
        if (!employeeExists) {
            const hashedEmployeePassword = await bcrypt.hash('employee123', 10);
            await db.insert(users).values({
                username: 'employee',
                password: hashedEmployeePassword,
                display_name: '一般ユーザー',
                role: 'employee',
                department: '保守部'
            });
            console.log('✅ 一般ユーザー (employee) を作成しました');
        }
        console.log('✅ デフォルトユーザーの初期化が完了しました');
    }
    catch (error) {
        console.error('❌ デフォルトユーザーの作成に失敗しました:', error);
        throw error;
    }
}
