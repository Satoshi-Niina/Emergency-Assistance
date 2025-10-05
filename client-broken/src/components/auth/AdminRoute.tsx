import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';

interface AdminRouteProps {
  children: ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, isLoading } = useAuth();

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
    return <Navigate to='/login' replace />;
  }

  // 管理者でない場合はチャットページにリダイレクト
  // 注意: 一般ユーザーでもすべての機能が使えるように変更
  if (user.role !== 'admin' && user.role !== 'employee') {
    console.log(
      '🚫 AdminRoute - 管理者権限がありません、チャットページにリダイレクト'
    );
    return <Navigate to='/chat' replace />;
  }

  console.log('✅ AdminRoute - 管理者権限OK、コンテンツを表示');
  return <>{children}</>;
}
