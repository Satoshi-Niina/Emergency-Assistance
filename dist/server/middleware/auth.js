export const authenticateToken = (req, res, next) => {
    // 開発環境でのヘルスチェックやテスト用エンドポイントは認証をスキップ
    const skipAuthPaths = ['/api/health', '/api/test', '/api/chatgpt'];
    if (skipAuthPaths.some(path => req.path.startsWith(path))) {
        console.log(`🔓 認証をスキップ: ${req.path}`);
        return next();
    }
    // セッションチェック
    if (!req.session || !req.session.userId) {
        console.log(`🚫 認証失敗: セッションなし - ${req.path}`);
        return res.status(401).json({
            success: false,
            error: 'セッションが無効です。再度ログインしてください。',
            message: 'Not authenticated'
        });
    }
    console.log(`✅ 認証成功: ユーザーID ${req.session.userId} - ${req.path}`);
    next();
};
