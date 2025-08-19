import * as express from 'express';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as util from 'util';
import { storage } from './storage';

const scryptAsync = util.promisify(crypto.scrypt);

export const authRouter = express.Router();

// ログイン
authRouter.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'ユーザー名とパスワードが必要です' });
        }

        const user = await storage.getUserByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'ユーザーが見つかりません' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'パスワードが正しくありません' });
        }

        // セッションにユーザー情報を保存
        req.session.userId = user.id;
        // req.sessionの型エラーを型アサーションで回避
        (req.session as any).username = user.username;
        (req.session as any).role = user.role;

        console.log('✅ ログイン成功 - セッション情報:', {
            sessionId: req.sessionID,
            userId: req.session.userId,
            username: (req.session as any).username,
            role: (req.session as any).role,
            userAgent: req.headers['user-agent'],
            origin: req.headers.origin,
            ip: req.ip || req.connection.remoteAddress
        });

        res.json({
            success: true,
            message: 'ログイン成功',
            user: {
                id: user.id,
                username: user.username,
                displayName: user.displayName || user.display_name,
                role: user.role,
                department: user.department
            }
        });
    } catch (error) {
        console.error('ログインエラー:', error);
        res.status(500).json({ error: 'ログイン処理中にエラーが発生しました' });
    }
});

// ログアウト
authRouter.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('セッション削除エラー:', err);
            return res.status(500).json({ 
                success: false,
                error: 'ログアウト処理中にエラーが発生しました' 
            });
        }
        res.json({ 
            success: true,
            message: 'ログアウト成功' 
        });
    });
});

// ユーザー登録
authRouter.post('/register', async (req, res) => {
    try {
        const { username, password, display_name, role = 'employee' } = req.body;

        if (!username || !password || !display_name) {
            return res.status(400).json({ 
                success: false,
                error: 'ユーザー名、パスワード、表示名が必要です' 
            });
        }

        // 既存ユーザーの確認
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({ 
                success: false,
                error: 'このユーザー名は既に使用されています' 
            });
        }

        // パスワードのハッシュ化
        const hashedPassword = await bcrypt.hash(password, 10);

        // ユーザーの作成
        const newUser = await storage.createUser({
            username,
            password: hashedPassword,
            display_name,
            role
        });

        res.status(201).json({
            success: true,
            message: 'ユーザー登録成功',
            user: {
                id: newUser.id,
                username: newUser.username,
                displayName: newUser.display_name,
                role: newUser.role
            }
        });
    } catch (error) {
        console.error('ユーザー登録エラー:', error);
        res.status(500).json({ 
            success: false,
            error: 'ユーザー登録処理中にエラーが発生しました' 
        });
    }
});

// セッション確認
authRouter.get('/me', async (req, res) => {
    try {
        if (req.session.userId) {
            // セッションからユーザー情報を取得
            const user = await storage.getUser(req.session.userId);
            if (user) {
                res.json({
                    success: true,
                    isAuthenticated: true,
                    user: {
                        id: user.id,
                        username: user.username,
                        displayName: user.displayName || user.display_name,
                        role: user.role,
                        department: user.department
                    }
                });
            } else {
                // ユーザーが見つからない場合はセッションをクリア
                req.session.destroy(() => {});
                res.status(401).json({ 
                    success: false,
                    isAuthenticated: false,
                    error: 'ユーザーが見つかりません'
                });
            }
        } else {
            res.status(401).json({ 
                success: false,
                isAuthenticated: false,
                error: '認証が必要です'
            });
        }
    } catch (error) {
        console.error('セッション確認エラー:', error);
        res.status(500).json({ 
            success: false,
            isAuthenticated: false,
            error: 'セッション確認中にエラーが発生しました'
        });
    }
});

// 従来のsessionエンドポイントも残す（互換性のため）
authRouter.get('/session', (req, res) => {
    if (req.session.userId) {
        res.json({
            isAuthenticated: true,
            user: {
                id: req.session.userId,
                username: (req.session as any).username,
                role: (req.session as any).role
            }
        });
    } else {
        res.json({ isAuthenticated: false });
    }
});

// パスワード変更
authRouter.post('/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.session.userId;

        if (!userId) {
            return res.status(401).json({ 
                success: false,
                error: 'ログインが必要です' 
            });
        }

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                success: false,
                error: '現在のパスワードと新しいパスワードが必要です' 
            });
        }

        const user = await storage.getUser(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: 'ユーザーが見つかりません' 
            });
        }

        // 現在のパスワードの確認
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false,
                error: '現在のパスワードが正しくありません' 
            });
        }

        // 新しいパスワードのハッシュ化
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // パスワードの更新
        await storage.updateUser(userId, { password: hashedNewPassword });

        res.json({ 
            success: true,
            message: 'パスワード変更成功' 
        });
    } catch (error) {
        console.error('パスワード変更エラー:', error);
        res.status(500).json({ 
            success: false,
            error: 'パスワード変更処理中にエラーが発生しました' 
        });
    }
});

// Setup auth function for index.build.ts
export const setupAuth = (app: any) => {
    app.use('/api/auth', authRouter);
}; 