// client/src/lib/apiClient.ts
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export async function apiFetch(path: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await res.text().catch(() => '');
    throw new Error(`Non-JSON response: ${res.status} ${text.slice(0,80)}`);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`API error ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json();
}

// ===== Compatibility thin wrappers (keep legacy call sites alive) =====
export async function getJson(path: string, init: RequestInit = {}) {
  return apiFetch(path, { method: 'GET', ...init });
}

export async function postJson(path: string, body?: unknown, init: RequestInit = {}) {
  return apiFetch(path, { method: 'POST', body: body != null ? JSON.stringify(body) : undefined, ...init });
}

export async function putJson(path: string, body?: unknown, init: RequestInit = {}) {
  return apiFetch(path, { method: 'PUT', body: body != null ? JSON.stringify(body) : undefined, ...init });
}

export async function deleteJson(path: string, init: RequestInit = {}) {
  return apiFetch(path, { method: 'DELETE', ...init });
}
