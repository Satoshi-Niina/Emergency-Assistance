

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

  // 初期認証状態チェック
  useEffect(() => {
    const checkAuthStatus = async () => {
      console.log('🔐 認証状態チェック開始');
      try {
        setIsLoading(true);
        const userData = await getCurrentUser();

        if (userData && userData.success && userData.user) {
          console.log('✅ 認証済みユーザーを検出:', userData.user);
          setUser({
            id: userData.user.id,
            username: userData.user.username,
            displayName: userData.user.displayName,
            role: userData.user.role,
            department: userData.user.department
          });
        } else {
          console.log('❌ 未認証状態');
          setUser(null);
        }
      } catch (error) {
        console.error('❌ 認証状態チェックエラー:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    console.log('🔐 ログイン試行開始:', { username });

    try {
      setIsLoading(true);
      const userData = await authLogin({ username, password });

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
      console.error('❌ ログインエラー:', error);
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
