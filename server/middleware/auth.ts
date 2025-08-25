export const authenticateToken = (req: any, res: any, next: any) => {
    console.log(`剥 [隱崎ｨｼ繝√ぉ繝・け] 繝代せ: ${req.path}, 繝｡繧ｽ繝・ラ: ${req.method}, Origin: ${req.headers.origin}`);
    
    // 髢狗匱迺ｰ蠅・〒縺ｮ繝倥Ν繧ｹ繝√ぉ繝・け繧・ユ繧ｹ繝育畑繧ｨ繝ｳ繝峨・繧､繝ｳ繝医・隱崎ｨｼ繧偵せ繧ｭ繝・・
    const skipAuthPaths = ['/api/health', '/api/test', '/api/chatgpt', '/api/auth/login', '/api/auth/logout', '/api/auth/me'];
    if (skipAuthPaths.some(path => req.path.startsWith(path))) {
        console.log(`箔 隱崎ｨｼ繧偵せ繧ｭ繝・・: ${req.path}`);
        return next();
    }
    
    // OPTIONS繝ｪ繧ｯ繧ｨ繧ｹ繝医・隱崎ｨｼ繧偵せ繧ｭ繝・・
    if (req.method === 'OPTIONS') {
        console.log(`箔 OPTIONS繝ｪ繧ｯ繧ｨ繧ｹ繝医ｒ繧ｹ繧ｭ繝・・: ${req.path}`);
        return next();
    }
    
    // 繧ｻ繝・す繝ｧ繝ｳ繝√ぉ繝・け
    if (!req.session || !req.session.userId) {
        console.log(`圻 [403 Forbidden] 繧ｻ繝・す繝ｧ繝ｳ縺ｪ縺・- 繝代せ: ${req.path}, 繧ｻ繝・す繝ｧ繝ｳ: ${JSON.stringify(req.session)}`);
        return res.status(403).json({
            success: false,
            error: '繧｢繧ｯ繧ｻ繧ｹ縺梧拠蜷ｦ縺輔ｌ縺ｾ縺励◆縲りｪ崎ｨｼ縺悟ｿ・ｦ√〒縺吶・,
            message: 'Forbidden - Authentication required',
            path: req.path,
            method: req.method
        });
    }
    
    console.log(`笨・隱崎ｨｼ謌仙粥: 繝ｦ繝ｼ繧ｶ繝ｼID ${req.session.userId} - ${req.path}`);
    next();
};
