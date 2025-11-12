"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const index_1 = require("../db/index");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const router = express_1.default.Router();
// レート制限設定
const loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15分
    max: 5, // 5回まで
    message: {
        success: false,
        error: 'ログイン試行回数が上限に達しました。15分後に再試行してください。',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: req => {
        // 開発環境では制限を緩和
        return process.env.NODE_ENV === 'development';
    },
});
// パスワード強度検証
function validatePassword(password) {
    if (!password) {
        return { valid: false, message: 'パスワードが必要です' };
    }
    if (password.length < 8) {
        return {
            valid: false,
            message: 'パスワードは8文字以上である必要があります',
        };
    }
    if (password.length > 128) {
        return {
            valid: false,
            message: 'パスワードは128文字以下である必要があります',
        };
    }
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    if (!hasUpperCase) {
        return {
            valid: false,
            message: 'パスワードには大文字が含まれている必要があります',
        };
    }
    if (!hasLowerCase) {
        return {
            valid: false,
            message: 'パスワードには小文字が含まれている必要があります',
        };
    }
    if (!hasNumbers) {
        return {
            valid: false,
            message: 'パスワードには数字が含まれている必要があります',
        };
    }
    if (!hasSpecialChar) {
        return {
            valid: false,
            message: 'パスワードには特殊文字が含まれている必要があります',
        };
    }
    // 一般的なパスワードをチェック
    const commonPasswords = [
        'password',
        '123456',
        '123456789',
        'qwerty',
        'abc123',
        'password123',
        'admin',
        'letmein',
        'welcome',
        'monkey',
    ];
    if (commonPasswords.includes(password.toLowerCase())) {
        return { valid: false, message: '一般的すぎるパスワードは使用できません' };
    }
    return { valid: true };
}
// ユーザー名検証
function validateUsername(username) {
    if (!username) {
        return { valid: false, message: 'ユーザー名が必要です' };
    }
    if (username.length < 3) {
        return {
            valid: false,
            message: 'ユーザー名は3文字以上である必要があります',
        };
    }
    if (username.length > 30) {
        return {
            valid: false,
            message: 'ユーザー名は30文字以下である必要があります',
        };
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return {
            valid: false,
            message: 'ユーザー名は英数字、アンダースコア、ハイフンのみ使用できます',
        };
    }
    return { valid: true };
}
// セキュリティログ
function logSecurityEvent(event, details, req) {
    const logData = {
        event,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        details: {
            ...details,
            // パスワード情報は絶対にログに含めない
            password: '[REDACTED]',
        },
    };
    console.log(`🔒 SECURITY: ${event}`, logData);
}
// セキュアなログインエンドポイント
router.post('/login', loginLimiter, async (req, res) => {
    const startTime = Date.now();
    try {
        const { username, password } = req.body;
        // 入力検証
        const usernameValidation = validateUsername(username);
        if (!usernameValidation.valid) {
            logSecurityEvent('INVALID_USERNAME', { username }, req);
            return res.status(400).json({
                success: false,
                error: usernameValidation.message,
            });
        }
        if (!password) {
            logSecurityEvent('MISSING_PASSWORD', { username }, req);
            return res.status(400).json({
                success: false,
                error: 'パスワードが必要です',
            });
        }
        // データベースからユーザーを検索
        const user = await index_1.db
            .select()
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.username, username))
            .limit(1);
        if (user.length === 0) {
            // セキュリティのため、ユーザーが存在しない場合も同じエラーメッセージ
            // タイミング攻撃を防ぐため、bcrypt.compareを実行
            await bcryptjs_1.default.compare(password, '$2b$10$dummyhash');
            logSecurityEvent('LOGIN_FAILED_USER_NOT_FOUND', { username }, req);
            return res.status(401).json({
                success: false,
                error: 'ユーザー名またはパスワードが違います',
            });
        }
        const foundUser = user[0];
        // パスワード認証（bcryptのみ）
        let isValidPassword = false;
        try {
            isValidPassword = await bcryptjs_1.default.compare(password, foundUser.password);
        }
        catch (error) {
            logSecurityEvent('PASSWORD_VERIFICATION_ERROR', { username, error: error.message }, req);
            return res.status(500).json({
                success: false,
                error: '認証処理中にエラーが発生しました',
            });
        }
        if (!isValidPassword) {
            logSecurityEvent('LOGIN_FAILED_INVALID_PASSWORD', { username }, req);
            return res.status(401).json({
                success: false,
                error: 'ユーザー名またはパスワードが違います',
            });
        }
        // セッションにユーザー情報を保存
        req.session.userId = foundUser.id;
        req.session.userRole = foundUser.role;
        req.session.loginTime = Date.now();
        // セッション保存
        req.session.save(err => {
            if (err) {
                logSecurityEvent('SESSION_SAVE_ERROR', { username, error: err.message }, req);
                return res.status(500).json({
                    success: false,
                    error: 'セッションの保存に失敗しました',
                });
            }
            const loginDuration = Date.now() - startTime;
            logSecurityEvent('LOGIN_SUCCESS', {
                username,
                userId: foundUser.id,
                role: foundUser.role,
                loginDuration,
            }, req);
            // 成功レスポンス（パスワード情報は含めない）
            return res.json({
                success: true,
                message: 'ログインに成功しました',
                user: {
                    id: foundUser.id,
                    username: foundUser.username,
                    displayName: foundUser.displayName || foundUser.username,
                    role: foundUser.role,
                    department: foundUser.department || 'General',
                },
            });
        });
    }
    catch (error) {
        logSecurityEvent('LOGIN_ERROR', { error: error.message }, req);
        return res.status(500).json({
            success: false,
            error: 'サーバーエラーが発生しました',
        });
    }
});
// セキュアなユーザー情報取得
router.get('/me', async (_req, res) => {
    try {
        const userId = req.session?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: '認証されていません',
            });
        }
        const user = await index_1.db
            .select()
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
            .limit(1);
        if (user.length === 0) {
            logSecurityEvent('USER_NOT_FOUND_IN_SESSION', { userId }, req);
            return res.status(401).json({
                success: false,
                error: 'ユーザーが見つかりません',
            });
        }
        const foundUser = user[0];
        return res.json({
            success: true,
            user: {
                id: foundUser.id,
                username: foundUser.username,
                displayName: foundUser.displayName || foundUser.username,
                role: foundUser.role,
                department: foundUser.department || 'General',
            },
        });
    }
    catch (error) {
        logSecurityEvent('GET_USER_ERROR', { error: error.message }, req);
        return res.status(500).json({
            success: false,
            error: 'サーバーエラーが発生しました',
        });
    }
});
// セキュアなログアウト
router.post('/logout', (_req, res) => {
    const username = req.session?.userId ? 'authenticated_user' : 'anonymous';
    req.session.destroy(err => {
        if (err) {
            logSecurityEvent('LOGOUT_ERROR', { username, error: err.message }, req);
            return res.status(500).json({
                success: false,
                error: 'ログアウトに失敗しました',
            });
        }
        logSecurityEvent('LOGOUT_SUCCESS', { username }, req);
        // セッションクッキーをクリア
        res.clearCookie('emergency-assistance-session');
        return res.json({
            success: true,
            message: 'ログアウトしました',
        });
    });
});
exports.default = router;
