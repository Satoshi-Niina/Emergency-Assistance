import { useEffect } from "react";
import { useAuth } from "../../context/auth-context";
import { useNavigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  // 認証チェックを無効化 - 常にメイン画面にアクセス可能
  console.log('🔍 ProtectedRoute - 認証チェック無効化モード');

  // ローディング表示も無効化
  return <>{children}</>;
}