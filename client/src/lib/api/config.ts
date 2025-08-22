/// API設宁E
const isProduction = import.meta.env.PROD && !window.location.hostname.includes('localhost');
const isDevelopment = import.meta.env.DEV || window.location.hostname.includes('localhost');

// Replit環墁E�E検�E
const isReplitEnvironment = window.location.hostname.includes('replit.dev') || window.location.hostname.includes('replit.app');

// Azure環墁E�E検�E
const isAzureEnvironment = window.location.hostname.includes('azurewebsites.net') || 
                          window.location.hostname.includes('azure.com') ||
                          window.location.hostname.includes('azurestaticapps.net') ||
                          window.location.hostname.includes('azurecontainerapps.io');

// API Base URLの設宁E
// Azure Static Web Apps環墁E��は冁E��API Functionsを使用
export const API_BASE_URL = (() => {
  console.log('🔍 環墁E��数確誁E', {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_API_BASE_URL_TYPE: typeof import.meta.env.VITE_API_BASE_URL,
    VITE_API_BASE_URL_LENGTH: import.meta.env.VITE_API_BASE_URL?.length,
    NODE_ENV: import.meta.env.NODE_ENV,
    MODE: import.meta.env.MODE
  });
  
  // 開発環墁E��はプロキシ経由でアクセス�E�相対パスを使用�E�E
  if (isDevelopment) {
    console.log('✁E開発環墁E プロキシ経由でアクセス');
    return ''; // 空斁E���Eで相対パスを使用
  }
  
  // Azure Static Web Apps の場合�E冁E��API Functionsを使用
  if (window.location.hostname.includes('azurestaticapps.net')) {
    console.log('✁EAzure Static Web Apps: 冁E��API Functionsを使用');
    return window.location.origin; // 同じドメインのAPI Functionsを使用
  }
  
  // 環墁E��数が設定されてぁE��場合�E優先使用
  if (import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim() !== '') {
    console.log('✁E環墁E��数からAPI_BASE_URLを取征E', import.meta.env.VITE_API_BASE_URL);
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // 本番環墁E�E場吁E
  if (isProduction) {
    if (isAzureEnvironment) {
      // そ�E他�EAzure環墁E�E場合�E外部バックエンドAPIを使用
      return 'https://emergency-backend-app.azurewebsites.net';
    }
    if (isReplitEnvironment) {
      return `${window.location.protocol}//${window.location.hostname.split(':')[0]}:3000`;
    }
    // そ�E他�E本番環墁E
    return window.location.origin;
  }
  
  // チE��ォルチE
  console.log('⚠�E�EチE��ォルト値を使用: 冁E��API Functionsを使用');
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
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL, // 使用中: APIのベ�EスURL
    NODE_ENV: import.meta.env.NODE_ENV, // 使用中: 環墁E��別
    MODE: import.meta.env.MODE // 使用中: ビルドモーチE
  }
});

// APIエンド�Eイント�E構篁E
export const buildApiUrl = (endpoint: string): string => {
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  console.log(`🔗 API URL構篁E ${endpoint} -> ${fullUrl}`);
  return fullUrl;
};

// チE��チE��用�E�環墁E��数の状態を詳細にログ出劁E
console.log('🔍 環墁E��数詳細確誁E', {
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
  // 追加のチE��チE��惁E��
  location: window.location.href,
  origin: window.location.origin,
  hostname: window.location.hostname
});

console.log('🔧 API設宁E', {
  isProduction,
  isDevelopment,
  API_BASE_URL,
  // チE��チE��用�E�実際のリクエスチERLを確誁E
  sampleAuthUrl: buildApiUrl('/api/login'),
  // 追加のチE��チE��惁E��
  location: window.location.href,
  origin: window.location.origin,
  hostname: window.location.hostname,
  protocol: window.location.protocol,
  // 実際のAPI URLを構築して確誁E
  actualAuthUrl: buildApiUrl('/api/login'),
  actualMeUrl: buildApiUrl('/api/auth/me'),
  // 環墁E��数の詳細確誁E
  envVars: {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    NODE_ENV: import.meta.env.NODE_ENV,
    MODE: import.meta.env.MODE
  }
});

// 認証APIエンド�EインチE
export const AUTH_API = {
  LOGIN: buildApiUrl('/api/auth/login'),
  LOGOUT: buildApiUrl('/api/auth/logout'),
  ME: buildApiUrl('/api/auth/me'),
  // チE��チE��用チE��トエンド�EインチE
  TEST: buildApiUrl('/api/health'),
};

// ナレチE��ベ�EスAPIエンド�EインチE
export const KNOWLEDGE_API = {
  BASE: buildApiUrl('/api/knowledge-base'), // 新しいAPI Function
  GPT_DATA: buildApiUrl('/api/knowledge/gpt/data'),
  FUSE_IMAGES: buildApiUrl('/api/knowledge/fuse/images'),
  TROUBLESHOOTING_FLOWS: buildApiUrl('/api/knowledge/troubleshooting/flows'),
  SHARED_DATA: (type: string) => buildApiUrl(`/api/knowledge/shared/${type}`),
  IMAGES: (category: string, filename: string) => buildApiUrl(`/api/knowledge/images/${category}/${filename}`),
};

// チャチE��APIエンド�EインチE
export const CHAT_API = {
  CHATGPT: buildApiUrl('/api/chat'), // 新しいAPI Function
  HEALTH: buildApiUrl('/api/health'),
  CHAT: buildApiUrl('/api/chat'), // 新しいAPI Function
};

// 機種チE�EタAPIエンド�EインチE
export const MACHINE_API = {
  MACHINE_TYPES: buildApiUrl('/api/vehicles'), // 新しいAPI Function
  ALL_MACHINES: buildApiUrl('/api/vehicles'), // 新しいAPI Function
  MACHINE_DETAIL: (id: string) => buildApiUrl(`/api/vehicles?id=${id}`), // 新しいAPI Function
};

// ユーザー管琁EPIエンド�EインチE
export const USER_API = {
  USERS: buildApiUrl('/api/users'),
  USER_DETAIL: (id: string) => buildApiUrl(`/api/users/${id}`),
};

// トラブルシューチE��ングAPIエンド�EインチE
export const TROUBLESHOOTING_API = {
  LIST: buildApiUrl('/api/troubleshooting/list'),
  START_QA: buildApiUrl('/api/troubleshooting-qa/start'),
  ANSWER_QA: buildApiUrl('/api/troubleshooting-qa/answer'),
  KNOWLEDGE_TROUBLESHOOTING: (machineId: string) => buildApiUrl(`/api/knowledge/troubleshooting/${machineId}`),
};

// AI診断APIエンド�EインチE
export const AI_API = {
  DIAGNOSIS: buildApiUrl('/api/ai-diagnosis'),
};

// 設定情報
export const API_CONFIG = {
  isProduction,
  isDevelopment,
  baseUrl: API_BASE_URL,
  timeout: 30000, // 30私E
  retryAttempts: 3,
};

// API リクエスト用のベ�Eスオプション
export const API_REQUEST_OPTIONS = {
  credentials: 'include' as RequestCredentials, // セチE��ョン維持�Eため忁E��E
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
    // 'Cache-Control' ヘッダーを削除してCORSエラーを回避
  }
};
