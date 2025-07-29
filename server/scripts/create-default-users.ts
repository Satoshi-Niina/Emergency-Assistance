import { db, users } from '../db/schema.js';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

export async function createDefaultUsers() {
    try {
        // niina ユーザーの確認（システム管理者）
        const niinaUser = await db.select().from(users).where(eq(users.username, 'niina'));
        
        if (niinaUser.length === 0) {
            const hashedPassword = await bcrypt.hash('0077', 10);
            await (db as any).insert(users).values({
                username: 'niina',
                password: hashedPassword,
                display_name: 'システム管理者',
                role: 'admin',
                department: 'システム管理',
                description: 'すべてのメニューからコードの編集まで可能',
                created_at: new Date()
            });
            console.log('niinaユーザー（システム管理者）を作成しました');
        } else {
            console.log('niinaユーザーは既に存在します');
        }

        // takabeni1 ユーザーの確認（一般ユーザー）
        const takabeniUser = await db.select().from(users).where(eq(users.username, 'takabeni1'));
        
        if (takabeniUser.length === 0) {
            const hashedPassword = await bcrypt.hash('takabeni1', 10);
            await (db as any).insert(users).values({
                username: 'takabeni1',
                password: hashedPassword,
                display_name: '一般ユーザー',
                role: 'employee',
                department: '一般',
                description: 'トップのチャット画面のみ表示',
                created_at: new Date()
            });
            console.log('takabeni1ユーザー（一般ユーザー）を作成しました');
        } else {
            console.log('takabeni1ユーザーは既に存在します');
        }

        console.log('デフォルトユーザーの作成が完了しました');
    } catch (error) {
        console.error('デフォルトユーザー作成エラー:', error);
    }
} 