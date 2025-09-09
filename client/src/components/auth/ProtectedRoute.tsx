import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: 'system_admin' | 'operator' | 'user';  // 必要な最小権限を指定
  requireSystemAdmin?: boolean; // 旧コードとの互換性のため残す
}

export function ProtectedRoute({ 
  children, 
  requireRole, 
  requireSystemAdmin = false 
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  console.log('🔍 ProtectedRoute - 認証状態確認:', {
    isLoading,
    hasUser: !!user,
    username: user?.username,
    role: user?.role,
    requireRole,
    requireSystemAdmin,
    currentPath: location.pathname,
    timestamp: new Date().toISOString()
  });

  // 認証状態読み込み中
  if (isLoading) {
    console.log('⏳ ProtectedRoute - 認証状態読み込み中...');
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">認証状態を確認中...</p>
        </div>
      </div>
    );
  }

  // 未認証の場合はログインページにリダイレクト
  if (!user) {
    console.log('🚫 ProtectedRoute - 未認証、ログインページにリダイレクト');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 権限チェック関数
  const hasRequiredPermission = () => {
    const userRole = user.role;
    
    // 旧コードとの互換性：requireSystemAdminが指定されている場合
    if (requireSystemAdmin && userRole !== 'system_admin') {
      return false;
    }
    
    // 新しい権限システム：requireRoleが指定されている場合
    if (requireRole) {
      // 権限レベルの順序定義
      const roleHierarchy: Record<string, number> = {
        'user': 1,
        'operator': 2,
        'system_admin': 3
      };
      
      const userLevel = roleHierarchy[userRole] || 0;
      const requiredLevel = roleHierarchy[requireRole] || 999;
      
      return userLevel >= requiredLevel;
    }
    
    // デフォルトは認証済みであればアクセス可能
    return true;
  };

  // 権限不足の場合
  if (!hasRequiredPermission()) {
    console.log('🚫 ProtectedRoute - 権限不足:', {
      userRole: user.role,
      requireRole,
      requireSystemAdmin
    });
    return <Navigate to="/chat" replace />;
  }

  console.log('✅ ProtectedRoute - 認証・権限OK、コンテンツを表示');
  return <>{children}</>;
}