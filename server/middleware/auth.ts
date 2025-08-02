export const authenticateToken = (req: any, res: any, next: any) => {
    console.log(`🔍 [認証チェック] パス: ${req.path}, メソッド: ${req.method}, Origin: ${req.headers.origin}`);
    
    // 開発環境でのヘルスチェックやテスト用エンドポイントは認証をスキップ
    const skipAuthPaths = ['/api/health', '/api/test', '/api/chatgpt', '/api/auth/login', '/api/auth/logout', '/api/auth/me'];
    if (skipAuthPaths.some(path => req.path.startsWith(path))) {
        console.log(`🔓 認証をスキップ: ${req.path}`);
        return next();
    }
    
    // OPTIONSリクエストは認証をスキップ
    if (req.method === 'OPTIONS') {
        console.log(`🔓 OPTIONSリクエストをスキップ: ${req.path}`);
        return next();
    }
    
    // セッションチェック
    if (!req.session || !req.session.userId) {
        console.log(`🚫 [403 Forbidden] セッションなし - パス: ${req.path}, セッション: ${JSON.stringify(req.session)}`);
        return res.status(403).json({
            success: false,
            error: 'アクセスが拒否されました。認証が必要です。',
            message: 'Forbidden - Authentication required',
            path: req.path,
            method: req.method
        });
    }
    
    console.log(`✅ 認証成功: ユーザーID ${req.session.userId} - ${req.path}`);
    next();
};
