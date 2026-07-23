import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

import {
  defaultTenantAuthClient,
  type TenantAuthClient,
} from './tenant-auth-client';
import { getStoredTenantId, setStoredTenantId, TENANT_ID_STORAGE_KEY } from './tenant-path';

export interface TenantUser {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'employee';
  department?: string;
  tenantId?: string;
  appId?: string;
}

export interface TenantAuthContextType {
  user: TenantUser | null;
  isLoading: boolean;
  login: (username: string, password: string, appId?: string, tenantId?: string | null) => Promise<void>;
  logout: () => Promise<void>;
  authMode: 'safe' | 'jwt-bypass' | 'jwt' | null;
}

export interface TenantAuthProviderProps {
  children: ReactNode;
  authClient?: TenantAuthClient;
  storageKey?: string;
}

const TenantAuthContext = createContext<TenantAuthContextType | undefined>(undefined);

const normalizeRole = (role?: string | null): TenantUser['role'] => {
  if (!role) return 'employee';
  const normalized = role.toString().trim().toLowerCase();
  if (normalized === 'admin') return 'admin';
  if (normalized === 'employee') return 'employee';
  if (normalized === 'user') return 'employee';
  return 'employee';
};

export function TenantAuthProvider({
  children,
  authClient = defaultTenantAuthClient,
  storageKey = TENANT_ID_STORAGE_KEY,
}: TenantAuthProviderProps) {
  const [user, setUser] = useState<TenantUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [authMode] = useState<'safe' | 'jwt-bypass' | 'jwt' | null>(null);

  const authBypass = import.meta.env.VITE_AUTH_BYPASS === 'true';

  useEffect(() => {
    const checkAuthStatus = async () => {
      if (authBypass) {
        setUser({
          id: 'demo',
          username: 'demo',
          displayName: 'Demo User',
          role: normalizeRole('employee'),
        });
        setIsLoading(false);
        setAuthChecked(true);
        return;
      }

      try {
        setIsLoading(true);

        const token = localStorage.getItem('authToken');
        if (token) {
          try {
            const userData = await authClient.me();
            if (userData && userData.success && userData.user) {
              setUser({
                id: userData.user.id,
                username: userData.user.username,
                displayName: userData.user.displayName || userData.user.display_name,
                role: normalizeRole(userData.user.role),
                department: userData.user.department,
                tenantId: userData.user.tenantId,
                appId: userData.user.appId,
              });
              setStoredTenantId(userData.user.tenantId || userData.tenant?.tenantId || null, storageKey);
            } else {
              localStorage.removeItem('authToken');
              setStoredTenantId(null, storageKey);
              setUser(null);
            }
          } catch (_error) {
            localStorage.removeItem('authToken');
            setStoredTenantId(null, storageKey);
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (_error) {
        setUser(null);
      } finally {
        setIsLoading(false);
        setAuthChecked(true);
      }
    };

    checkAuthStatus();
  }, [authBypass, authClient, storageKey]);

  const login = async (
    username: string,
    password: string,
    appId = 'troubleshoot',
    tenantId?: string | null,
  ): Promise<void> => {
    if (authBypass) {
      setUser({
        id: 'demo',
        username,
        displayName: username,
        role: normalizeRole('employee'),
      });
      return;
    }

    try {
      setIsLoading(true);

      const userData = await authClient.login({
        username,
        password,
        appId,
        tenantId: tenantId || undefined,
      });

      if (userData && userData.success && userData.user) {
        const token = userData.token || userData.accessToken;
        if (token) {
          localStorage.setItem('authToken', token);
        }

        const resolvedTenantId = userData.user.tenantId || userData.tenant?.tenantId || tenantId || null;
        setStoredTenantId(resolvedTenantId, storageKey);

        setUser({
          id: userData.user.id,
          username: userData.user.username,
          displayName: userData.user.displayName || userData.user.display_name,
          role: normalizeRole(userData.user.role),
          department: userData.user.department,
          tenantId: userData.user.tenantId || userData.tenant?.tenantId,
          appId: userData.user.appId || userData.appId,
        });
        return;
      }

      throw new Error('ログインに失敗しました');
    } catch (error) {
      setUser(null);
      setStoredTenantId(null, storageKey);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authClient.logout();
    } finally {
      localStorage.removeItem('authToken');
      setStoredTenantId(null, storageKey);
      setUser(null);
    }
  };

  if (isLoading) {
    return (
      <TenantAuthContext.Provider value={{ user, isLoading, login, logout, authMode }}>
        <div className='flex justify-center items-center h-screen'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4'></div>
            <p className='text-gray-600'>認証状態を確認中...</p>
          </div>
        </div>
      </TenantAuthContext.Provider>
    );
  }

  return (
    <TenantAuthContext.Provider value={{ user, isLoading, login, logout, authMode }}>
      {children}
    </TenantAuthContext.Provider>
  );
}

export function useTenantAuth() {
  const context = useContext(TenantAuthContext);
  if (context === undefined) {
    throw new Error('useTenantAuth must be used within a TenantAuthProvider');
  }
  return context;
}
