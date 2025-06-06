import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  methodOrUrl: string,
  urlOrData?: string | unknown,
  dataOrHeaders?: unknown | Record<string, string>,
  customHeaders?: Record<string, string>,
): Promise<Response> {
  let method = 'GET';
  let url = '';
  let data: unknown = undefined;
  let headers: Record<string, string> = {};

  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  if (httpMethods.includes(methodOrUrl)) {
    method = methodOrUrl;
    url = urlOrData as string;
    data = dataOrHeaders;
    headers = customHeaders || {};
  } else {
    url = methodOrUrl;
    if (urlOrData && typeof urlOrData !== 'string') {
      method = 'POST';
      data = urlOrData;
      headers = dataOrHeaders as Record<string, string> || {};
    } else if (urlOrData && typeof urlOrData === 'string' && httpMethods.includes(urlOrData)) {
      method = urlOrData;
      url = methodOrUrl;
      data = dataOrHeaders;
      headers = customHeaders || {};
    } else if (urlOrData && typeof urlOrData === 'string') {
      url = `${methodOrUrl}${urlOrData}`;
    }
  }

  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  headers['credentials'] = 'include';
  headers['Cache-Control'] = 'no-cache';

  const urlWithCache = url.includes('?') 
    ? `${url}&_t=${Date.now()}` 
    : `${url}?_t=${Date.now()}`;

  try {
    const res = await fetch(urlWithCache, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      cache: method === 'GET' ? 'no-cache' : 'default'
    });

    if (res.status === 401) {
      console.warn('認証エラー: セッションが無効です');
      window.location.href = '/login';
      throw new Error('認証が必要です。ログインしてください。');
    }

    if (res.status === 502) {
      console.error('サーバー接続エラー: 502 Bad Gateway');
      throw new Error('サーバーに接続できません。しばらく待ってから再試行してください。');
    }

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`API Error ${res.status}:`, errorText);
      throw new Error(`サーバーエラー: ${res.status} ${res.statusText}`);
    }

    if (res.headers.get('X-Chat-Cleared') === 'true') {
      console.log('サーバーからキャッシュクリア指示を受信');
      const keyPrefix = 'rq-' + url.split('?')[0];
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith(keyPrefix)) {
          localStorage.removeItem(key);
        }
      }
    }

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    if (
      (queryKey[0] as string).includes('/api/chats') && 
      (queryKey[0] as string).includes('/messages')
    ) {
      const chatClearedTimestamp = localStorage.getItem('chat_cleared_timestamp');
      if (chatClearedTimestamp) {
        const clearTime = parseInt(chatClearedTimestamp);
        const now = Date.now();
        if (now - clearTime < 10000) {
          console.log('クエリキャッシュクリア直後のためメッセージを空にします');
          return [];
        }
      }
    }

    let url = queryKey[0] as string;
    const timestamp = Date.now();
    url = url.includes('?') ? `${url}&_t=${timestamp}` : `${url}?_t=${timestamp}`;

    const res = await fetch(url, {
      credentials: "include",
      cache: "no-cache",
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    if (res.headers.get('X-Chat-Cleared') === 'true') {
      console.log('クエリ実行中にキャッシュクリア指示を受信: 空配列を返します');
      return [];
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5000,
      retry: (failureCount, error) => {
        if (error && (error as any).message?.includes('messages')) {
          return failureCount < 2;
        }
        return false;
      },
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
      onSuccess: (data, variables, context) => {
        if (context && (context as any).type === 'message') {
          const chatId = (context as any).chatId;
          if (chatId) {
            queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/messages`] });
          }
        }
      },
    },
  },
});

export async function processMessage(text: string): Promise<string> {
  const response = await apiRequest('POST', '/api/chatgpt/steps', { text });
  const data = await response.json();
  if (data.steps) {
    let formattedResponse = `${data.title}\n\n`;
    data.steps.forEach((step: { description: string }, index: number) => {
      formattedResponse += `${index + 1}. ${step.description}\n`;
    });
    return formattedResponse;
  } else {
    return data.response;
  }
}