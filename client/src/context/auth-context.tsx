


import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

interface User {
  id: string;
  username: string;
  displayName: string;
  role: 'system_admin' | 'operator' | 'user';  // 3段階の権限に更新
  department?: string;
}

// ロール変換関数：DBのロールをフロントエンドのロールに変換
function normalizeRole(dbRole: string): 'system_admin' | 'operator' | 'user' {
  switch (dbRole) {
    case 'system_admin':
      return 'system_admin';
    case 'operations_admin':  // DBのoperations_adminをoperatorに変換
    case 'operator':
      return 'operator';
    case 'general_user':      // DBのgeneral_userをuserに変換
    case 'user':
      return 'user';
    default:
      console.warn('未知のロール:', dbRole, '-> userとして扱います');
      return 'user';
  }
}

// グローバルなAuthContextを1回だけ定義（exportしない）
const AuthContext = createContext<{
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
} | undefined>(undefined);

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
            role: normalizeRole(userData.user.role),  // ロール変換を適用
            department: userData.user.department
          });
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        // タイムアウトやアンマウント時のabortは正常終了扱い
        console.log('認証確認: fetch中断(AbortError)');
      } else {
        console.error('❌ 認証確認エラー:', error);
        setUser(null);
      }
    } finally {
      setIsLoading(false);
      setAuthChecked(true);
      console.log('✅ 認証状態確認完了 - authChecked:', true);
    }
  }, []);


  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;
    const timer = setTimeout(() => {
      // タイムアウト時はUI解放のみ、fetch中断はしない
      setIsLoading(false);
    }, 8000);
    (async () => {
      try {
        await fetchMe(controller.signal);
      } catch (err: any) {
        // fetchMe内でAbortErrorは握り潰すが、念のため
        if (err?.name === 'AbortError') return;
        // それ以外はログ
        console.error('❌ 認証確認エラー:', err);
      }
    })();
    return () => {
      mounted = false;
      controller.abort(); // アンマウント時のみfetch中断
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
          role: normalizeRole(data.user.role),  // ロール変換を適用
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
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
