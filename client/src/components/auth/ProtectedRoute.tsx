import { useAuth } from '@/context/auth-context';
import { Navigate, Outlet } from 'react-router-dom';
import { useEffect } from 'react';

const ProtectedRoute = () => {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    console.log('🔍 ProtectedRoute - 認証状態確認:', {
      isLoading,
      hasUser: !!user,
      username: user?.username
    });
  }, [user, isLoading]);

  if (isLoading) {
    console.log('⏳ ProtectedRoute - 認証状態読み込み中...');
    return <div className="flex justify-center items-center h-full">読み込み中...</div>;
  }

  if (!user) {
    console.log('🚫 ProtectedRoute - 未認証、ログインページにリダイレクト');
    return <Navigate to="/login" replace />;
  }

  console.log('✅ ProtectedRoute - 認証済み、コンテンツを表示');
  return <Outlet />;
};

export default ProtectedRoute; 