import { apiRequest } from './queryClient';
import { LoginCredentials } from '@shared/schema';
import { AUTH_API } from './api/config';
import { apiFetch } from '../api/apiClient';

// 明示的なAPI関数（credentials: 'include' を保証）
export async function loginApi(login: string, password: string) {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ login, password })
  });
}

export async function meApi() {
  return apiFetch('/api/auth/me', {
    method: 'GET',
    credentials: 'include',
    headers: { 'Accept': 'application/json' }
  });
}

export async function logoutApi() {
  return apiFetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Accept': 'application/json' }
  });
}

/**
 * Login a user with the provided credentials
 * @param credentials The login credentials
 * @returns User data if login successful
 */
export const login = async (credentials: LoginCredentials) => {
  try {
    console.log('🔐 ログイン試行:', { username: credentials.username });
    console.log('📡 リクエストURL:', AUTH_API.LOGIN);
    console.log('🔗 ログインURL:', AUTH_API.LOGIN);
    console.log('📡 リクエスト設定:', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(credentials)
    });
    
    // リクエスト前のデバッグ情報
    console.log('🌐 現在のlocation:', {
      origin: window.location.origin,
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      port: window.location.port
    });
    
    const userData = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    
    console.log('📡 ログイン成功:', userData);
    console.log('✅ ログイン成功:', userData);
    return userData;
  } catch (error) {
    console.error('❌ Login error:', error);
    
    // ネットワークエラーの場合
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('バックエンドサーバーに接続できません。ネットワーク接続を確認してください。');
    }
    
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('ログインに失敗しました');
  }
};

/**
 * Logout the current user
 */
export const logout = async () => {
  try {
    console.log('🔐 ログアウト試行');
    
    await apiFetch('/api/auth/logout', {
      method: 'POST'
    });
  } catch (error) {
    console.error('Logout error:', error);
    throw new Error('ログアウトに失敗しました');
  }
};

/**
 * Get the current logged-in user
 * @returns User data or null if not logged in
 */
export const getCurrentUser = async () => {
  try {
    console.log('🔍 getCurrentUser リクエスト');
    
    const data = await apiFetch('/api/auth/me');
    console.log('🔍 getCurrentUser データ:', data);
    return data;
  } catch (error) {
    console.error('❌ Get current user error:', error);
    if (error instanceof Error && error.message.includes('401')) {
      console.log('❌ 認証されていません (401)');
      return null;
    }
    return null;
  }
};
