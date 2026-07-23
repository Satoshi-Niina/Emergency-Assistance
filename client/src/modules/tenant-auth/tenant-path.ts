const RESERVED_ROOT_SEGMENTS = new Set([
  'api',
  'auth',
  'login',
  'apps',
  'chat',
  'settings',
  'system-diagnostic',
  'history',
  'documents',
  'troubleshooting',
  'emergency-guide',
  'users',
  'base-data',
  'machine-management',
  'not-found',
]);

export const TENANT_ID_STORAGE_KEY = 'tenantId';

function normalizePathname(pathname: string) {
  if (!pathname) return '/';
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

export function resolveTenantPath(pathname: string) {
  const normalizedPathname = normalizePathname(pathname);
  const segments = normalizedPathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return {
      tenantId: null as string | null,
      pathname: '/',
    };
  }

  const [firstSegment, ...restSegments] = segments;
  if (RESERVED_ROOT_SEGMENTS.has(firstSegment)) {
    return {
      tenantId: null as string | null,
      pathname: normalizedPathname,
    };
  }

  return {
    tenantId: firstSegment,
    pathname: `/${restSegments.join('/')}` || '/',
  };
}

export function getStoredTenantId(storageKey = TENANT_ID_STORAGE_KEY) {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(storageKey) || null;
}

export function setStoredTenantId(
  tenantId: string | null | undefined,
  storageKey = TENANT_ID_STORAGE_KEY,
) {
  if (typeof window === 'undefined') return;

  if (tenantId) {
    window.localStorage.setItem(storageKey, tenantId);
  } else {
    window.localStorage.removeItem(storageKey);
  }
}

export function resolveCurrentTenantId(pathname: string, storageKey = TENANT_ID_STORAGE_KEY) {
  return resolveTenantPath(pathname).tenantId || getStoredTenantId(storageKey);
}

export function buildTenantPath(pathname: string, tenantId?: string | null) {
  const normalizedPathname = normalizePathname(pathname);

  if (!tenantId) {
    return normalizedPathname;
  }

  if (normalizedPathname === '/') {
    return `/${tenantId}/`;
  }

  if (normalizedPathname === `/${tenantId}` || normalizedPathname.startsWith(`/${tenantId}/`)) {
    return normalizedPathname;
  }

  return `/${tenantId}${normalizedPathname}`;
}