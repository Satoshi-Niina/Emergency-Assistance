export const API_BASE =
  (import.meta?.env?.VITE_API_BASE_URL || "").replace(/\/+$/, "");

type FetchOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

export async function apiFetch(path: string, options: FetchOptions = {}) {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await res.text().catch(() => "");
    throw new Error(`Non-JSON response: status=${res.status}, bodyHead=${text.slice(0,80)}`);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`API error ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json();
}
