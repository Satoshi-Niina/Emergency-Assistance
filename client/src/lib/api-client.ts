// 統一APIクライアント
import { buildApiUrl } from './api-config';

// リクエストのデフォルト設定
const defaultHeaders = {
  'Content-Type': 'application/json',
};

// 認証トークンを取得
function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

// 認証ヘッダーを構築
function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
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
      ...defaultHeaders,
      ...getAuthHeaders(),
      ...options.headers,
    },
    credentials: 'include', // クッキーを含める
  };

  console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ API Response: ${options.method || 'GET'} ${url}`, data);
    return data;
  } catch (error) {
    console.error(`❌ API Request Failed: ${options.method || 'GET'} ${url}`, error);
    throw error;
  }
}

// 便利なメソッド
export const api = {
  get: <T = any>(path: string) => apiRequest<T>(path, { method: 'GET' }),
  post: <T = any>(path: string, data?: any) => 
    apiRequest<T>(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  put: <T = any>(path: string, data?: any) => 
    apiRequest<T>(path, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
  delete: <T = any>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};

// ヘルスチェック
export async function checkApiHealth(): Promise<boolean> {
  try {
    await api.get('/health');
    return true;
  } catch (error) {
    console.error('❌ API Health Check Failed:', error);
    return false;
  }
}

// 認証関連
export const auth = {
  login: (credentials: { username: string; password: string }) =>
    api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  register: (userData: { username: string; password: string; email?: string }) =>
    api.post('/auth/register', userData),
  getCurrentUser: () => api.get('/auth/me'),
};

// ユーザー関連
export const users = {
  getAll: () => api.get('/users'),
  getById: (id: string) => api.get(`/users/${id}`),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

// ナレッジベース関連
export const knowledge = {
  search: (query: string) => api.get(`/knowledge/search?q=${encodeURIComponent(query)}`),
  getDocuments: () => api.get('/knowledge/documents'),
  uploadDocument: (formData: FormData) => 
    apiRequest('/knowledge/upload', { method: 'POST', body: formData, headers: {} }),
};

export default api;
