// client/src/lib/apiClient.ts
// SWA環境では /api に統一（staticwebapp.config.json でリライトされる）
export const API_BASE = '/api';

console.info('[api] Using API_BASE:', API_BASE);

// RequestInitを拡張して_retriedフラグを追加
interface ApiFetchOptions extends RequestInit {
  _retried?: boolean;
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}) {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

  // リクエスト前インターセプタ: Authorizationヘッダの確実な付与
  const headers = new Headers(options.headers || {});
  const token =
    sessionStorage.getItem('token') || localStorage.getItem('accessToken');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // SWA環境では同一オリジンなので credentials は不要
  const finalOptions = {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...Object.fromEntries(headers.entries()),
    },
  };

  console.debug('[api] Request:', {
    url,
    hasAuth: headers.has('Authorization'),
    method: options.method || 'GET',
  });

  const res = await fetch(url, finalOptions);

  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await res.text().catch(() => '');
    throw new Error(`非JSONレスポンス: ${res.status} ${text.slice(0, 80)}`);
  }

  // 401エラーの自動リカバリ（一度だけ）
  if (res.status === 401 && !options._retried) {
    try {
      const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (refreshRes.ok) {
        const { token: newToken } = await refreshRes.json();
        if (newToken) {
          sessionStorage.setItem('token', newToken);
          headers.set('Authorization', `Bearer ${newToken}`);
          return await fetch(url, { ...options, headers }); // 1回だけ再試行
        }
      }
    } catch (refreshError) {
      console.error('自動リカバリ失敗:', refreshError);
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`APIエラー ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json();
}

// ===== Compatibility thin wrappers (keep legacy call sites alive) =====
export async function getJson(path: string, init: ApiFetchOptions = {}) {
  return apiFetch(path, { method: 'GET', ...init });
}

export async function postJson(
  path: string,
  body?: unknown,
  init: ApiFetchOptions = {}
) {
  return apiFetch(path, {
    method: 'POST',
    body: body != null ? JSON.stringify(body) : undefined,
    ...init,
  });
}

export async function putJson(
  path: string,
  body?: unknown,
  init: ApiFetchOptions = {}
) {
  return apiFetch(path, {
    method: 'PUT',
    body: body != null ? JSON.stringify(body) : undefined,
    ...init,
  });
}

export async function deleteJson(path: string, init: ApiFetchOptions = {}) {
  return apiFetch(path, { method: 'DELETE', ...init });
}
