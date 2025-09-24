// src/lib/api.ts - 統一APIクライアント
const ABS = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, ''); // 末尾スラ削除
const IS_SWA = /\.azurestaticapps\.net$/i.test(window.location.host);

// 本番SWA → '/api'、それ以外 → 'https://...azurewebsites.net/api'
const BASE = IS_SWA ? '/api' : (ABS ? `${ABS}/api` : '/api');

function join(p: string) {
  const path = p.startsWith('/') ? p : `/${p}`;
  return `${BASE}${path}`.replace(/\/{2,}/g, '/').replace('https:/', 'https://');
}

export async function api(path: string, init: RequestInit = {}) {
  const url = join(path);
  
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 
      'Content-Type': 'application/json', 
      ...(init.headers || {}) 
    },
    ...init,
  });
  
  return res;
}

// 便利用数
export const getHandshake = () => api('/auth/handshake');
export const getMe = () => api('/auth/me');
export const postLogin = (body: any) => api('/auth/login', { 
  method: 'POST', 
  body: JSON.stringify(body) 
});
export const postLogout = () => api('/auth/logout', { method: 'POST' });

// JSONレスポンス用のヘルパー
export async function apiJson(path: string, init: RequestInit = {}) {
  const res = await api(path, init);
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(`API Error ${res.status}: ${JSON.stringify(error)}`);
  }
  
  return res.json();
}

// HTTPメソッド別のヘルパー
export const getJson = (path: string) => apiJson(path, { method: 'GET' });
export const postJson = (path: string, body?: any) => 
  apiJson(path, { 
    method: 'POST', 
    body: body ? JSON.stringify(body) : undefined 
  });
export const putJson = (path: string, body?: any) => 
  apiJson(path, { 
    method: 'PUT', 
    body: body ? JSON.stringify(body) : undefined 
  });
export const deleteJson = (path: string) => 
  apiJson(path, { method: 'DELETE' });

// デバッグ用
console.log('[API] Environment:', {
  IS_SWA,
  BASE,
  ABS,
  host: window.location.host
});