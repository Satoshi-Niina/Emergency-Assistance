/// API設定
const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

// 環境変数VITE_API_BASE_URLを優先的に使用
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (isProduction 
  ? 'https://emergency-backend-api.azurewebsites.net'  // 直接バックエンドにアクセス
  : 'http://localhost:3001');

console.log('🔧 API設定:', {
  isProduction,
  isDevelopment,
  API_BASE_URL,
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  // デバッグ用：実際のリクエストURLを確認
  sampleAuthUrl: isProduction ? `${API_BASE_URL}/api/auth/login` : '/api/auth/login',
  // 追加のデバッグ情報
  location: window.location.href,
  origin: window.location.origin,
  hostname: window.location.hostname,
  protocol: window.location.protocol,
  // 実際のAPI URLを構築して確認
  actualAuthUrl: buildApiUrl('/api/auth/login'),
  actualMeUrl: buildApiUrl('/api/auth/me'),
  // 環境変数の詳細確認
  envVars: {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    NODE_ENV: import.meta.env.NODE_ENV,
    MODE: import.meta.env.MODE
  }
});

// APIエンドポイントの構築
export const buildApiUrl = (endpoint: string): string => {
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  console.log(`🔗 API URL構築: ${endpoint} -> ${fullUrl}`);
  return fullUrl;
};

// 認証APIエンドポイント
export const AUTH_API = {
  LOGIN: buildApiUrl('/api/auth/login'),
  LOGOUT: buildApiUrl('/api/auth/logout'),
  ME: buildApiUrl('/api/auth/me'),
};

// ナレッジベースAPIエンドポイント
export const KNOWLEDGE_API = {
  BASE: buildApiUrl('/api/knowledge'),
  GPT_DATA: buildApiUrl('/api/knowledge/gpt/data'),
  FUSE_IMAGES: buildApiUrl('/api/knowledge/fuse/images'),
  TROUBLESHOOTING_FLOWS: buildApiUrl('/api/knowledge/troubleshooting/flows'),
  SHARED_DATA: (type: string) => buildApiUrl(`/api/knowledge/shared/${type}`),
  IMAGES: (category: string, filename: string) => buildApiUrl(`/api/knowledge/images/${category}/${filename}`),
};

// チャットAPIエンドポイント
export const CHAT_API = {
  CHATGPT: buildApiUrl('/api/chatgpt'),
  HEALTH: buildApiUrl('/api/health'),
};

// 設定情報
export const API_CONFIG = {
  isProduction,
  isDevelopment,
  baseUrl: API_BASE_URL,
  timeout: 30000, // 30秒
  retryAttempts: 3,
};
