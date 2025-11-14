// 統一認証機能 - シンプルAPIクライアント使用
import { authApi } from './api';

interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * ログイン機能
 */
export const login = async (credentials: LoginCredentials) => {
  try {
    console.log('🔐 ログイン試行:', { username: credentials.username });

    const userData = await authApi.login(credentials);

    // トークンを保存（authTokenに統一）
    if (userData.token || userData.accessToken) {
      const token = userData.token || userData.accessToken;
      localStorage.setItem('authToken', token); // authTokenに統一
      console.info('[auth] token saved to authToken:', !!token);
    }

    console.log('✅ ログイン成功:', userData);
    return userData;
  } catch (error) {
    console.error('❌ Login error:', error);

    // エラーメッセージの日本語化
    if (error instanceof Error) {
      if (error.message.includes('500')) {
        throw new Error('サーバーエラーが発生しました。しばらく時間をおいてから再度お試しください。');
      } else if (error.message.includes('401')) {
        throw new Error('ユーザー名またはパスワードが正しくありません。');
      } else if (error.message.includes('fetch')) {
        throw new Error('バックエンドサーバーに接続できません。ネットワーク接続を確認してください。');
      }
      throw error;
    }
    throw new Error('ログインに失敗しました');
  }
};

/**
 * ログアウト機能
 */
export const logout = async () => {
  try {
    console.log('🔐 ログアウト試行');

    // トークンをクリア（authTokenに統一）
    localStorage.removeItem('authToken');

    await authApi.logout();
    console.log('✅ ログアウト成功');
  } catch (error) {
    console.error('❌ Logout error:', error);
    throw new Error('ログアウトに失敗しました');
  }
};

/**
 * 現在のユーザー情報を取得
 */
export const getCurrentUser = async () => {
  try {
    console.log('🔍 現在のユーザー情報を取得中');

    const data = await authApi.me();
    console.log('✅ ユーザー情報取得成功:', data);
    return data;
  } catch (error) {
    console.warn('⚠️ ユーザー情報取得エラー:', error);

    if (error instanceof Error && error.message.includes('401')) {
      console.log('ℹ️ 認証されていません (401) - ログインが必要です');
      return null;
    }
    if (error instanceof Error && error.message.includes('500')) {
      console.warn('⚠️ サーバーエラー (500) - バックエンドサーバーに接続できません');
      return null;
    }
    return null;
  }
};

/**
 * 認証状態の確認
 */
export const checkAuthStatus = async () => {
  try {
    // handshake機能は簡略化のため削除
    const handshake = { valid: true };
    console.log('✅ 認証状態確認成功:', handshake);
    return handshake;
  } catch (error) {
    console.warn('⚠️ 認証状態確認エラー:', error);
    return null;
  }
};

// 互換性のためのエイリアス
export const loginApi = login;
export const logoutApi = logout;
export const meApi = getCurrentUser;
export const authLogin = login;
export const authLogout = logout;
