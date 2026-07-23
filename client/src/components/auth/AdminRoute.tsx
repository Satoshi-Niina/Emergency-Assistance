import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { buildTenantPath, resolveCurrentTenantId } from '../../lib/tenant-path';

interface AdminRouteProps {
  children: ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, isLoading } = useAuth();
  const tenantId = resolveCurrentTenantId(window.location.pathname);

  console.log('🔍 AdminRoute - 管理者権限確認:', {
    isLoading,
    hasUser: !!user,
    role: user?.role,
    isAdmin: user?.role === 'admin',
  });

  // 認証状態読み込み中
  if (isLoading) {
    return (
      <div className='flex justify-center items-center h-screen'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary'></div>
      </div>
    );
  }

  // 未認証の場合はログインページにリダイレクト
  if (!user) {
    console.log('🚫 AdminRoute - 未認証、ログインページにリダイレクト');
    return <Navigate to={buildTenantPath('/login', tenantId)} replace />;
  }

  // 管理者でない場合はチャットページにリダイレクト
  // employee（一般ユーザー）は管理者権限を持たない
  if (user.role !== 'admin') {
    console.log(
      '🚫 AdminRoute - 管理者権限がありません、チャットページにリダイレクト'
    );
    return <Navigate to={buildTenantPath('/chat', tenantId)} replace />;
  }

  console.log('✅ AdminRoute - 管理者権限OK、コンテンツを表示');
  return <>{children}</>;
}
