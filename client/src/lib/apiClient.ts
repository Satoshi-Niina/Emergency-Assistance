// client/src/lib/apiClient.ts
const fallbackUrl = 'https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net';
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || fallbackUrl).replace(/\/+$/, '');

if (!import.meta.env.VITE_API_BASE_URL) {
  console.warn('[api] Using fallback API_BASE_URL:', fallbackUrl);
}

// RequestInitを拡張して_retriedフラグを追加
interface ApiFetchOptions extends RequestInit {
  _retried?: boolean;
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}) {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  
  // 認証モードに基づいてヘッダーを設定
  const mode = sessionStorage.getItem('AUTH_MODE');
  const token = sessionStorage.getItem('token');
  
  const shouldUseToken = mode === 'token' && token;
  
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(shouldUseToken && { 'Authorization': `Bearer ${token}` }),
      ...(options.headers || {})
    }
  });
  
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await res.text().catch(() => '');
    throw new Error(`Non-JSON response: ${res.status} ${text.slice(0,80)}`);
  }
  
  // 401エラーの自動リカバリ（一度だけ）
  if (res.status === 401 && shouldUseToken && !options._retried) {
    try {
      const { refreshToken } = await import('./auth');
      const newToken = await refreshToken();
      
      if (newToken) {
        // 元のリクエストを再試行
        return apiFetch(path, { ...options, _retried: true });
      }
    } catch (refreshError) {
      console.error('自動リカバリ失敗:', refreshError);
    }
  }
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`API error ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json();
}

// ===== Compatibility thin wrappers (keep legacy call sites alive) =====
export async function getJson(path: string, init: ApiFetchOptions = {}) {
  return apiFetch(path, { method: 'GET', ...init });
}

export async function postJson(path: string, body?: unknown, init: ApiFetchOptions = {}) {
  return apiFetch(path, { method: 'POST', body: body != null ? JSON.stringify(body) : undefined, ...init });
}

export async function putJson(path: string, body?: unknown, init: ApiFetchOptions = {}) {
  return apiFetch(path, { method: 'PUT', body: body != null ? JSON.stringify(body) : undefined, ...init });
}

export async function deleteJson(path: string, init: ApiFetchOptions = {}) {
  return apiFetch(path, { method: 'DELETE', ...init });
}
