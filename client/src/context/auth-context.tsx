

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { login as authLogin, logout as authLogout, getCurrentUser } from '../lib/auth';

interface User {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'employee';
  department?: string;
}

// 認証確認API呼び出し（useCallbackで外出し）
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  const fetchMe = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const apiUrl = `${apiBaseUrl}/api/auth/me`;
      console.log('🔗 認証確認URL:', apiUrl);

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: "include",
        signal
      });

      console.log('📡 認証確認レスポンス:', {
        status: response.status,
        ok: response.ok
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('サーバー応答がJSONではありません');
      }

      if (response.ok) {
        const userData = await response.json();
        console.log('📦 認証確認データ:', userData);
        if (userData && userData.success && userData.user) {
          setUser({
            id: userData.user.id,
            username: userData.user.username,
            displayName: userData.user.displayName,
            role: userData.user.role,
            department: userData.user.department
          });
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('❌ 認証確認エラー:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
      setAuthChecked(true);
      console.log('✅ 認証状態確認完了 - authChecked:', true);
    }
  }, []);


  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    fetchMe(controller.signal);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [fetchMe]);

  // ログイン関数
  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const apiUrl = `${apiBaseUrl}/api/auth/login`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('サーバー応答がJSONではありません');
      }
      const data = await response.json();
      if (response.ok && data && data.success && data.user) {
        setUser({
          id: data.user.id,
          username: data.user.username,
          displayName: data.user.displayName,
          role: data.user.role,
          department: data.user.department
        });
      } else {
        setUser(null);
        throw new Error(data?.message || 'ログイン失敗');
      }
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // ログアウト関数
  const logout = async () => {
    setIsLoading(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const apiUrl = `${apiBaseUrl}/api/auth/logout`;
      await fetch(apiUrl, {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // AuthContextの定義
  const AuthContext = createContext<{
    user: User | null;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
  } | undefined>(undefined);

  // 認証状態確認中はローディング画面
  if (isLoading) {
    return (
      <AuthContext.Provider value={{ user, isLoading, login, logout }}>
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">認証状態を確認中...</p>
          </div>
        </div>
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}


// useAuthフック
export function useAuth() {
  // AuthContextはAuthProvider内で定義されているため、グローバルに再定義
  const AuthContext = createContext<{
    user: User | null;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
  } | undefined>(undefined);
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
