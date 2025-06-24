"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
var express_1 = require("express");
var bcrypt_1 = require("bcrypt");
var schema_1 = require("../db/schema");
var db_1 = require("../db");
var drizzle_orm_1 = require("drizzle-orm");
var logger_1 = require("../lib/logger");
var router = (0, express_1.Router)();
// ログイン
router.post('/login', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, username, password, dbError_1, user, isValidPassword, responseData, error_1;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 7, , 8]);
                console.log('🔐 ログインリクエスト受信:', {
                    body: req.body,
                    hasSession: !!req.session,
                    headers: req.headers['content-type']
                });
                _a = req.body, username = _a.username, password = _a.password;
                (0, logger_1.logInfo)("\u30ED\u30B0\u30A4\u30F3\u8A66\u884C: ".concat(username));
                if (!username || !password) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            message: 'ユーザー名とパスワードが必要です'
                        })];
                }
                // データベース接続確認
                console.log('🔍 データベース接続状況を確認中...');
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                // 簡単な接続テスト
                return [4 /*yield*/, db_1.db.select().from(schema_1.users).limit(1)];
            case 2:
                // 簡単な接続テスト
                _c.sent();
                console.log('✅ データベース接続正常');
                return [3 /*break*/, 4];
            case 3:
                dbError_1 = _c.sent();
                console.error('❌ データベース接続エラー:', dbError_1);
                throw new Error('データベースに接続できません');
            case 4:
                // ユーザー検索
                console.log('🔍 データベースからユーザー検索中:', username);
                return [4 /*yield*/, db_1.db.query.users.findFirst({
                        where: (0, drizzle_orm_1.eq)(schema_1.users.username, username)
                    })];
            case 5:
                user = _c.sent();
                console.log('📊 ユーザー検索結果:', user ? 'ユーザー見つかりました' : 'ユーザーが見つかりません');
                if (!user) {
                    (0, logger_1.logError)("\u30E6\u30FC\u30B6\u30FC\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093: ".concat(username));
                    return [2 /*return*/, res.status(401).json({
                            success: false,
                            message: 'ユーザー名またはパスワードが正しくありません'
                        })];
                }
                // パスワード検証
                console.log('🔐 パスワード検証中...');
                return [4 /*yield*/, bcrypt_1.default.compare(password, user.password)];
            case 6:
                isValidPassword = _c.sent();
                console.log('📊 パスワード検証結果:', isValidPassword ? '✅ 正しい' : '❌ 間違い');
                if (!isValidPassword) {
                    (0, logger_1.logError)("\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093: ".concat(username));
                    return [2 /*return*/, res.status(401).json({
                            success: false,
                            message: 'ユーザー名またはパスワードが正しくありません'
                        })];
                }
                // セッション設定
                req.session.userId = user.id.toString();
                // req.session.username = user.username;
                req.session.userRole = user.role;
                console.log('✅ セッション設定完了:', {
                    userId: req.session.userId,
                    // username: req.session.username,
                    role: req.session.userRole
                });
                (0, logger_1.logInfo)("\u30ED\u30B0\u30A4\u30F3\u6210\u529F: ".concat(username, " (").concat(user.role, ")"));
                responseData = {
                    success: true,
                    user: {
                        id: user.id,
                        username: user.username,
                        display_name: user.display_name || user.username,
                        role: user.role,
                        department: user.department
                    }
                };
                console.log('📤 ログインレスポンス:', responseData);
                // レスポンス送信前にセッション状態を確認
                console.log('🔍 セッション最終確認:', {
                    sessionExists: !!req.session,
                    userId: (_b = req.session) === null || _b === void 0 ? void 0 : _b.userId,
                    // username: req.session?.username
                });
                res.json(responseData.user);
                return [3 /*break*/, 8];
            case 7:
                error_1 = _c.sent();
                (0, logger_1.logError)('ログインエラー:', error_1);
                res.status(500).json({
                    success: false,
                    message: 'サーバーエラーが発生しました',
                    error: process.env.NODE_ENV === 'development' ? error_1.message : undefined
                });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
// ログアウト
router.post('/logout', function (req, res) {
    try {
        req.session.destroy(function (err) {
            if (err) {
                (0, logger_1.logError)('ログアウトエラー:', err);
                return res.status(500).json({
                    success: false,
                    message: 'ログアウトに失敗しました'
                });
            }
            res.clearCookie('connect.sid');
            res.json({
                success: true,
                message: 'ログアウトしました'
            });
        });
    }
    catch (error) {
        (0, logger_1.logError)('ログアウトエラー:', error);
        res.status(500).json({
            success: false,
            message: 'サーバーエラーが発生しました'
        });
    }
});
// 現在のユーザー情報取得
router.get('/me', function (req, res) {
    var _a, _b;
    try {
        console.log('🔍 認証チェック - セッション状態:', {
            hasSession: !!req.session,
            userId: (_a = req.session) === null || _a === void 0 ? void 0 : _a.userId,
            // username: req.session?.username,
            role: (_b = req.session) === null || _b === void 0 ? void 0 : _b.userRole
        });
        if (!req.session || !req.session.userId) {
            console.log('❌ 認証失敗 - セッションまたはユーザーIDなし');
            return res.status(401).json({
                success: false,
                message: '認証されていません'
            });
        }
        var userData = {
            id: req.session.userId,
            // username: req.session.username,
            // display_name: req.session.username,
            role: req.session.userRole,
            // department: req.session.userDepartment || null
        };
        console.log('📤 認証成功 - ユーザー情報:', userData);
        res.json(userData);
    }
    catch (error) {
        console.error('❌ ユーザー情報取得エラー:', error);
        (0, logger_1.logError)('ユーザー情報取得エラー:', error);
        res.status(500).json({
            success: false,
            message: 'サーバーエラーが発生しました',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
exports.authRouter = router;
