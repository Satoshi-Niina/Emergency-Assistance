/// API設定 - 統一APIクライアント使用
import { api, getJson, postJson } from '../api';

// 統一APIクライアントを使用するため、このファイルは互換性のため残す
const isProduction =
  import.meta.env.PROD && !window.location.hostname.includes('localhost');
const isDevelopment =
  import.meta.env.DEV || window.location.hostname.includes('localhost');

// Azure環境の検出
const isAzureEnvironment =
  window.location.hostname.includes('azurewebsites.net') ||
  window.location.hostname.includes('azurestaticapps.net') ||
  window.location.hostname.includes('azure.com');

// API Base URLの設定（統一APIクライアントで処理される）
export const API_BASE_URL = (() => {
  // 環境変数が設定されている場合は最優先使用
  if (
    import.meta.env.VITE_API_BASE_URL &&
    import.meta.env.VITE_API_BASE_URL.trim() !== ''
  ) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // 本番環境では常にApp Serviceの絶対URLを使用
  if (isProduction) {
    return 'https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net';
  }

  // 開発環境でも絶対URLを使用（localhost:8081）
  return 'http://localhost:8081';
})();

console.log('🔧 API設定詳細:', {
  isAzureEnvironment,
  isProduction,
  isDevelopment,
  currentHostname: window.location.hostname,
  currentProtocol: window.location.protocol,
  finalApiBaseUrl: API_BASE_URL,
  envVars: {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL, // 使用中: APIのベースURL
    NODE_ENV: import.meta.env.NODE_ENV, // 使用中: 環境判別
    MODE: import.meta.env.MODE, // 使用中: ビルドモード
  },
});

// APIエンドポイントの構築
export const buildApiUrl = (endpoint: string): string => {
  if (!endpoint) return API_BASE_URL;

  // If endpoint is already an absolute URL, return it as-is
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }

  // Avoid double-prefixing when API_BASE_URL and endpoint both start with '/api'
  if (API_BASE_URL === '/api' && endpoint.startsWith('/api')) {
    console.log(`🔗 API URL構築 (no double): ${endpoint} -> ${endpoint}`);
    return endpoint;
  }

  // Normalize slashes between base and endpoint
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${base}${path}`;
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
  hostname: window.location.hostname,
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
    MODE: import.meta.env.MODE,
  },
});

// 認証APIエンドポイント（統一APIクライアント使用）
export const AUTH_API = {
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',
  // デバッグ用テストエンドポイント
  TEST: '/healthz',
};

// ナレッジベースAPIエンドポイント（統一APIクライアント使用）
export const KNOWLEDGE_API = {
  BASE: '/knowledge-base',
  GPT_DATA: '/knowledge-base/gpt/data',
  FUSE_IMAGES: '/knowledge-base/fuse/images',
  TROUBLESHOOTING_FLOWS: '/flows',
  SHARED_DATA: (type: string) => `/knowledge-base/shared/${type}`,
  IMAGES: (category: string, filename: string) =>
    `/knowledge-base/images/${category}/${filename}`,
};

// チャットAPIエンドポイント（統一APIクライアント使用）
export const CHAT_API = {
  CHATGPT: '/chatgpt',
  HEALTH: '/healthz',
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
    Accept: 'application/json',
    'Cache-Control': 'no-cache',
    'X-Requested-With': 'XMLHttpRequest',
  },
};
