import { Router } from 'express';
import { users } from '@shared/schema';
import { db } from '../db';
import { eq, sql } from 'drizzle-orm';
const router: any = Router();
// ✅ ユーザー一覧取得
router.get('/', async (req, res) => {
    try {
        // select()の代わりに明示的にカラムを指定して取得
        const allUsers: any = await db.query.users.findMany({
            columns: {
                id: true,
                username: true,
                display_name: true,
                role: true,
                department: true
            }
        });
        res.json(allUsers);
    }
    catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
// ユーザー情報を更新 - ルーティングを明確化
router.patch('/:id', async (req, res) => {
    console.log(`[DEBUG] PATCH /users/:id エンドポイントが呼ばれました`);
    console.log(`[DEBUG] req.method: ${req.method}`);
    console.log(`[DEBUG] req.originalUrl: ${req.originalUrl}`);
    console.log(`[DEBUG] req.path: ${req.path}`);
    console.log(`[DEBUG] req.baseUrl: ${req.baseUrl}`);
    try {
        const { id } = req.params; // IDはstringとして扱う
        const { username, display_name, role, department, password } = req.body;
        console.log(`[DEBUG] ユーザー更新リクエスト: ID="${id}" (type: ${typeof id})`);
        console.log(`[DEBUG] リクエストボディ:`, { username, display_name, role, department, hasPassword: !!password });
        console.log(`[DEBUG] Full request params:`, req.params);
        console.log(`[DEBUG] Full request URL:`, req.url);
        console.log(`[DEBUG] セッション情報:`, {
            sessionUserId: req.session?.userId,
            sessionUserRole: req.session?.userRole,
            hasSession: !!req.session
        });
        // バリデーション
        if (!username || !display_name) {
            console.log(`[DEBUG] バリデーション失敗: username="${username}", display_name="${display_name}"`);
            return res.status(400).json({ message: "ユーザー名と表示名は必須です" });
        }
        // データベース接続テスト
        try {
            const testQuery: any = await db.execute('SELECT 1 as test');
            console.log(`[DEBUG] データベース接続テスト成功:`, testQuery);
        }
        catch (dbError) {
            console.error(`[ERROR] データベース接続失敗:`, dbError);
            return res.status(500).json({ message: "データベース接続エラー" });
        }
        // 全ユーザーを取得してデバッグ
        const allUsers: any = await db.query.users.findMany();
        console.log(`[DEBUG] 全ユーザー一覧 (${allUsers.length}件):`, allUsers.map(u => ({
            id: u.id,
            username: u.username,
            idType: typeof u.id,
            idLength: u.id ? u.id.length : 'null',
            exactMatch: u.id === id
        })));
        // IDのフォーマットを確認
        console.log(`[DEBUG] 検索対象ID: "${id}" (length: ${id.length}, type: ${typeof id})`);
        console.log(`[DEBUG] ID bytes:`, Buffer.from(id, 'utf8'));
        // 異なる検索方法を試行
        console.log(`[DEBUG] 検索クエリを実行中...`);
        // 方法1: 基本的な検索（UUIDの文字列形式で検索）
        let existingUser;
        try {
            existingUser = await db.query.users.findFirst({
                where: eq(users.id, id)
            });
        }
        catch (queryError) {
            console.error(`[ERROR] Drizzle検索エラー:`, queryError);
            existingUser = null;
        }
        console.log(`[DEBUG] 基本検索結果:`, existingUser ? {
            id: existingUser.id,
            username: existingUser.username,
            exactMatch: existingUser.id === id,
            byteComparison: Buffer.from(existingUser.id, 'utf8').equals(Buffer.from(id, 'utf8'))
        } : 'null');
        // 方法2: SQL直接実行でテスト（パラメータ化クエリを使用）
        try {
            const directResult: any = await db.execute(sql `SELECT * FROM users WHERE id = ${id}`);
            console.log(`[DEBUG] パラメータ化SQL検索結果:`, directResult);
        }
        catch (sqlError) {
            console.error(`[ERROR] パラメータ化SQL実行失敗:`, sqlError);
        }
        // 方法3: 全ユーザーから手動検索
        const manualMatch: any = allUsers.find(u => u.id === id);
        console.log(`[DEBUG] 手動検索結果:`, manualMatch ? {
            id: manualMatch.id,
            username: manualMatch.username,
            found: true
        } : 'null');
        // 方法4: IDの完全一致チェック
        console.log(`[DEBUG] 完全一致チェック:`, allUsers.map(u => ({
            storedId: u.id,
            requestId: id,
            exact: u.id === id,
            strict: u.id.valueOf() === id.valueOf(),
            toString: u.id.toString() === id.toString()
        })));
        // 最終的にユーザーを取得（手動検索の結果を優先）
        const finalUser: any = existingUser || manualMatch;
        if (!finalUser) {
            console.log(`[ERROR] ユーザーが見つかりません: ID="${id}"`);
            console.log(`[ERROR] 利用可能なID一覧:`, allUsers.map(u => `"${u.id}"`));
            console.log(`[ERROR] 文字コード比較:`, allUsers.map(u => ({
                storedId: u.id,
                requestId: id,
                match: u.id === id,
                lengthMatch: u.id.length === id.length,
                includes: u.id.includes(id) || id.includes(u.id)
            })));
            return res.status(404).json({
                message: "ユーザーが見つかりません",
                debug: {
                    requestedId: id,
                    requestedIdLength: id.length,
                    availableIds: allUsers.map(u => u.id),
                    possibleMatches: allUsers.filter(u => u.id.includes(id) || id.includes(u.id) || u.id.toLowerCase() === id.toLowerCase())
                }
            });
        }
        console.log(`[DEBUG] 最終的に見つかったユーザー:`, {
            id: finalUser.id,
            username: finalUser.username,
            source: existingUser ? 'drizzle_query' : 'manual_search'
        });
        // 更新データを準備
        const updateData = {
            username,
            display_name,
            role,
            department
        };
        // パスワードが有効な場合のみ更新（undefined、null、空文字、空白文字は全て除外）
        if (password && typeof password === 'string' && password.trim().length > 0) {
            import bcrypt from "bcrypt";
            updateData.password = await bcrypt.hash(password, 10);
            console.log(`パスワードも更新します: ID=${id}`);
        }
        else {
            console.log(`パスワードは未記入または無効のため、現在のパスワードを維持します: ID=${id}`, { password: password, type: typeof password });
        }
        // ユーザー更新
        const [updatedUser] = await db
            .update(users)
            .set(updateData)
            .where(eq(users.id, id))
            .returning({
            id: users.id,
            username: users.username,
            display_name: users.display_name,
            role: users.role,
            department: users.department
        });
        console.log(`ユーザー更新成功: ID=${id}`);
        res.json(updatedUser);
    }
    catch (error) {
        console.error("Error updating user:", error);
        return res.status(500).json({ message: "ユーザー更新中にエラーが発生しました" });
    }
});
// ✅ ユーザー削除
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params; // IDはstringとして扱う
        console.log(`ユーザー削除リクエスト: ID=${id}`);
        // ユーザー存在確認
        const existingUser: any = await db.query.users.findFirst({
            where: eq(users.id, id)
        });
        if (!existingUser) {
            console.log(`削除対象ユーザーが見つかりません: ID=${id}`);
            return res.status(404).json({ message: "ユーザーが見つかりません" });
        }
        // ユーザー削除
        await db.delete(users).where(eq(users.id, id));
        console.log(`ユーザー削除成功: ID=${id}`);
        res.json({ message: "ユーザーが削除されました" });
    }
    catch (error) {
        console.error("Error deleting user:", error);
        return res.status(500).json({ message: "ユーザー削除中にエラーが発生しました" });
    }
});
export const usersRouter: any = router;
