/// API設定
const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

// 本番環境では環境変数から取得、開発環境では相対パス
export const API_BASE_URL = isProduction 
  ? (import.meta.env.VITE_API_BASE_URL || 'https://emergency-backend-api.azurewebsites.net')
  : '';

console.log('🔧 API設定:', {
  isProduction,
  isDevelopment,
  API_BASE_URL,
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL
});

// APIエンドポイントの構築
export const buildApiUrl = (endpoint: string): string => {
  if (isProduction) {
    const fullUrl = `${API_BASE_URL}${endpoint}`;
    console.log(`🔗 API URL構築: ${endpoint} -> ${fullUrl}`);
    return fullUrl;
  }
  console.log(`🔗 API URL構築: ${endpoint} -> ${endpoint} (開発環境)`);
  return endpoint; // 開発環境では相対パスを使用
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
