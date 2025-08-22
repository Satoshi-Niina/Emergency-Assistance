
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';

interface AdminRouteProps {
  children: ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, isLoading } = useAuth();

  console.log('🔍 AdminRoute - 管琁E��E��限確誁E', {
    isLoading,
    hasUser: !!user,
    role: user?.role,
    isAdmin: user?.role === 'admin'
  });

  // 認証状態読み込み中
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // 未認証の場合�Eログインペ�EジにリダイレクチE
  if (!user) {
    console.log('🚫 AdminRoute - 未認証、ログインペ�EジにリダイレクチE);
    return <Navigate to="/login" replace />;
  }

  // 管琁E��E��なぁE��合�EチャチE��ペ�EジにリダイレクチE
  if (user.role !== 'admin') {
    console.log('🚫 AdminRoute - 管琁E��E��限がありません、チャチE��ペ�EジにリダイレクチE);
    return <Navigate to="/chat" replace />;
  }

  console.log('✁EAdminRoute - 管琁E��E��限OK、コンチE��チE��表示');
  return <>{children}</>;
}
