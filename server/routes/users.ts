import express from 'express';
import bcrypt from 'bcrypt';
import { db, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = express.Router();

router.get('/', async (_req: any, res: any) => {
    try {
        const allUsers: any = await db.select().from(users);
        res.json(allUsers);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

router.get('/:id', async (req: any, res: any) => {
    try {
        const { id } = req.params;
        
        // まず、Drizzleのクエリで試行
        let existingUser: any = null;
        try {
            const results = await db.select().from(users).where(eq(users.id, id));
            existingUser = results[0];
        } catch (dbError) {
            console.log('[DEBUG] Drizzleクエリエラー:', dbError);
        }

        // Drizzleクエリが失敗した場合、手動で検索
        if (!existingUser) {
            console.log('[DEBUG] Drizzleクエリ失敗、手動検索を実行');
            const allUsers: any = await db.select().from(users);
            console.log(`[DEBUG] 全ユーザー一覧 (${allUsers.length}件):`, allUsers.map(u => ({
                id: u.id,
                username: u.username,
                display_name: u.display_name,
                role: u.role,
                department: u.department
            })));

            // 完全一致を試行
            existingUser = allUsers.find(u => u.id === id);
            
            if (!existingUser) {
                console.log(`[DEBUG] 完全一致チェック:`, allUsers.map(u => ({
                    id: u.id,
                    idType: typeof u.id,
                    idLength: u.id.length,
                    searchId: id,
                    searchIdType: typeof id,
                    searchIdLength: id.length,
                    exactMatch: u.id === id,
                    includesMatch: u.id.includes(id) || id.includes(u.id),
                    caseInsensitiveMatch: u.id.toLowerCase() === id.toLowerCase()
                })));

                // 部分一致を試行
                const partialMatches = allUsers.filter(u => 
                    u.id.includes(id) || id.includes(u.id) || u.id.toLowerCase() === id.toLowerCase()
                );

                if (partialMatches.length > 0) {
                    existingUser = partialMatches[0];
                    console.log(`[DEBUG] 部分一致で見つかりました:`, existingUser);
                } else {
                    console.log(`[ERROR] 利用可能なID一覧:`, allUsers.map(u => `"${u.id}"`));
                    console.log(`[ERROR] 文字コード比較:`, allUsers.map(u => ({
                        id: u.id,
                        charCodes: Array.from(u.id as string).map(c => (c as string).charCodeAt(0)),
                        searchId: id,
                        searchCharCodes: Array.from(id as string).map(c => (c as string).charCodeAt(0))
                    })));
                    
                    return res.status(404).json({
                        error: 'User not found',
                        searchId: id,
                        availableIds: allUsers.map(u => u.id),
                        possibleMatches: allUsers.filter(u => u.id.includes(id) || id.includes(u.id) || u.id.toLowerCase() === id.toLowerCase())
                    });
                }
            }
        }

        if (existingUser) {
            // パスワードを除外してレスポンス
            const { password, ...userWithoutPassword } = existingUser;
            res.json(userWithoutPassword);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// ユーザー更新処理の共通関数
const updateUserHandler = async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { username, display_name, role, department, password } = req.body;

        console.log(`[DEBUG] ユーザー更新リクエスト: ID="${id}"`, {
            username,
            display_name,
            role,
            department,
            hasPassword: !!password
        });

        const updateData: any = {
            username,
            display_name,
            role,
            department
        };

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const existingUser: any = await db.select().from(users).where(eq(users.id, id));
        
        if (existingUser.length === 0) {
            console.log(`[ERROR] ユーザーが見つかりません: ID="${id}"`);
            return res.status(404).json({ error: 'User not found' });
        }

        console.log(`[DEBUG] 既存ユーザー情報:`, existingUser[0]);

        await db.update(users).set(updateData).where(eq(users.id, id));
        
        console.log(`[DEBUG] ユーザー更新完了: ID="${id}"`);
        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};

// PUTメソッド（既存）
router.put('/:id', updateUserHandler);

// PATCHメソッド（新規追加）
router.patch('/:id', updateUserHandler);

export { router as usersRouter }; 