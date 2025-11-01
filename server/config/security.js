export const securityConfig = {
    // パスワード設定
    password: {
        minLength: 8,
        maxLength: 128,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        saltRounds: 12, // bcryptのソルトラウンド数
        maxAge: 90 * 24 * 60 * 60 * 1000, // 90日（ミリ秒）
    },
    // セッション設定
    session: {
        maxAge: 24 * 60 * 60 * 1000, // 24時間
        rolling: true,
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    },
    // レート制限設定
    rateLimit: {
        general: {
            windowMs: 15 * 60 * 1000, // 15分
            max: 100, // 100リクエスト
        },
        auth: {
            windowMs: 15 * 60 * 1000, // 15分
            max: 5, // 5回
        },
        strict: {
            windowMs: 15 * 60 * 1000, // 15分
            max: 10, // 10回
        },
    },
    // セキュリティヘッダー設定
    headers: {
        hsts: {
            maxAge: 31536000, // 1年
            includeSubDomains: true,
            preload: true,
        },
        csp: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    // ログ設定
    logging: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        retentionDays: 30,
        logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    },
    // 監視設定
    monitoring: {
        suspiciousLoginAttempts: 5,
        cleanupInterval: 60 * 60 * 1000, // 1時間
        ipBlockDuration: 24 * 60 * 60 * 1000, // 24時間
    },
    // 許可されたオリジン
    allowedOrigins: [
        'http://localhost:5002',
        'http://localhost:5003',
        'http://localhost:5173',
        'https://witty-river-012f39e00.1.azurestaticapps.net',
    ],
    // 環境設定
    environment: {
        isProduction: process.env.NODE_ENV === 'production',
        isDevelopment: process.env.NODE_ENV === 'development',
        isTest: process.env.NODE_ENV === 'test',
    },
};
// セキュリティ設定の検証
export function validateSecurityConfig() {
    const config = securityConfig;
    // パスワード設定の検証
    if (config.password.minLength < 8) {
        throw new Error('Password minimum length must be at least 8');
    }
    if (config.password.saltRounds < 10) {
        throw new Error('Password salt rounds must be at least 10');
    }
    // セッション設定の検証
    if (config.session.maxAge < 60 * 60 * 1000) {
        // 1時間未満は危険
        throw new Error('Session max age must be at least 1 hour');
    }
    // レート制限設定の検証
    if (config.rateLimit.auth.max < 3) {
        throw new Error('Auth rate limit must allow at least 3 attempts');
    }
    console.log('✅ Security configuration validated successfully');
    return true;
}
