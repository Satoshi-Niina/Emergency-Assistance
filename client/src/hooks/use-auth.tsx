import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, loginSchema } from "../lib/schema.ts";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient.ts";
import { useToast } from "../hooks/use-toast.ts";
import { z } from "zod";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
};

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = LoginData & { displayName: string; role?: "employee" | "admin" };

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | undefined, Error>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "ログインに失敗しました");
      }
      return await res.json();
    },
    onSuccess: (userData: User) => {
      queryClient.setQueryData(["/api/auth/me"], userData);
      toast({
        title: "ログイン成功",
        description: `ようこそ、E{userData.displayName}さん`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "ログイン失敁E,
        description: error.message || "ユーザー名また�Eパスワードが間違ってぁE��ぁE,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      const res = await apiRequest("POST", "/api/auth/register", userData);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "ユーザー登録に失敗しました");
      }
      return await res.json();
    },
    onSuccess: (userData: User) => {
      queryClient.setQueryData(["/api/auth/me"], userData);
      toast({
        title: "登録成功",
        description: `ようこそ、E{userData.displayName}さん`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "登録失敁E,
        description: error.message || "ユーザー登録に失敗しました",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      toast({
        title: "ログアウト�E劁E,
        description: "ログアウトしました",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "ログアウト失敁E,
        description: error.message || "ログアウトに失敗しました",
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
