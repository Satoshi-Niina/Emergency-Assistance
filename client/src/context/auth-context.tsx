import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { login as authLogin, logout as authLogout, getCurrentUser as fetchCurrentUser } from '../lib/auth';

interface User {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'employee';
  department?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // 蛻晄悄隱崎ｨｼ迥ｶ諷九メ繧ｧ繝・け
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setIsLoading(true);
        
        // Azure Static Web Apps 縺ｮ繧ｳ繝ｼ繝ｫ繝峨せ繧ｿ繝ｼ繝亥ｯｾ遲悶〒繧ｿ繧､繝繧｢繧ｦ繝医ｒ蟒ｶ髟ｷ
        console.log('剥 隱崎ｨｼ迥ｶ諷九メ繧ｧ繝・け髢句ｧ・..');
        
        // 繝ｪ繝医Λ繧､讖溯・莉倥″縺ｧ隱崎ｨｼ迥ｶ諷九ｒ遒ｺ隱・
        let retryCount = 0;
        const maxRetries = 3;
        let userData = null;
        
        while (retryCount < maxRetries) {
          try {
            console.log(`売 隱崎ｨｼ遒ｺ隱崎ｩｦ陦・${retryCount + 1}/${maxRetries}`);
            userData = await fetchCurrentUser();
            break; // 謌仙粥縺励◆繧峨Ν繝ｼ繝励ｒ謚懊￠繧・
          } catch (error) {
            retryCount++;
            console.warn(`笞・・隱崎ｨｼ遒ｺ隱榊､ｱ謨・(${retryCount}/${maxRetries}):`, error);
            
            if (retryCount < maxRetries) {
              // 謖・焚繝舌ャ繧ｯ繧ｪ繝輔〒蠕・ｩ・
              const delay = Math.pow(2, retryCount) * 1000;
              console.log(`竢ｳ ${delay}ms 蠕・ｩ溘＠縺ｦ繝ｪ繝医Λ繧､...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        
        if (userData) {
          console.log('笨・隱崎ｨｼ迥ｶ諷狗｢ｺ隱肴・蜉・', userData);
          setUser({
            id: userData.id,
            username: userData.username,
            displayName: userData.display_name || userData.displayName,
            role: userData.role,
            department: userData.department
          });
        } else {
          console.log('笶・譛ｪ隱崎ｨｼ縺ｾ縺溘・繧ｻ繝・す繝ｧ繝ｳ譛滄剞蛻・ｌ');
          setUser(null);
        }
      } catch (error) {
        console.error('笶・隱崎ｨｼ迥ｶ諷九メ繧ｧ繝・け譛邨ゅお繝ｩ繝ｼ:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
        setAuthChecked(true);
        console.log('潤 隱崎ｨｼ迥ｶ諷九メ繧ｧ繝・け螳御ｺ・);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    console.log('柏 繝ｭ繧ｰ繧､繝ｳ隧ｦ陦碁幕蟋・', { username });

    try {
      setIsLoading(true);
      
      // lib/auth 縺ｮ login 繧貞茜逕ｨ
      const userData = await authLogin({ username, password });
      setUser({
        id: userData.user.id,
        username: userData.user.username,
        displayName: userData.user.display_name || userData.user.displayName,
        role: userData.user.role,
        department: userData.user.department
      });
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    console.log('柏 繝ｭ繧ｰ繧｢繧ｦ繝亥・逅・幕蟋・);

    try {
      await authLogout();
      console.log('笨・繝ｭ繧ｰ繧｢繧ｦ繝域・蜉・);
    } catch (error) {
      console.error('笶・繝ｭ繧ｰ繧｢繧ｦ繝医お繝ｩ繝ｼ:', error);
    } finally {
      setUser(null);
    }
  };

  console.log('肌 AuthProvider 繝ｬ繝ｳ繝繝ｪ繝ｳ繧ｰ:', {
    user: user ? user.username : null,
    isLoading,
    authChecked,
    timestamp: new Date().toISOString()
  });

  // 隱崎ｨｼ迥ｶ諷狗｢ｺ隱堺ｸｭ縺ｯ蟶ｸ縺ｫ繝ｭ繝ｼ繝・ぅ繝ｳ繧ｰ逕ｻ髱｢繧定｡ｨ遉ｺ・・ull繝ｬ繝ｳ繝繝ｪ繝ｳ繧ｰ遖∵ｭ｢・・
  if (isLoading) {
    console.log('竢ｳ AuthProvider: 隱崎ｨｼ迥ｶ諷狗｢ｺ隱堺ｸｭ縲√Ο繝ｼ繝・ぅ繝ｳ繧ｰ逕ｻ髱｢繧定｡ｨ遉ｺ');
    return (
      <AuthContext.Provider value={{ user, isLoading, login, logout }}>
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">隱崎ｨｼ迥ｶ諷九ｒ遒ｺ隱堺ｸｭ...</p>
          </div>
        </div>
      </AuthContext.Provider>
    );
  }

  console.log('笨・AuthProvider: 隱崎ｨｼ迥ｶ諷狗｢ｺ隱榊ｮ御ｺ・∝ｭ舌さ繝ｳ繝昴・繝阪Φ繝医ｒ陦ｨ遉ｺ');
  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
