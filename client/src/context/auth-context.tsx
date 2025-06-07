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
    // 自動ログインを無効化 - セッションの確認のみ行う
    const checkSession = async () => {
      try {
        // localStorage からログイン状態を確認
        const hasValidSession = localStorage.getItem('user_logged_in') === 'true';
        
        if (hasValidSession) {
          // 有効なセッションがあると記録されている場合のみサーバーに確認
          const response = await fetch("/api/auth/me", {
            credentials: "include",
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            console.log("セッションが有効です:", userData.username);
          } else {
            // セッションが無効になっている場合はクリア
            localStorage.removeItem('user_logged_in');
            setUser(null);
            console.log("セッションが無効になりました");
          }
        } else {
          // セッション記録がない場合は未認証状態を設定
          setUser(null);
          console.log("未認証状態です");
        }
      } catch (error) {
        console.error("Session check failed:", error);
        localStorage.removeItem('user_logged_in');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSession();
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
      // ログイン状態をローカルストレージに記録
      localStorage.setItem('user_logged_in', 'true');
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
      // ログイン状態をローカルストレージから削除
      localStorage.removeItem('user_logged_in');
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
