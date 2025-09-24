// client/src/lib/apiClient.ts
const ABS = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const IS_SWA =
  typeof window !== 'undefined' && /\.azurestaticapps\.net$/i.test(window.location.host);

// 本番SWAは '/api'、それ以外は絶対URL + '/api'
const BASE = IS_SWA ? '/api' : (ABS ? `${ABS}/api` : '/api');

function join(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`;
  // 二重スラ/プロトコル崩れを正規化
  return `${BASE}${p}`.replace(/\/{2,}/g, '/').replace('https:/', 'https://');
}

// ★ named export（必須）
export async function apiFetch(path: string, init: RequestInit = {}) {
  return fetch(join(path), {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    ...init,
  });
}

export const apiGet  = (p: string) => apiFetch(p);
export const apiPost = (p: string, body: unknown) =>
  apiFetch(p, { method: 'POST', body: JSON.stringify(body) });

// 互換性のためのエクスポート
export const getJson = async (path: string) => {
  const response = await apiFetch(path);
  return response.json();
};

export const postJson = async (path: string, body: unknown) => {
  const response = await apiFetch(path, { 
    method: 'POST', 
    body: JSON.stringify(body) 
  });
  return response.json();
};

// 互換用（過去の default import に対応）
export default apiFetch;

// デバッグ用
console.log('[API Client] Environment:', {
  IS_SWA,
  BASE,
  ABS,
  host: typeof window !== 'undefined' ? window.location.host : 'server'
});