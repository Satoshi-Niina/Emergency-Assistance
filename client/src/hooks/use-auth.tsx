﻿import { createContext, ReactNode, useContext, useState, useEffect } from "react";
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
        throw new Error(errorData.message || "繝ｭ繧ｰ繧､繝ｳ縺ｫ螟ｱ謨励＠縺ｾ縺励◆");
      }
      return await res.json();
    },
    onSuccess: (userData: User) => {
      queryClient.setQueryData(["/api/auth/me"], userData);
      toast({
        title: "繝ｭ繧ｰ繧､繝ｳ謌仙粥",
        description: `繧医≧縺薙◎縲・{userData.displayName}縺輔ｓ`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "繝ｭ繧ｰ繧､繝ｳ螟ｱ謨・,
        description: error.message || "繝ｦ繝ｼ繧ｶ繝ｼ蜷阪∪縺溘・繝代せ繝ｯ繝ｼ繝峨′髢馴＆縺｣縺ｦ縺・∪縺・,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      const res = await apiRequest("POST", "/api/auth/register", userData);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "繝ｦ繝ｼ繧ｶ繝ｼ逋ｻ骭ｲ縺ｫ螟ｱ謨励＠縺ｾ縺励◆");
      }
      return await res.json();
    },
    onSuccess: (userData: User) => {
      queryClient.setQueryData(["/api/auth/me"], userData);
      toast({
        title: "逋ｻ骭ｲ謌仙粥",
        description: `繧医≧縺薙◎縲・{userData.displayName}縺輔ｓ`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "逋ｻ骭ｲ螟ｱ謨・,
        description: error.message || "繝ｦ繝ｼ繧ｶ繝ｼ逋ｻ骭ｲ縺ｫ螟ｱ謨励＠縺ｾ縺励◆",
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
        title: "繝ｭ繧ｰ繧｢繧ｦ繝域・蜉・,
        description: "繝ｭ繧ｰ繧｢繧ｦ繝医＠縺ｾ縺励◆",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "繝ｭ繧ｰ繧｢繧ｦ繝亥､ｱ謨・,
        description: error.message || "繝ｭ繧ｰ繧｢繧ｦ繝医↓螟ｱ謨励＠縺ｾ縺励◆",
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
