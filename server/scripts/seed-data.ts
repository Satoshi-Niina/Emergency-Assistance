import { db } from '../db.js';
import { schema } from '../../shared/schema.js';
import * as bcrypt from 'bcrypt';

export async function seedData(): Promise<void> {
    try {
        // ユーザーのシードデータ
        const users = [
            {
                username: 'admin',
                password: await bcrypt.hash('admin123', 10),
                display_name: 'システム管理者',
                role: 'admin'
            },
            {
                username: 'user1',
                password: await bcrypt.hash('user123', 10),
                display_name: '一般ユーザー1',
                role: 'employee'
            }
        ];

        for (const user of users) {
            await db.insert(schema.users).values(user);
        }

        console.log('✅ シードデータの作成が完了しました');
    } catch (error) {
        console.error('❌ シードデータ作成エラー:', error);
        throw error;
    }
} 