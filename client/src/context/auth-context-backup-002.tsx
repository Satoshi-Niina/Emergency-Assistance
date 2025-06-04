
// BACKUP #002 - 2025年1月28日
// 現在の認証コンテキスト状態
// 復元方法: このファイルの内容をclient/src/context/auth-context.tsxにコピー

import React, { createContext, useContext, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  username: string;
  role: string;
  displayName?: string;
  department?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log("認証状態確認中...");
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });
      
      console.log("認証レスポンス:", response.status, response.statusText);
      
      if (response.ok) {
        const userData = await response.json();
        console.log("認証成功:", userData);
        setUser(userData);
      } else {
        console.log("ユーザーは未認証です");
        setUser(null);
      }
    } catch (error) {
      console.error("認証確認エラー:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        toast({
          title: "ログイン成功",
          description: `${userData.displayName || userData.username}さん、おかえりなさい`,
        });
        return true;
      } else {
        const error = await response.json();
        toast({
          title: "ログインエラー",
          description: error.message || "ログインに失敗しました",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "ログインエラー",
        description: "ネットワークエラーが発生しました",
        variant: "destructive",
      });
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      toast({
        title: "ログアウト",
        description: "ログアウトしました",
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
