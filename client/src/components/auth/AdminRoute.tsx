import { useEffect } from "react";
import { useAuth } from "../../context/auth-context";
import { useNavigate } from "react-router-dom";

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  // 管理者チェックを完全に無効化 - 常に全画面にアクセス可能
  console.log('🔍 AdminRoute - 管理者チェック完全無効化モード');

  return <>{children}</>;
}