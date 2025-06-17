import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  display_name: string;
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
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        console.log('✅ 認証ユーザー取得:', userData);
        return userData;
      } else {
        console.log('❌ 認証なし:', response.status);
        return null;
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      return null;
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      if (!isLoading) {
        setIsLoading(true);
        try {
          const userData = await getCurrentUser();
          if (userData && userData.username) {
            setUser(userData);
            console.log('✅ 認証成功:', userData);
          } else {
            setUser(null);
            console.log('❌ 認証失敗 - ユーザー情報なし');
          }
        } catch (error) {
          console.error('❌ 認証チェックエラー:', error);
          setUser(null);
        } finally {
          setIsLoading(false);
        }
      }
    };

    checkAuth();
  }, []); // 空の依存配列で初回のみ実行

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await apiRequest("POST", "/api/auth/login", { username, password });
      const userData = await response.json();

      if (!userData || !userData.id || !userData.username) {
        throw new Error("Invalid response data");
      }

      setUser(userData);
      toast({
        title: "ログイン成功",
        description: `ようこそ、${userData.display_name || userData.username}さん`,
      });
    } catch (error) {
      toast({
        title: "ログイン失敗",
        description: "ユーザー名またはパスワードが間違っています",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await apiRequest("POST", "/api/auth/logout");
      setUser(null);
      toast({
        title: "ログアウト成功",
        description: "ログアウトしました",
      });
    } catch (error) {
      toast({
        title: "ログアウト失敗",
        description: "ログアウトに失敗しました",
        variant: "destructive",
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