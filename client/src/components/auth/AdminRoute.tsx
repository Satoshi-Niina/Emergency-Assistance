import { useAuth } from '@/context/auth-context';
import { Navigate, Outlet } from 'react-router-dom';

const AdminRoute = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return user.role === 'admin' ? <Outlet /> : <Navigate to="/chat" />;
};

export default AdminRoute; 