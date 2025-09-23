import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  console.log('🔍 ProtectedRoute - 認証状態確認:', {
    isLoading,
    hasUser: !!user,
    username: user?.username,
    role: user?.role,
    requireAdmin,
    currentPath: location.pathname,
    timestamp: new Date().toISOString(),
  });

  // 認証状態読み込み中
  if (isLoading) {
    console.log('⏳ ProtectedRoute - 認証状態読み込み中...');
    return (
      <div className='flex justify-center items-center h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4'></div>
          <p className='text-gray-600'>認証状態を確認中...</p>
        </div>
      </div>
    );
  }

  // 未認証の場合はログインページにリダイレクト
  if (!user) {
    console.log('🚫 ProtectedRoute - 未認証、ログインページにリダイレクト');
    return <Navigate to='/login' state={{ from: location }} replace />;
  }

  // 管理者権限が必要で、管理者でない場合
  // 注意: 一般ユーザーでもすべての機能が使えるように変更
  if (requireAdmin && user.role !== 'admin' && user.role !== 'employee') {
    console.log('🚫 ProtectedRoute - 管理者権限が必要ですが、権限がありません');
    return <Navigate to='/chat' replace />;
  }

  console.log('✅ ProtectedRoute - 認証OK、コンテンツを表示');
  return <>{children}</>;
}
