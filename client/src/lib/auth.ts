import { apiRequest } from './queryClient';
import { LoginCredentials } from '@shared/schema';
import { AUTH_API } from './api/config';

/**
 * Login a user with the provided credentials
 * @param credentials The login credentials
 * @returns User data if login successful
 */
export const login = async (credentials: LoginCredentials) => {
  try {
    console.log('🔐 ログイン試衁E', { username: credentials.username });
    console.log('📡 リクエスチERL:', AUTH_API.LOGIN);
    console.log('🔗 ログインURL:', AUTH_API.LOGIN);
    console.log('📡 リクエスト設宁E', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(credentials)
    });
    
    // リクエスト前のチE��チE��惁E��
    console.log('🌐 現在のlocation:', {
      origin: window.location.origin,
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      port: window.location.port
    });
    
    const response = await fetch(AUTH_API.LOGIN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(credentials)
    });
    
    console.log('📡 ログインレスポンス:', { 
      status: response.status, 
      ok: response.ok 
    });
    
    console.log('📡 レスポンス受信:', { 
      status: response.status, 
      ok: response.ok,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    if (!response.ok) {
      let errorMessage = '認証エラー';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
      } catch (parseError) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      
      console.error('❁Eログインエラー:', {
        status: response.status,
        statusText: response.statusText,
        message: errorMessage
      });
      
      // 503エラーの場合�E特別なメチE��ージ
      if (response.status === 503) {
        throw new Error('バックエンドサーバ�Eが利用できません。しばらく征E��てから再試行してください、E);
      }
      
      throw new Error(errorMessage);
    }
    
    const userData = await response.json();
    console.log('✁Eログイン成功:', userData);
    return userData;
  } catch (error) {
    console.error('❁ELogin error:', error);
    
    // ネットワークエラーの場吁E
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('バックエンドサーバ�Eに接続できません。ネチE��ワーク接続を確認してください、E);
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
    console.log('🔐 ログアウト試衁E', AUTH_API.LOGOUT);
    
    const response = await fetch(AUTH_API.LOGOUT, {
      method: 'POST',
      credentials: 'include'
    });
    
    console.log('📡 ログアウトレスポンス:', { 
      status: response.status, 
      ok: response.ok 
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
    const response = await fetch(AUTH_API.ME, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        return null;
      }
      throw new Error('Failed to get current user');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};
