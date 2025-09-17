// src/lib/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export function api(path: string, options: RequestInit = {}) {
  const url = path.startsWith('/') ? `${API_BASE_URL}${path}` : `${API_BASE_URL}/${path}`;
  return fetch(url, {
    credentials: 'include',
    ...options,
  });
}
