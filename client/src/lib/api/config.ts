/// API設定
const isProduction = import.meta.env.PROD && !window.location.hostname.includes('localhost');
const isDevelopment = import.meta.env.DEV || window.location.hostname.includes('localhost');

// Replit環境の検出
const isReplitEnvironment = window.location.hostname.includes('replit.dev') || window.location.hostname.includes('replit.app');

// Azure環境の検出
const isAzureEnvironment = window.location.hostname.includes('azurewebsites.net') || 
                          window.location.hostname.includes('azure.com') ||
                          window.location.hostname.includes('azurestaticapps.net') ||
                          window.location.hostname.includes('azurecontainerapps.io');

// API Base URLの設定
// Azure Static Web Apps環境では内部API Functionsを使用
export const API_BASE_URL = (() => {
  console.log('🔍 環境変数確認:', {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_API_BASE_URL_TYPE: typeof import.meta.env.VITE_API_BASE_URL,
    VITE_API_BASE_URL_LENGTH: import.meta.env.VITE_API_BASE_URL?.length,
    NODE_ENV: import.meta.env.NODE_ENV,
    MODE: import.meta.env.MODE
  });
  
  // 開発環境ではプロキシ経由でアクセス（相対パスを使用）
  if (isDevelopment) {
    console.log('✅ 開発環境: プロキシ経由でアクセス');
    return ''; // 空文字列で相対パスを使用
  }
  
  // Azure Static Web Apps の場合は内部API Functionsを使用
  if (window.location.hostname.includes('azurestaticapps.net')) {
    console.log('✅ Azure Static Web Apps: 内部API Functionsを使用');
    return window.location.origin; // 同じドメインのAPI Functionsを使用
  }
  
  // 環境変数が設定されている場合は優先使用
  if (import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim() !== '') {
    console.log('✅ 環境変数からAPI_BASE_URLを取得:', import.meta.env.VITE_API_BASE_URL);
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // 本番環境の場合
  if (isProduction) {
    if (isAzureEnvironment) {
      // その他のAzure環境の場合は外部バックエンドAPIを使用
      return 'https://emergency-backend-app.azurewebsites.net';
    }
    if (isReplitEnvironment) {
      return `${window.location.protocol}//${window.location.hostname.split(':')[0]}:3000`;
    }
    // その他の本番環境
    return window.location.origin;
  }
  
  // デフォルト
  console.log('⚠️ デフォルト値を使用: 内部API Functionsを使用');
  return window.location.origin;
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
  BASE: buildApiUrl('/api/knowledge-base'), // 新しいAPI Function
  GPT_DATA: buildApiUrl('/api/knowledge/gpt/data'),
  FUSE_IMAGES: buildApiUrl('/api/knowledge/fuse/images'),
  TROUBLESHOOTING_FLOWS: buildApiUrl('/api/knowledge/troubleshooting/flows'),
  SHARED_DATA: (type: string) => buildApiUrl(`/api/knowledge/shared/${type}`),
  IMAGES: (category: string, filename: string) => buildApiUrl(`/api/knowledge/images/${category}/${filename}`),
};

// チャットAPIエンドポイント
export const CHAT_API = {
  CHATGPT: buildApiUrl('/api/chat'), // 新しいAPI Function
  HEALTH: buildApiUrl('/api/health'),
  CHAT: buildApiUrl('/api/chat'), // 新しいAPI Function
};

// 機種データAPIエンドポイント
export const MACHINE_API = {
  MACHINE_TYPES: buildApiUrl('/api/vehicles'), // 新しいAPI Function
  ALL_MACHINES: buildApiUrl('/api/vehicles'), // 新しいAPI Function
  MACHINE_DETAIL: (id: string) => buildApiUrl(`/api/vehicles?id=${id}`), // 新しいAPI Function
};

// ユーザー管理APIエンドポイント
export const USER_API = {
  USERS: buildApiUrl('/api/users'),
  USER_DETAIL: (id: string) => buildApiUrl(`/api/users/${id}`),
};

// トラブルシューティングAPIエンドポイント
export const TROUBLESHOOTING_API = {
  LIST: buildApiUrl('/api/troubleshooting/list'),
  START_QA: buildApiUrl('/api/troubleshooting-qa/start'),
  ANSWER_QA: buildApiUrl('/api/troubleshooting-qa/answer'),
  KNOWLEDGE_TROUBLESHOOTING: (machineId: string) => buildApiUrl(`/api/knowledge/troubleshooting/${machineId}`),
};

// AI診断APIエンドポイント
export const AI_API = {
  DIAGNOSIS: buildApiUrl('/api/ai-diagnosis'),
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
    'X-Requested-With': 'XMLHttpRequest'
    // 'Cache-Control' ヘッダーを削除してCORSエラーを回避
  }
};