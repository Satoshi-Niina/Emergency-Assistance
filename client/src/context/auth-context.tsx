import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: string;
  username: string;
  displayName: string;
  role: "employee" | "admin";
  department?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const getCurrentUser = async () => {
    try {
      console.log('🔍 現在のユーザー情報を取得中...');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 ユーザー情報レスポンス:', {
        status: response.status,
        ok: response.ok
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('❌ 未認証ユーザー');
          return null;
        }
        throw new Error('ユーザー情報の取得に失敗しました');
      }

      const userData = await response.json();
      console.log('✅ ユーザー情報取得成功:', userData);

      if (!userData || !userData.user || !userData.user.id) {
        console.warn('⚠️ 無効なユーザーデータ:', userData);
        return null;
      }

      return userData.user;
    } catch (error) {
      console.error('❌ ユーザー情報取得エラー:', error);
      return null;
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔍 認証状態チェック開始...');
        const userData = await getCurrentUser();
        if (userData && userData.id) {
          console.log('✅ 認証済みユーザー:', userData);
          setUser(userData);
        } else {
          console.log('❌ 未認証状態');
          setUser(null);
        }
      } catch (error) {
        console.error('❌ 認証チェックエラー:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      console.log('🔐 ログイン試行開始:', { username });

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      console.log('📡 ログインレスポンス:', {
        status: response.status,
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: 'サーバーからのレスポンスエラー'
        }));
        console.error('❌ ログインエラー:', errorData);
        throw new Error(errorData.message || 'ログインに失敗しました');
      }

      const userData = await response.json();
      console.log('✅ ログイン成功:', userData);
      console.log('🔍 レスポンスデータ詳細:', {
        hasUserData: !!userData,
        hasUser: !!userData?.user,
        userDataKeys: userData ? Object.keys(userData) : [],
        userKeys: userData?.user ? Object.keys(userData.user) : [],
        userData: userData,
        user: userData?.user
      });

      if (!userData || !userData.user || !userData.user.id) {
        console.error('❌ 無効なユーザーデータ:', userData);
        throw new Error('無効なユーザーデータを受信しました');
      }

      // ユーザーデータを設定
      setUser(userData.user);
      console.log('✅ ユーザー状態更新完了:', userData.user);
      
      toast({
        title: 'ログイン成功',
        description: `ようこそ、${userData.user.displayName || userData.user.username}さん`,
        variant: 'default'
      });

      return userData.user;
    } catch (error) {
      console.error('❌ ログインエラー:', error);
      toast({
        title: 'ログイン失敗',
        description: error instanceof Error ? error.message : 'ログインに失敗しました',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      console.log('🔒 ログアウト処理開始');

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('ログアウトに失敗しました');
      }

      setUser(null);
      toast({
        title: 'ログアウト成功',
        description: 'ログアウトしました',
        variant: 'default'
      });
    } catch (error) {
      console.error('❌ ログアウトエラー:', error);
      toast({
        title: 'ログアウト失敗',
        description: 'ログアウトに失敗しました',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};