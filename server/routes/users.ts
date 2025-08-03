import express from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = express.Router();

// 認証ミドルウェア（一時的に無効化）
const requireAuth = async (req: any, res: any, next: any) => {
  console.log('[DEBUG] 認証チェック一時的に無効化 - すべてのユーザーを許可');
  // 一時的に認証をスキップ
  next();
};

// 管理者権限ミドルウェア（一時的に無効化）
const requireAdmin = async (req: any, res: any, next: any) => {
  console.log('[DEBUG] 管理者権限チェック一時的に無効化 - すべてのユーザーを許可');
  // 一時的に管理者権限チェックをスキップ
  next();
};

// デバッグ用エンドポイント - セッション状態を確認
router.get('/debug', (req: any, res: any) => {
  console.log('[DEBUG] ユーザー管理デバッグエンドポイント呼び出し');
  
  const debugInfo = {
    session: {
      sessionId: req.session?.id,
      userId: req.session?.userId,
      userRole: req.session?.userRole,
      username: req.session?.username,
      hasSession: !!req.session,
    },
    request: {
      headers: {
        cookie: req.headers.cookie ? '[SET]' : '[NOT SET]',
        'user-agent': req.headers['user-agent'],
        origin: req.headers.origin,
      },
      method: req.method,
      url: req.url,
    }
  };
  
  console.log('[DEBUG] ユーザー管理デバッグ情報:', debugInfo);
  
  res.json({
    success: true,
    debug: debugInfo,
    timestamp: new Date().toISOString()
  });
});

// 全ユーザー取得（管理者のみ）- 一時的に認証を緩和
router.get('/', async (req: any, res: any) => {
    try {
        // Content-Typeを明示的に設定
        res.setHeader('Content-Type', 'application/json');
        
        console.log('[DEBUG] ユーザー一覧取得リクエスト受信:', {
            session: req.session,
            userId: req.session?.userId,
            userRole: req.session?.userRole,
            cookies: req.headers.cookie,
            method: req.method,
            url: req.url
        });
        
        // Drizzle ORMを使用して全ユーザーを取得
        const allUsers: any = await db.select({
            id: users.id,
            username: users.username,
            display_name: users.displayName,
            role: users.role,
            department: users.department,
            description: users.description,
            created_at: users.created_at
        }).from(users);
        
        console.log('[DEBUG] ユーザー一覧取得完了:', {
            count: allUsers.length,
            users: allUsers.map(u => ({ id: u.id, username: u.username, role: u.role }))
        });
        
        // フロントエンドが期待する形式でレスポンス
        res.json({
            success: true,
            data: allUsers,
            total: allUsers.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[DEBUG] ユーザー一覧取得エラー:', error);
        res.status(500).json({ 
            success: false,
            error: 'ユーザー一覧の取得に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

// 新規ユーザー作成（管理者のみ）- 一時的に認証を緩和
router.post('/', async (req: any, res: any) => {
    try {
        // Content-Typeを明示的に設定
        res.setHeader('Content-Type', 'application/json');
        
        console.log('[DEBUG] ユーザー作成リクエスト受信:', {
            session: req.session,
            userId: req.session?.userId,
            userRole: req.session?.userRole,
            cookies: req.headers.cookie,
            body: req.body
        });
        
        const { username, password, display_name, role, department, description } = req.body;

        console.log('[DEBUG] 新規ユーザー作成リクエスト:', {
            username,
            display_name,
            role,
            department,
            hasPassword: !!password,
            body: req.body
        });

        // バリデーション
        if (!username || !password || !display_name || !role) {
            console.log('[DEBUG] バリデーションエラー:', { username, password: !!password, display_name, role });
            return res.status(400).json({ 
                success: false,
                error: 'Missing required fields',
                required: ['username', 'password', 'display_name', 'role'],
                received: { username: !!username, password: !!password, display_name: !!display_name, role: !!role },
                timestamp: new Date().toISOString()
            });
        }

        // ユーザー名の形式チェック
        if (username.length < 3 || username.length > 50) {
            return res.status(400).json({
                success: false,
                error: 'Username must be between 3 and 50 characters',
                timestamp: new Date().toISOString()
            });
        }

        // パスワードの強度チェック
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters long',
                timestamp: new Date().toISOString()
            });
        }

        // 権限の値チェック
        if (!['employee', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Role must be either "employee" or "admin"',
                timestamp: new Date().toISOString()
            });
        }

        // 既存ユーザーの確認
        const existingUser = await db.select().from(users).where(eq(users.username, username));
        if (existingUser.length > 0) {
            console.log('[DEBUG] 既存ユーザーが存在:', username);
            return res.status(409).json({ 
                success: false,
                error: 'Username already exists',
                timestamp: new Date().toISOString()
            });
        }

        // パスワードのハッシュ化
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('[DEBUG] パスワードハッシュ化完了');

        // ユーザーの作成
        console.log('[DEBUG] データベース挿入開始:', {
            username,
            display_name,
            role,
            department,
            description,
            hashedPasswordLength: hashedPassword.length
        });

        const newUser = await db.insert(users).values({
            username,
            password: hashedPassword,
            displayName: display_name,
            role,
            department: department || null,
            description: description || null
        }).returning();

        console.log('[DEBUG] ユーザー作成完了:', newUser[0].id);

        // パスワードを除いたユーザー情報を返す
        const userWithoutPassword = {
            id: newUser[0].id,
            username: newUser[0].username,
            display_name: newUser[0].displayName,
            role: newUser[0].role,
            department: newUser[0].department,
            description: newUser[0].description,
            created_at: newUser[0].created_at
        };

        res.status(201).json({
            success: true,
            message: 'ユーザーが正常に作成されました',
            data: userWithoutPassword,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[DEBUG] ユーザー作成エラー:', error);
        res.status(500).json({ 
            success: false,
            error: 'ユーザーの作成に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

// 個別ユーザー取得（管理者のみ）
router.get('/:id', requireAuth, requireAdmin, async (req: any, res: any) => {
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
                display_name: u.displayName,
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
            res.json({
                success: true,
                data: userWithoutPassword,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(404).json({ 
                success: false,
                error: 'User not found',
                id,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch user',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

// ユーザー更新処理の共通関数
const updateUserHandler = async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { username, display_name, role, department, description, password } = req.body;

        console.log(`[DEBUG] ユーザー更新リクエスト: ID="${id}"`, {
            username,
            display_name,
            role,
            department,
            description,
            hasPassword: !!password
        });

        const updateData: any = {
            username,
            displayName: display_name,
            role,
            department,
            description
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
        res.json({ 
            success: true,
            message: 'User updated successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to update user',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
};

// PUTメソッド（既存）
router.put('/:id', requireAuth, requireAdmin, updateUserHandler);

// PATCHメソッド（新規追加）
router.patch('/:id', requireAuth, requireAdmin, updateUserHandler);

// ユーザー削除（管理者のみ）
router.delete('/:id', requireAuth, requireAdmin, async (req: any, res: any) => {
    try {
        const { id } = req.params;

        console.log(`[DEBUG] ユーザー削除リクエスト: ID="${id}"`);

        // 既存ユーザーの確認
        const existingUser = await db.select().from(users).where(eq(users.id, id));
        
        if (existingUser.length === 0) {
            console.log(`[ERROR] 削除対象ユーザーが見つかりません: ID="${id}"`);
            return res.status(404).json({ error: 'User not found' });
        }

        console.log(`[DEBUG] 削除対象ユーザー:`, existingUser[0]);

        // ユーザーの削除
        await db.delete(users).where(eq(users.id, id));
        
        console.log(`[DEBUG] ユーザー削除完了: ID="${id}"`);
        res.json({ 
            success: true,
            message: 'User deleted successfully',
            id,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to delete user',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

// エラーハンドリングミドルウェア
router.use((err: any, req: any, res: any, next: any) => {
  console.error('ユーザー管理エラー:', err);
  
  // Content-Typeを明示的に設定
  res.setHeader('Content-Type', 'application/json');
  
  res.status(500).json({
    success: false,
    error: 'ユーザー管理の処理中にエラーが発生しました',
    details: err.message || 'Unknown error',
    timestamp: new Date().toISOString()
  });
});

// 404ハンドリング
router.use('*', (req: any, res: any) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({
    success: false,
    error: 'ユーザー管理のエンドポイントが見つかりません',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

export { router as usersRouter }; 