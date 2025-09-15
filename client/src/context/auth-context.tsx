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
        setIsLoading(true);
        
        // lib/auth の getCurrentUser を利用
        const userData = await getCurrentUser();
        console.log('🔍 getCurrentUser レスポンス:', userData);
        
        if (userData && userData.success && userData.user) {
          setUser({
            id: userData.user.id,
            username: userData.user.username,
            displayName: userData.user.displayName || userData.user.display_name,
            role: userData.user.role,
            department: userData.user.department
          });
        } else {
          console.log('❌ ユーザーデータが無効:', userData);
          setUser(null);
        }
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoading(false);
        setAuthChecked(true);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    console.log('🔐 ログイン試行開始:', { username });

    try {
      setIsLoading(true);
      
      // lib/auth の login を利用
      const userData = await authLogin({ username, password });
      console.log('🔍 ログインレスポンス:', userData);
      
      if (userData && userData.success && userData.user) {
        setUser({
          id: userData.user.id,
          username: userData.user.username,
          displayName: userData.user.displayName || userData.user.display_name,
          role: userData.user.role,
          department: userData.user.department
        });
      } else {
        console.log('❌ ログインレスポンスが無効:', userData);
        throw new Error('ログインに失敗しました');
      }
    } catch (error) {
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
