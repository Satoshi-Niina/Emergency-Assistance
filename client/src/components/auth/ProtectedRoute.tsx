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

  console.log('剥 ProtectedRoute - 隱崎ｨｼ迥ｶ諷狗｢ｺ隱・', {
    isLoading,
    hasUser: !!user,
    username: user?.username,
    role: user?.role,
    requireAdmin,
    currentPath: location.pathname,
    timestamp: new Date().toISOString()
  });

  // 隱崎ｨｼ迥ｶ諷玖ｪｭ縺ｿ霎ｼ縺ｿ荳ｭ
  if (isLoading) {
    console.log('竢ｳ ProtectedRoute - 隱崎ｨｼ迥ｶ諷玖ｪｭ縺ｿ霎ｼ縺ｿ荳ｭ...');
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">隱崎ｨｼ迥ｶ諷九ｒ遒ｺ隱堺ｸｭ...</p>
        </div>
      </div>
    );
  }

  // 譛ｪ隱崎ｨｼ縺ｮ蝣ｴ蜷医・繝ｭ繧ｰ繧､繝ｳ繝壹・繧ｸ縺ｫ繝ｪ繝繧､繝ｬ繧ｯ繝・
  if (!user) {
    console.log('圻 ProtectedRoute - 譛ｪ隱崎ｨｼ縲√Ο繧ｰ繧､繝ｳ繝壹・繧ｸ縺ｫ繝ｪ繝繧､繝ｬ繧ｯ繝・);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 邂｡逅・・ｨｩ髯舌′蠢・ｦ√〒縲∫ｮ｡逅・・〒縺ｪ縺・ｴ蜷・
  if (requireAdmin && user.role !== 'admin') {
    console.log('圻 ProtectedRoute - 邂｡逅・・ｨｩ髯舌′蠢・ｦ√〒縺吶′縲∵ｨｩ髯舌′縺ゅｊ縺ｾ縺帙ｓ');
    return <Navigate to="/chat" replace />;
  }

  console.log('笨・ProtectedRoute - 隱崎ｨｼOK縲√さ繝ｳ繝・Φ繝・ｒ陦ｨ遉ｺ');
  return <>{children}</>;
}