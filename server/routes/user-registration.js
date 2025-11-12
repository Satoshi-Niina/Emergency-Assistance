"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const express_validator_1 = require("express-validator");
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
const security_js_1 = require("../middleware/security.js");
const router = express_1.default.Router();
// ユーザー登録のバリデーション
const registerValidation = [
    (0, express_validator_1.body)('username')
        .isLength({ min: 3, max: 30 })
        .withMessage('ユーザー名は3-30文字である必要があります')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('ユーザー名は英数字、アンダースコア、ハイフンのみ使用できます'),
    (0, express_validator_1.body)('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('パスワードは8-128文字である必要があります')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
        .withMessage('パスワードは大文字、小文字、数字、特殊文字を含む必要があります'),
    (0, express_validator_1.body)('displayName')
        .isLength({ min: 1, max: 50 })
        .withMessage('表示名は1-50文字である必要があります')
        .trim()
        .escape(),
    (0, express_validator_1.body)('department')
        .optional()
        .isLength({ max: 100 })
        .withMessage('部署名は100文字以下である必要があります')
        .trim()
        .escape(),
    (0, express_validator_1.body)('role')
        .optional()
        .isIn(['admin', 'employee'])
        .withMessage('権限はadminまたはemployeeである必要があります'),
];
// セキュアなユーザー登録
router.post('/register', security_js_1.strictLimiter, (0, security_js_1.validateInput)(registerValidation), async (req, res) => {
    try {
        const { username, password, displayName, department, role = 'employee', } = req.body;
        // ユーザー名の重複チェック
        const existingUser = await index_js_1.db
            .select()
            .from(schema_js_1.users)
            .where((0, drizzle_orm_1.eq)(schema_js_1.users.username, username))
            .limit(1);
        if (existingUser.length > 0) {
            (0, security_js_1.logSecurityEvent)('REGISTRATION_FAILED_USERNAME_EXISTS', { username }, req);
            return res.status(409).json({
                success: false,
                error: 'このユーザー名は既に使用されています',
            });
        }
        // パスワードのハッシュ化
        const saltRounds = 12; // より高いセキュリティ
        const hashedPassword = await bcrypt_1.default.hash(password, saltRounds);
        // ユーザー作成
        const newUser = await index_js_1.db
            .insert(schema_js_1.users)
            .values({
            username,
            password: hashedPassword,
            displayName,
            department,
            role,
        })
            .returning();
        (0, security_js_1.logSecurityEvent)('USER_REGISTERED', {
            username,
            role,
            userId: newUser[0].id,
        }, req);
        res.status(201).json({
            success: true,
            message: 'ユーザーが正常に作成されました',
            user: {
                id: newUser[0].id,
                username: newUser[0].username,
                displayName: newUser[0].displayName,
                role: newUser[0].role,
                department: newUser[0].department,
            },
        });
    }
    catch (error) {
        (0, security_js_1.logSecurityEvent)('REGISTRATION_ERROR', { error: error.message }, req);
        res.status(500).json({
            success: false,
            error: 'ユーザー登録中にエラーが発生しました',
        });
    }
});
// パスワード変更
const changePasswordValidation = [
    (0, express_validator_1.body)('currentPassword').notEmpty().withMessage('現在のパスワードが必要です'),
    (0, express_validator_1.body)('newPassword')
        .isLength({ min: 8, max: 128 })
        .withMessage('新しいパスワードは8-128文字である必要があります')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
        .withMessage('新しいパスワードは大文字、小文字、数字、特殊文字を含む必要があります'),
];
router.post('/change-password', security_js_1.strictLimiter, (0, security_js_1.validateInput)(changePasswordValidation), async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.session?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: '認証が必要です',
            });
        }
        // 現在のユーザー情報を取得
        const user = await index_js_1.db
            .select()
            .from(schema_js_1.users)
            .where((0, drizzle_orm_1.eq)(schema_js_1.users.id, userId))
            .limit(1);
        if (user.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'ユーザーが見つかりません',
            });
        }
        const foundUser = user[0];
        // 現在のパスワードを確認
        const isCurrentPasswordValid = await bcrypt_1.default.compare(currentPassword, foundUser.password);
        if (!isCurrentPasswordValid) {
            (0, security_js_1.logSecurityEvent)('PASSWORD_CHANGE_FAILED_INVALID_CURRENT', { userId }, req);
            return res.status(400).json({
                success: false,
                error: '現在のパスワードが正しくありません',
            });
        }
        // 新しいパスワードをハッシュ化
        const saltRounds = 12;
        const hashedNewPassword = await bcrypt_1.default.hash(newPassword, saltRounds);
        // パスワードを更新
        await index_js_1.db
            .update(schema_js_1.users)
            .set({ password: hashedNewPassword })
            .where((0, drizzle_orm_1.eq)(schema_js_1.users.id, userId));
        (0, security_js_1.logSecurityEvent)('PASSWORD_CHANGED', { userId }, req);
        res.json({
            success: true,
            message: 'パスワードが正常に変更されました',
        });
    }
    catch (error) {
        (0, security_js_1.logSecurityEvent)('PASSWORD_CHANGE_ERROR', { error: error.message }, req);
        res.status(500).json({
            success: false,
            error: 'パスワード変更中にエラーが発生しました',
        });
    }
});
exports.default = router;
