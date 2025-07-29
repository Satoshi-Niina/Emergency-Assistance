import { useEffect } from "react";
import { useAuth } from "../../context/auth-context";
import { useNavigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  // 認証チェックを完全に無効化 - 常に全画面にアクセス可能
  console.log('🔍 ProtectedRoute - 認証チェック完全無効化モード');

  return <>{children}</>;
}