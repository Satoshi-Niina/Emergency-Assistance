import { authApi } from '../../lib/api';

export interface TenantLoginCredentials {
  username: string;
  password: string;
  appId?: string;
  tenantId?: string;
}

export interface TenantAuthClient {
  login: (credentials: TenantLoginCredentials) => Promise<any>;
  logout: () => Promise<any>;
  me: () => Promise<any>;
}

export const defaultTenantAuthClient: TenantAuthClient = {
  login: credentials => authApi.login(credentials),
  logout: () => authApi.logout(),
  me: () => authApi.me(),
};

export const login = defaultTenantAuthClient.login;
export const logout = defaultTenantAuthClient.logout;
export const getCurrentUser = defaultTenantAuthClient.me;