import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  console.log('🔍 ProtectedRoute - 認証状態確誁E', {
    isLoading,
    hasUser: !!user,
    username: user?.username,
    role: user?.role,
    requireAdmin,
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

  // 未認証の場合�Eログインペ�EジにリダイレクチE
  if (!user) {
    console.log('🚫 ProtectedRoute - 未認証、ログインペ�EジにリダイレクチE);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 管琁E��E��限が忁E��で、管琁E��E��なぁE��吁E
  if (requireAdmin && user.role !== 'admin') {
    console.log('🚫 ProtectedRoute - 管琁E��E��限が忁E��ですが、権限がありません');
    return <Navigate to="/chat" replace />;
  }

  console.log('✁EProtectedRoute - 認証OK、コンチE��チE��表示');
  return <>{children}</>;
}
