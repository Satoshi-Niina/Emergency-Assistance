"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_CONFIG = exports.CHAT_API = exports.KNOWLEDGE_API = exports.AUTH_API = exports.buildApiUrl = exports.API_BASE_URL = void 0;
/// API設定
const isProduction = import.meta.env.PROD && !window.location.hostname.includes('localhost');
const isDevelopment = import.meta.env.DEV || window.location.hostname.includes('localhost');
// 本番環境用設定
// 環境変数からAPI URLを取得、なければ相対パスを使用
exports.API_BASE_URL = isProduction
    ? 'https://emergency-backend-e7enc2e8dhdabucv.japanwest-01.azurewebsites.net' // 本番環境では直接バックエンドURLを使用
    : 'http://localhost:3001'; // 開発環境ではローカルバックエンドを使用
// APIエンドポイントの構築（先に定義）
const buildApiUrl = (endpoint) => {
    const fullUrl = `${exports.API_BASE_URL}${endpoint}`;
    console.log(`🔗 API URL構築: ${endpoint} -> ${fullUrl}`);
    return fullUrl;
};
exports.buildApiUrl = buildApiUrl;
// デバッグ用：環境変数の状態を詳細にログ出力
console.log('🔍 環境変数詳細確認:', {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_API_BASE_URL_TYPE: typeof import.meta.env.VITE_API_BASE_URL,
    VITE_API_BASE_URL_LENGTH: import.meta.env.VITE_API_BASE_URL?.length,
    isProduction,
    isDevelopment,
    NODE_ENV: import.meta.env.NODE_ENV,
    MODE: import.meta.env.MODE,
    BASE_URL: import.meta.env.BASE_URL,
    // 実際に使用されるURL
    finalApiBaseUrl: exports.API_BASE_URL
});
console.log('🔧 API設定:', {
    isProduction,
    isDevelopment,
    API_BASE_URL: exports.API_BASE_URL,
    // デバッグ用：実際のリクエストURLを確認
    sampleAuthUrl: (0, exports.buildApiUrl)('/api/login'),
    // 追加のデバッグ情報
    location: window.location.href,
    origin: window.location.origin,
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    // 実際のAPI URLを構築して確認
    actualAuthUrl: (0, exports.buildApiUrl)('/api/login'),
    actualMeUrl: (0, exports.buildApiUrl)('/api/auth/me'),
    // 環境変数の詳細確認
    envVars: {
        VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
        NODE_ENV: import.meta.env.NODE_ENV,
        MODE: import.meta.env.MODE
    }
});
// 認証APIエンドポイント
exports.AUTH_API = {
    LOGIN: (0, exports.buildApiUrl)('/api/auth/login'),
    LOGOUT: (0, exports.buildApiUrl)('/api/auth/logout'),
    ME: (0, exports.buildApiUrl)('/api/auth/me'),
    // デバッグ用テストエンドポイント
    TEST: (0, exports.buildApiUrl)('/api/health'),
};
// ナレッジベースAPIエンドポイント
exports.KNOWLEDGE_API = {
    BASE: (0, exports.buildApiUrl)('/api/knowledge'),
    GPT_DATA: (0, exports.buildApiUrl)('/api/knowledge/gpt/data'),
    FUSE_IMAGES: (0, exports.buildApiUrl)('/api/knowledge/fuse/images'),
    TROUBLESHOOTING_FLOWS: (0, exports.buildApiUrl)('/api/knowledge/troubleshooting/flows'),
    SHARED_DATA: (type) => (0, exports.buildApiUrl)(`/api/knowledge/shared/${type}`),
    IMAGES: (category, filename) => (0, exports.buildApiUrl)(`/api/knowledge/images/${category}/${filename}`),
};
// チャットAPIエンドポイント
exports.CHAT_API = {
    CHATGPT: (0, exports.buildApiUrl)('/api/chatgpt'),
    HEALTH: (0, exports.buildApiUrl)('/api/health'),
};
// 設定情報
exports.API_CONFIG = {
    isProduction,
    isDevelopment,
    baseUrl: exports.API_BASE_URL,
    timeout: 30000, // 30秒
    retryAttempts: 3,
};
