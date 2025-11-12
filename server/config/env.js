"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnvConfig = getEnvConfig;
exports.safeLen = safeLen;
exports.logEnvConfig = logEnvConfig;
// 環境変数の取得とバリデーション
function getEnvConfig() {
    const config = {
        NODE_ENV: process.env.NODE_ENV || 'development',
        DB_URL: process.env.DATABASE_URL || '',
        SESSION_SECRET: process.env.SESSION_SECRET || 'default-secret-key',
        ALLOW_DUMMY: process.env.ALLOW_DUMMY === 'true',
        FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    };
    // 必須環境変数のチェック
    if (!config.DB_URL) {
        console.warn('⚠️ DATABASE_URL is not set');
    }
    if (!config.SESSION_SECRET ||
        config.SESSION_SECRET === 'default-secret-key') {
        console.warn('⚠️ SESSION_SECRET is not set or using default value');
    }
    return config;
}
// 環境変数の長さを安全に取得する関数
function safeLen(value) {
    return value ? value.length : 0;
}
// 環境変数の設定をログ出力
function logEnvConfig() {
    const config = getEnvConfig();
    console.log('🔧 Environment Configuration:', {
        NODE_ENV: config.NODE_ENV,
        DB_URL_LENGTH: safeLen(config.DB_URL),
        SESSION_SECRET_LENGTH: safeLen(config.SESSION_SECRET),
        ALLOW_DUMMY: config.ALLOW_DUMMY,
        FRONTEND_ORIGIN: config.FRONTEND_ORIGIN,
        OPENAI_API_KEY_LENGTH: safeLen(config.OPENAI_API_KEY),
    });
}
