// 統一API設定 - runtime-config対応
// Docker統合環境で動作するAPIクライアント

import { getApiBaseUrl, getRuntimeConfig } from './runtime-config';

// 環境判定
const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;
const isLocalhost = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
const isAzureStaticWebApp = /\.azurestaticapps\.net$/i.test(window.location.hostname);

// API Base URLの決定（runtime-config優先）
export const API_BASE_URL = (() => {
  // まずruntime-configから取得を試行
  try {
    const runtimeConfig = getRuntimeConfig();
    if (runtimeConfig && runtimeConfig.API_BASE_URL) {
      console.log('✅ Runtime configからAPI_BASE_URLを取得:', runtimeConfig.API_BASE_URL);
      return runtimeConfig.API_BASE_URL.replace(/\/$/, '');
    }
  } catch (error) {
    console.warn('⚠️ Runtime config取得エラー:', error);
  }
  
  // 環境変数による設定
  if (import.meta.env.VITE_API_BASE_URL) {
    console.log('✅ 環境変数からAPI_BASE_URLを取得:', import.meta.env.VITE_API_BASE_URL);
    return import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '');
  }
  
  // フォールバック: 環境判定
  if (isLocalhost) {
    console.log('✅ ローカル環境: localhost:8080を使用');
    return 'http://localhost:8080';
  }

  // フォールバック: 本番環境（相対パス）
  console.log('✅ 本番環境: 相対パスを使用');
  return '';
})();

// APIエンドポイントの構築
export function buildApiUrl(path: string): string {
  // パスを正規化（先頭の/を確保）
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // API_BASE_URLを正規化（末尾の/と/apiを除去）
  let baseUrl = API_BASE_URL.replace(/\/$/, '').replace(/\/api$/, '');
  
  // パスが既に/apiで始まっている場合は重複を避ける
  const pathWithoutApi = cleanPath.startsWith('/api/') 
    ? cleanPath.replace(/^\/api/, '') 
    : cleanPath.startsWith('/api')
    ? '/' 
    : cleanPath;
  
  // 最終的なURLを構築（必ず/apiを含める）
  const result = `${baseUrl}/api${pathWithoutApi.startsWith('/') ? pathWithoutApi : '/' + pathWithoutApi}`;
  
  // デバッグログ
  console.log('🔧 buildApiUrl:', {
    originalPath: path,
    cleanPath,
    baseUrl,
    finalUrl: result
  });
  
  return result;
}

// トークン取得関数
function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

// ユーザー管理API専用のリクエスト関数（認証なし）
export async function userApiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = buildApiUrl(path);
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // セッション維持のため必須
    mode: 'cors',
  };

  console.log(`🌐 User API Request (No Auth): ${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ User API Error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ User API Response: ${options.method || 'GET'} ${url}`, data);
    return data;
  } catch (error) {
    console.error(`❌ User API Request Failed: ${options.method || 'GET'} ${url}`, error);
    throw error;
  }
}

// 統一APIリクエスト関数
export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = buildApiUrl(path);
  const token = getAuthToken();
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    credentials: 'include', // セッション維持のため必須
    mode: 'cors',
  };

  console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status} ${response.statusText}`, errorText);
      
      // 401エラーの場合は認証エラーとして処理
      if (response.status === 401) {
        console.log('🔐 認証エラー: トークンをクリア');
        localStorage.removeItem('authToken');
        // 認証エラーの場合は特別なエラーを投げる
        throw new Error('AUTHENTICATION_ERROR');
      }
      
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ API Response: ${options.method || 'GET'} ${url}`, data);
    return data;
  } catch (error) {
    console.error(`❌ API Request Failed: ${options.method || 'GET'} ${url}`, error);
    throw error;
  }
}

// HTTPメソッド別のヘルパー
export const api = {
  get: <T = any>(path: string) => apiRequest<T>(path, { method: 'GET' }),
  post: <T = any>(path: string, data?: any) => 
    apiRequest<T>(path, { 
      method: 'POST', 
      body: data ? JSON.stringify(data) : undefined 
    }),
  put: <T = any>(path: string, data?: any) => 
    apiRequest<T>(path, { 
      method: 'PUT', 
      body: data ? JSON.stringify(data) : undefined 
    }),
  delete: <T = any>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};

// ユーザー管理API専用のヘルパー（認証なし）
export const userApi = {
  get: <T = any>(path: string) => userApiRequest<T>(path, { method: 'GET' }),
  post: <T = any>(path: string, data?: any) => 
    userApiRequest<T>(path, { 
      method: 'POST', 
      body: data ? JSON.stringify(data) : undefined 
    }),
  put: <T = any>(path: string, data?: any) => 
    userApiRequest<T>(path, { 
      method: 'PUT', 
      body: data ? JSON.stringify(data) : undefined 
    }),
  delete: <T = any>(path: string) => userApiRequest<T>(path, { method: 'DELETE' }),
};

// 認証関連API
export const auth = {
  login: (credentials: { username: string; password: string }) =>
    api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
  handshake: () => api.get('/auth/handshake'),
};

// ヘルスチェック
export const health = {
  check: () => api.get('/health'),
  checkz: () => api.get('/healthz'),
  ping: () => api.get('/ping'),
};

// ストレージAPI
export const storage = {
  /** List JSON files with metadata */
  list: (prefix: string) => api.get(`/storage/list?prefix=${encodeURIComponent(prefix)}`),
  /** Get JSON content */
  getJson: (name: string) => api.get(`/storage/json/${encodeURIComponent(name)}`),
  /** Save JSON content with optional ETag */
  putJson: (name: string, data: any, etag?: string) => {
    const headers = etag ? { 'If-Match': etag } : {};
    return apiRequest(`/storage/json/${encodeURIComponent(name)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers
    });
  },
  /** Get image SAS URL */
  getImageUrl: (name: string) => api.get(`/storage/image-url?name=${encodeURIComponent(name)}`),
};

// 設定情報のログ出力
console.log('🔧 統一API設定:', {
  isProduction,
  isDevelopment,
  isLocalhost,
  isAzureStaticWebApp,
  API_BASE_URL,
  hostname: window.location.hostname,
  exampleUrl: buildApiUrl('/health')
});

export default api;
