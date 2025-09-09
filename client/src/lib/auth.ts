import { LoginCredentials } from '@shared/schema';
import { AUTH_API } from './api/config';

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
      
      console.error('❌ ログインエラー:', {
        status: response.status,
        statusText: response.statusText,
        message: errorMessage
      });
      
      // 503エラーの場合は特別なメッセージ
      if (response.status === 503) {
        throw new Error('バックエンドサーバーが利用できません。しばらく待ってから再試行してください。');
      }
      
      throw new Error(errorMessage);
    }
    
    const userData = await response.json();
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
    const apiBaseUrl = 'http://localhost:3001';
    const logoutUrl = `${apiBaseUrl}/api/auth/logout`;
    
    console.log('🔐 ログアウト試行:', logoutUrl);
    
    const response = await fetch(logoutUrl, {
      method: 'POST',
      credentials: 'include'
    });
    
    console.log('📡 ログアウトレスポンス:', { 
      status: response.status, 
      ok: response.ok 
    });
    
    if (!response.ok) {
      throw new Error(`Logout failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
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
    console.log('👤 getCurrentUser called');
    console.log('📡 Request URL:', AUTH_API.ME);
    console.log('🌐 Current location:', {
      origin: window.location.origin,
      hostname: window.location.hostname,
      protocol: window.location.protocol
    });
    
    const response = await fetch(AUTH_API.ME, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    console.log('📡 getCurrentUser response:', {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        console.log('🔓 Not authenticated (401)');
        return null;
      }
      
      console.error('❌ getCurrentUser error:', {
        status: response.status,
        statusText: response.statusText
      });
      throw new Error(`Failed to get current user: ${response.status} ${response.statusText}`);
    }
    
    const userData = await response.json();
    console.log('✅ getCurrentUser success:', userData);
    return userData;
  } catch (error) {
    console.error('❌ getCurrentUser error:', error);
    
    // ネットワークエラーの場合
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('🌐 Network error in getCurrentUser');
      return null;
    }
    
    return null;
  }
};
