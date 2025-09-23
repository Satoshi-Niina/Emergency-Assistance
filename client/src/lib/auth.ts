import { apiRequest } from './queryClient';
import { AUTH_API } from './api/config';
import { apiFetch } from '../api/apiClient';

interface LoginCredentials {
  username: string;
  password: string;
}

// 明示的なAPI関数（credentials: 'include' を保証）
export async function loginApi(login: string, password: string) {
  const response = await apiFetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ login, password })
  });
  
    // Store token if received (SWA環境ではlocalStorageを使用)
    if (response.token || response.accessToken) {
      const token = response.token || response.accessToken;
      sessionStorage.setItem('token', token);
      localStorage.setItem('accessToken', token);
      console.info('[auth] token saved:', !!token);
    }
  
  return response;
}

export async function meApi() {
  return apiFetch('/api/auth/me', {
    method: 'GET',
    credentials: 'include',
    headers: { 'Accept': 'application/json' }
  });
}

export async function logoutApi() {
  // Clear token from sessionStorage
  sessionStorage.removeItem('token');
  
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
    
    // Store token if received (SWA環境ではlocalStorageを使用)
    if (userData.token || userData.accessToken) {
      const token = userData.token || userData.accessToken;
      sessionStorage.setItem('token', token);
      localStorage.setItem('accessToken', token);
      console.info('[auth] token saved:', !!token);
    }
    
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
    
    // Clear token from sessionStorage
    sessionStorage.removeItem('token');
    
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

// Export aliases for compatibility with auth-context
export const authLogin = login;
export const authLogout = logout;

// 初回アクセスで自動判定（Cookieプローブ）→ Safari 等は自動で Bearer、同一ドメイン時は Cookie を優先。401は自動再発行で復帰。手動操作不要。

// 認証モード自動切替
export const negotiateAuthMode = async (): Promise<'cookie' | 'token'> => {
  try {
    // 1. サーバ設定ヒントを取得
    const handshake = await apiFetch('/api/auth/handshake');
    
    if (handshake.firstParty) {
      // 同一ドメインの場合はCookieを優先
      sessionStorage.setItem('AUTH_MODE', 'cookie');
      return 'cookie';
    }
    
    // 2. クロスサイトの場合はCookieプローブを実施
    try {
      await apiFetch('/api/auth/cookie-probe', {
        method: 'POST',
        credentials: 'include'
      });
      
      const probeResult = await apiFetch('/api/auth/cookie-probe-check');
      
      const mode = probeResult.cookieOk ? 'cookie' : 'token';
      sessionStorage.setItem('AUTH_MODE', mode);
      
      console.log(`🔧 認証モード自動切替: ${mode} (cookieOk: ${probeResult.cookieOk})`);
      return mode;
    } catch (probeError) {
      // Cookieプローブが404/5xxの場合はトークンモードにフォールバック
      console.error('Cookieプローブエラー:', probeError);
      sessionStorage.setItem('AUTH_MODE', 'token');
      return 'token';
    }
  } catch (error) {
    console.error('認証モード切替エラー:', error);
    // handshakeが404/5xxの場合はトークンモードにフォールバック
    sessionStorage.setItem('AUTH_MODE', 'token');
    return 'token';
  }
};

// トークンリフレッシュ
export const refreshToken = async (): Promise<string | null> => {
  try {
    const response = await apiFetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include'
    });
    
    if (response.token) {
      sessionStorage.setItem('token', response.token);
      return response.token;
    }
    
    return null;
  } catch (error) {
    console.error('トークンリフレッシュエラー:', error);
    return null;
  }
};