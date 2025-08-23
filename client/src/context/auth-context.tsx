import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { login as authLogin, logout as authLogout, getCurrentUser as fetchCurrentUser } from '../lib/auth';

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
        
        // Azure Static Web Apps のコールドスタート対策でタイムアウトを延長
        console.log('🔍 認証状態チェック開始...');
        
        // リトライ機能付きで認証状態を確認
        let retryCount = 0;
        const maxRetries = 3;
        let userData = null;
        
        while (retryCount < maxRetries) {
          try {
            console.log(`🔄 認証確認試行 ${retryCount + 1}/${maxRetries}`);
            userData = await fetchCurrentUser();
            break; // 成功したらループを抜ける
          } catch (error) {
            retryCount++;
            console.warn(`⚠️ 認証確認失敗 (${retryCount}/${maxRetries}):`, error);
            
            if (retryCount < maxRetries) {
              // 指数バックオフで待機
              const delay = Math.pow(2, retryCount) * 1000;
              console.log(`⏳ ${delay}ms 待機してリトライ...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        
        if (userData) {
          console.log('✅ 認証状態確認成功:', userData);
          setUser({
            id: userData.id,
            username: userData.username,
            displayName: userData.display_name || userData.displayName,
            role: userData.role,
            department: userData.department
          });
        } else {
          console.log('❌ 未認証またはセッション期限切れ');
          setUser(null);
        }
      } catch (error) {
        console.error('❌ 認証状態チェック最終エラー:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
        setAuthChecked(true);
        console.log('🏁 認証状態チェック完了');
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
      setUser({
        id: userData.user.id,
        username: userData.user.username,
        displayName: userData.user.display_name || userData.user.displayName,
        role: userData.user.role,
        department: userData.user.department
      });
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
