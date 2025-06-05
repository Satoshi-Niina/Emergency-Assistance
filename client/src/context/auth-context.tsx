import React, { createContext, useContext, useState, useEffect } from "react";
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

  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log('ユーザー情報取得を開始');
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        console.log('認証レスポンス:', response.status, response.statusText);
        
        if (response.ok) {
          const userData = await response.json();
          console.log('認証成功:', userData.username);
          setUser(userData);
        } else if (response.status === 401) {
          // 認証エラーの場合は明示的にnullを設定
          setUser(null);
          console.log("ユーザーは未認証です - ログインが必要");
        } else {
          // その他のエラー
          console.error('認証エラー:', response.status, await response.text());
          setUser(null);
        }
      } catch (error) {
        console.error("認証確認でネットワークエラー:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUser();
  }, []);

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
