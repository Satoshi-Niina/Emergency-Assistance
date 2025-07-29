import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ダミーユーザー（認証無効化モード）
const DUMMY_USER: User = {
  id: 'dummy-user-id',
  username: 'dummy',
  email: 'dummy@example.com',
  role: 'admin'
};

export function AuthProvider({ children }: { children: ReactNode }) {
  // 認証を完全に無効化 - 常にダミーユーザーを返す
  const [user, setUser] = useState<User | null>(DUMMY_USER);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('🔐 認証チェック完全無効化モード - ダミーユーザーを設定');
    setUser(DUMMY_USER);
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    console.log('🔐 ログイン試行（無効化モード）:', username);
    setUser(DUMMY_USER);
    return true;
  };

  const logout = () => {
    console.log('🔐 ログアウト（無効化モード）');
    setUser(DUMMY_USER);
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