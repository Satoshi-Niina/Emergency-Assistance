"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
export const authenticateToken: any = void 0;
var authenticateToken = function (req, res, next) {
    // 開発環境でのヘルスチェックやテスト用エンドポイントは認証をスキップ
    var skipAuthPaths = ['/api/health', '/api/test', '/api/chatgpt'];
    if (skipAuthPaths.some(function (path) { return req.path.startsWith(path); })) {
        console.log("\uD83D\uDD13 \u8A8D\u8A3C\u3092\u30B9\u30AD\u30C3\u30D7: ".concat(req.path));
        return next();
    }
    // セッションチェック
    if (!req.session || !req.session.userId) {
        console.log("\uD83D\uDEAB \u8A8D\u8A3C\u5931\u6557: \u30BB\u30C3\u30B7\u30E7\u30F3\u306A\u3057 - ".concat(req.path));
        return res.status(401).json({
            success: false,
            error: 'セッションが無効です。再度ログインしてください。',
            message: 'Not authenticated'
        });
    }
    console.log("\u2705 \u8A8D\u8A3C\u6210\u529F: \u30E6\u30FC\u30B6\u30FCID ".concat(req.session.userId, " - ").concat(req.path));
    next();
};
export const authenticateToken: any = authenticateToken;
