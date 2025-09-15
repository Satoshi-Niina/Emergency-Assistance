const API = import.meta.env.VITE_API_BASE ?? '/api';

export async function getJson(path: string, init?: RequestInit) {
  const url = `${API}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Accept: 'application/json',
    },
    credentials: 'include',
  });
  const ct = res.headers.get('content-type') || '';
  if (!res.ok || !ct.includes('application/json')) {
    const head = await res.text().then(t => t.slice(0, 200)).catch(() => '<no-body>');
    console.error('API非JSON/失敗', { url, status: res.status, ct, head });
    throw new Error(`API非JSON ${res.status}`);
  }
  return res.json();
}
