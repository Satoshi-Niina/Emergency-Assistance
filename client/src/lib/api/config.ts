/// API設定
const isProduction = import.meta.env.PROD && !window.location.hostname.includes('localhost');
const isDevelopment = import.meta.env.DEV || window.location.hostname.includes('localhost');

// Replit環境の検出
const isReplitEnvironment = window.location.hostname.includes('replit.dev') || window.location.hostname.includes('replit.app');

// Azure環境の検出
const isAzureEnvironment = window.location.hostname.includes('azurewebsites.net') || 
                          window.location.hostname.includes('azurestaticapps.net') || 
                          window.location.hostname.includes('azure.com');

// API Base URLの設定
// 開発環境ではプロキシ経由でアクセス
export const API_BASE_URL = (() => {
  console.log('🔍 環境変数確認:', {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_API_BASE_URL_TYPE: typeof import.meta.env.VITE_API_BASE_URL,
    VITE_API_BASE_URL_LENGTH: import.meta.env.VITE_API_BASE_URL?.length,
    NODE_ENV: import.meta.env.NODE_ENV,
    MODE: import.meta.env.MODE
  });
  
  // 環境変数が設定されている場合は最優先使用
  if (import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim() !== '') {
    console.log('✅ 環境変数からAPI_BASE_URLを取得:', import.meta.env.VITE_API_BASE_URL);
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // 開発環境ではプロキシ経由でアクセス（相対パスを使用）
  if (isDevelopment) {
    console.log('✅ 開発環境: プロキシ経由でアクセス');
    return ''; // 空文字列で相対パスを使用
  }
  
  // 本番環境の場合
  if (isProduction) {
    if (isAzureEnvironment) {
      // Azure Static Web Apps から Azure App Service への接続
      console.log('✅ Azure本番環境を検出');
      return 'https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net';
    }
    if (isReplitEnvironment) {
      return `${window.location.protocol}//${window.location.hostname.split(':')[0]}:3000`;
    }
    // その他の本番環境
    return window.location.origin;
  }
  
  // デフォルト
  console.log('⚠️ デフォルト値を使用');
  return 'http://localhost:3001';
})();

console.log('🔧 API設定詳細:', {
  isReplitEnvironment,
  isAzureEnvironment,
  isProduction,
  isDevelopment,
  currentHostname: window.location.hostname,
  currentProtocol: window.location.protocol,
  finalApiBaseUrl: API_BASE_URL,
  envVars: {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL, // 使用中: APIのベースURL
    NODE_ENV: import.meta.env.NODE_ENV, // 使用中: 環境判別
    MODE: import.meta.env.MODE // 使用中: ビルドモード
  }
});

// APIエンドポイントの構築
export const buildApiUrl = (endpoint: string): string => {
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  console.log(`🔗 API URL構築: ${endpoint} -> ${fullUrl}`);
  return fullUrl;
};

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
  finalApiBaseUrl: API_BASE_URL,
  // 追加のデバッグ情報
  location: window.location.href,
  origin: window.location.origin,
  hostname: window.location.hostname
});

console.log('🔧 API設定:', {
  isProduction,
  isDevelopment,
  API_BASE_URL,
  // デバッグ用：実際のリクエストURLを確認
  sampleAuthUrl: buildApiUrl('/api/login'),
  // 追加のデバッグ情報
  location: window.location.href,
  origin: window.location.origin,
  hostname: window.location.hostname,
  protocol: window.location.protocol,
  // 実際のAPI URLを構築して確認
  actualAuthUrl: buildApiUrl('/api/login'),
  actualMeUrl: buildApiUrl('/api/auth/me'),
  // 環境変数の詳細確認
  envVars: {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    NODE_ENV: import.meta.env.NODE_ENV,
    MODE: import.meta.env.MODE
  }
});

// 認証APIエンドポイント
export const AUTH_API = {
  LOGIN: buildApiUrl('/api/auth/login'),
  LOGOUT: buildApiUrl('/api/auth/logout'),
  ME: buildApiUrl('/api/auth/me'),
  // デバッグ用テストエンドポイント
  TEST: buildApiUrl('/api/health'),
};

// ナレッジベースAPIエンドポイント
export const KNOWLEDGE_API = {
  BASE: buildApiUrl('/api/knowledge-base'),
  GPT_DATA: buildApiUrl('/api/knowledge-base/gpt/data'),
  FUSE_IMAGES: buildApiUrl('/api/knowledge-base/fuse/images'),
  TROUBLESHOOTING_FLOWS: buildApiUrl('/api/flows'),
  SHARED_DATA: (type: string) => buildApiUrl(`/api/knowledge-base/shared/${type}`),
  IMAGES: (category: string, filename: string) => buildApiUrl(`/api/knowledge-base/images/${category}/${filename}`),
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

// API リクエスト用のベースオプション
export const API_REQUEST_OPTIONS = {
  credentials: 'include' as RequestCredentials, // セッション維持のため必須
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Cache-Control': 'no-cache',
    'X-Requested-With': 'XMLHttpRequest'
  }
};