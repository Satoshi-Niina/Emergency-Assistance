
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';

interface AdminRouteProps {
  children: ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, isLoading } = useAuth();

  console.log('剥 AdminRoute - 邂｡逅・・ｨｩ髯千｢ｺ隱・', {
    isLoading,
    hasUser: !!user,
    role: user?.role,
    isAdmin: user?.role === 'admin'
  });

  // 隱崎ｨｼ迥ｶ諷玖ｪｭ縺ｿ霎ｼ縺ｿ荳ｭ
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // 譛ｪ隱崎ｨｼ縺ｮ蝣ｴ蜷医・繝ｭ繧ｰ繧､繝ｳ繝壹・繧ｸ縺ｫ繝ｪ繝繧､繝ｬ繧ｯ繝・
  if (!user) {
    console.log('圻 AdminRoute - 譛ｪ隱崎ｨｼ縲√Ο繧ｰ繧､繝ｳ繝壹・繧ｸ縺ｫ繝ｪ繝繧､繝ｬ繧ｯ繝・);
    return <Navigate to="/login" replace />;
  }

  // 邂｡逅・・〒縺ｪ縺・ｴ蜷医・繝√Ε繝・ヨ繝壹・繧ｸ縺ｫ繝ｪ繝繧､繝ｬ繧ｯ繝・
  if (user.role !== 'admin') {
    console.log('圻 AdminRoute - 邂｡逅・・ｨｩ髯舌′縺ゅｊ縺ｾ縺帙ｓ縲√メ繝｣繝・ヨ繝壹・繧ｸ縺ｫ繝ｪ繝繧､繝ｬ繧ｯ繝・);
    return <Navigate to="/chat" replace />;
  }

  console.log('笨・AdminRoute - 邂｡逅・・ｨｩ髯唇K縲√さ繝ｳ繝・Φ繝・ｒ陦ｨ遉ｺ');
  return <>{children}</>;
}
