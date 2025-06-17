import { apiRequest } from './queryClient';
import { LoginCredentials } from '@shared/schema';

/**
 * Login a user with the provided credentials
 * @param credentials The login credentials
 * @returns User data if login successful
 */
export const login = async (credentials: LoginCredentials) => {
  try {
    console.log('🔐 ログイン試行:', { username: credentials.username });
    
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(credentials)
    });
    
    console.log('📡 レスポンス受信:', { status: response.status, ok: response.ok });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: '認証エラー' }));
      console.error('❌ ログインエラー:', errorData);
      throw new Error(errorData.message || '認証サーバーからのレスポンスエラー');
    }
    
    const userData = await response.json();
    console.log('✅ ログイン成功:', userData);
    return userData;
  } catch (error) {
    console.error('❌ Login error:', error);
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
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
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
    const response = await fetch('/api/auth/me', {
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
