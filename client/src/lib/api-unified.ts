// 統一API設定 - 本番環境とローカル環境を統一的に管理
// 本番環境: Azure Static Web App + APIプロキシ
// ローカル環境: 直接APIサーバー接続

// 環境判定
const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;
const isLocalhost = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
const isAzureStaticWebApp = /\.azurestaticapps\.net$/i.test(window.location.hostname);

// API Base URLの決定
export const API_BASE_URL = (() => {
  // 環境変数が設定されている場合は最優先
  if (import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim() !== '') {
    console.log('✅ 環境変数からAPI_BASE_URLを取得:', import.meta.env.VITE_API_BASE_URL);
    return import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '');
  }

  // Azure Static Web Appの場合でも直接APIサーバーに接続（プロキシの問題を回避）
  if (isAzureStaticWebApp) {
    console.log('✅ Azure Static Web App: 直接APIサーバーに接続（プロキシ問題回避）');
    return 'https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net';
  }

  // ローカル開発環境
  if (isDevelopment && isLocalhost) {
    console.log('✅ ローカル開発環境: localhost:8000を使用');
    return 'http://localhost:8000';
  }

  // 本番環境のデフォルト
  console.log('✅ 本番環境: デフォルトURLを使用');
  return 'https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net';
})();

// APIエンドポイントの構築
export function buildApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // Azure Static Web Appの場合は相対パスでAPIプロキシを使用
  if (isAzureStaticWebApp) {
    return `/api${cleanPath}`;
  }
  
  // その他の場合は絶対URLを使用
  return `${API_BASE_URL}/api${cleanPath}`;
}

// 統一APIリクエスト関数
export async function apiRequest<T = any>(
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

  console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status} ${response.statusText}`, errorText);
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
