

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { login as authLogin, logout as authLogout, getCurrentUser } from '../lib/auth';

interface User {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'employee';
  department?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // 初期認証状態チェック
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        console.log('🔍 認証状態確認開始');
        setIsLoading(true);
        
        // プロキシ経由でAPIにアクセス
        const apiUrl = '/api/auth/me';
        console.log('🔗 認証確認URL:', apiUrl);

        const response = await fetch(apiUrl, {
          method: "GET",
          headers: { 
            "Content-Type": "application/json"
          },
          credentials: "include"
        });

        console.log('📡 認証確認レスポンス:', {
          status: response.status,
          ok: response.ok
        });

        if (response.ok) {
          const userData = await response.json();
          console.log('📦 認証確認データ:', userData);
          
          if (userData && userData.success && userData.user) {
            console.log('✅ 認証済みユーザー:', userData.user);
            setUser({
              id: userData.user.id,
              username: userData.user.username,
              displayName: userData.user.displayName,
              role: userData.user.role,
              department: userData.user.department
            });
          } else {
            console.log('❌ 無効な認証データ:', userData);
            setUser(null);
          }
        } else if (response.status === 401) {
          console.log('❌ 未認証状態:', response.status);
          setUser(null);
        } else {
          console.log('❌ 認証確認失敗:', response.status);
          setUser(null);
        }
      } catch (error) {
        console.error('❌ 認証確認エラー:', error);
        console.error('❌ 認証確認エラー詳細:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        });
        setUser(null);
      } finally {
        setIsLoading(false);
        setAuthChecked(true);
        console.log('✅ 認証状態確認完了 - authChecked:', true);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    console.log('🔐 ログイン試行開始:', { username });

    try {
      setIsLoading(true);
      
      // API URLを直接指定（開発環境用）
      const apiBaseUrl = 'http://localhost:3001';
      const apiUrl = `${apiBaseUrl}/api/auth/login`;
      console.log('🔗 ログインURL:', apiUrl);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ username, password })
      });

      console.log('📡 ログインレスポンス:', {
        status: response.status,
        ok: response.ok
      });

      // レスポンスが200以外の場合はエラーをthrow
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ ログインAPIエラー:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        
        let errorMessage = 'ログインに失敗しました';
        if (response.status === 401) {
          errorMessage = 'ユーザー名またはパスワードが違います';
        } else if (response.status === 500) {
          errorMessage = 'サーバーエラーが発生しました';
        } else if (response.status === 0 || response.statusText === 'Failed to fetch') {
          errorMessage = 'サーバーに接続できません';
        }
        
        throw new Error(errorMessage);
      }

      const userData = await response.json();
      console.log('📦 ログインレスポンスデータ:', userData);

      if (userData && userData.success && userData.user) {
        console.log('✅ ログイン成功:', userData.user);
        setUser({
          id: userData.user.id,
          username: userData.user.username,
          displayName: userData.user.displayName,
          role: userData.user.role,
          department: userData.user.department
        });
      } else {
        throw new Error('ログインレスポンスが無効です');
      }
    } catch (error) {
      console.error('❌ ログインエラー:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    console.log('🔐 ログアウト処理開始');

    try {
      await authLogout();
      console.log('✅ ログアウト成功');
    } catch (error) {
      console.error('❌ ログアウトエラー:', error);
    } finally {
      setUser(null);
    }
  };

  console.log('🔧 AuthProvider レンダリング:', {
    user: user ? user.username : null,
    isLoading,
    authChecked,
    timestamp: new Date().toISOString()
  });

  // 認証状態確認中は常にローディング画面を表示（nullレンダリング禁止）
  if (isLoading) {
    console.log('⏳ AuthProvider: 認証状態確認中、ローディング画面を表示');
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

  console.log('✅ AuthProvider: 認証状態確認完了、子コンポーネントを表示');
  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
