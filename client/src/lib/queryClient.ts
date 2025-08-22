import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { buildApiUrl } from "./api/config.ts";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Responseのbody streamを一度だけ読む
    let errorText = res.statusText;
    try {
      const clonedRes = res.clone();
      errorText = await clonedRes.text() || res.statusText;
    } catch (e) {
      console.warn('Error reading response body:', e);
    }
    throw new Error(`${res.status}: ${errorText}`);
  }
}

export async function apiRequest(
  methodOrUrl: string,
  urlOrData?: string | unknown,
  dataOrHeaders?: unknown | Record<string, string>,
  customHeaders?: Record<string, string>,
): Promise<Response> {
  // 改喁E��れた引数の正規化
  let method = 'GET';
  let url = '';
  let data: unknown = undefined;
  let headers: Record<string, string> = {};

  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  if (httpMethods.includes(methodOrUrl)) {
    // 新しい形弁E apiRequest('GET', '/api/endpoint')
    method = methodOrUrl;
    url = urlOrData as string;
    data = dataOrHeaders;
    headers = customHeaders || {};
  } else {
    // 第一引数がURL
    url = methodOrUrl;
    if (urlOrData && typeof urlOrData !== 'string') {
      // 第二引数がデータオブジェクチE apiRequest('/api/endpoint', {data})
      method = 'POST';
      data = urlOrData;
      headers = dataOrHeaders as Record<string, string> || {};
    } else if (urlOrData && typeof urlOrData === 'string' && httpMethods.includes(urlOrData)) {
      // 旧形式�E互換性維持E apiRequest('POST', '/api/endpoint', {data})
      // 警告メチE��ージを表示しなぁE��同じ実裁E��使ってぁE��ので警告を消す�E�E
      method = urlOrData;
      url = methodOrUrl;
      data = dataOrHeaders;
      headers = customHeaders || {};
    } else if (urlOrData && typeof urlOrData === 'string') {
      // URLパスと合体させるケース: apiRequest('/api', '/endpoint')
      url = `${methodOrUrl}${urlOrData}`;
    }
  }

  // Content-TypeとAuthorizationヘッダーを追加
  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  // セチE��ョンクチE��ーを含めるための設定！Eredentialsヘッダーは送信しなぁE��E
  headers['Cache-Control'] = 'no-cache';

  // 相対パスの場合�EAPI_BASE_URLと結合
  const fullUrl = url.startsWith('/') ? buildApiUrl(url) : url;

  // ブラウザキャチE��ュ対策用のタイムスタンプパラメータを追加
  const urlWithCache = fullUrl.includes('?') 
    ? `${fullUrl}&_t=${Date.now()}` 
    : `${fullUrl}?_t=${Date.now()}`;

  // 修正: URLのパ�Eスエラーを防ぐため、�Eート番号とパスを確誁E
  if (!fullUrl.startsWith('http') && !fullUrl.startsWith('/')) {
    console.error('不正なURL:', fullUrl);
  }

  console.log('🔍 APIリクエスト実衁E', { 
    method, 
    url: urlWithCache, 
    hasData: !!data,
    headers,
    // 追加のチE��チE��惁E��
    fullUrl: urlWithCache,
    baseUrl: window.location.origin,
    isRelative: url.startsWith('/'),
    isAbsolute: url.startsWith('http'),
    // リクエスト�E詳細
    requestBody: data ? JSON.stringify(data).substring(0, 200) : 'none',
    timestamp: new Date().toISOString()
  });

  try {
    const res = await fetch(urlWithCache, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      mode: 'cors',
      // キャチE��ュ制御を追加
      cache: method === 'GET' ? 'no-cache' : 'default'
    });

    console.log('📡 APIレスポンス受信:', { 
      url: urlWithCache,
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
      headers: Object.fromEntries(res.headers.entries()),
      cookies: res.headers.get('set-cookie'),
      timestamp: new Date().toISOString()
    });

    // エラーレスポンスの詳細ログ
    if (!res.ok) {
      let errorText = res.statusText;
      try {
        const clonedRes = res.clone();
        errorText = await clonedRes.text();
      } catch (e) {
        console.warn('Error reading error response body:', e);
      }
      console.error('❁EAPIエラーレスポンス:', {
        url: urlWithCache,
        status: res.status,
        statusText: res.statusText,
        errorText,
        requestBody: data ? JSON.stringify(data) : 'none',
        cookies: res.headers.get('set-cookie')
      });
    }

    return res;
  } catch (error) {
    console.error('❁EAPIリクエストエラー:', {
      url: urlWithCache,
      method,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // チャチE��クリア後�E強制皁E��空配�Eを返す
    if (
      (queryKey[0] as string).includes('/api/chats') && 
      (queryKey[0] as string).includes('/messages')
    ) {
      const chatClearedTimestamp = localStorage.getItem('chat_cleared_timestamp');
      if (chatClearedTimestamp) {
        const clearTime = parseInt(chatClearedTimestamp);
        const now = Date.now();
        // クリアしてから10秒以冁E��ら強制皁E��空配�Eを返す
        if (now - clearTime < 10000) {
          console.log('クエリキャチE��ュクリア直後�EためメチE��ージを空にしまぁE);
          return [];
        }
      }
    }

    // クエリキーにキャチE��ュバスチE��ングパラメータを追加
    let url = queryKey[0] as string;
    const timestamp = Date.now();
    url = url.includes('?') ? `${url}&_t=${timestamp}` : `${url}?_t=${timestamp}`;

    console.log('🔍 クエリ実衁E', { url, timestamp });

    const res = await fetch(url, {
      credentials: "include",
      cache: "no-cache", // ブラウザキャチE��ュを使用しなぁE
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    console.log('📡 レスポンス受信:', { 
      url, 
      status: res.status, 
      statusText: res.statusText,
      contentType: res.headers.get('content-type')
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    // キャチE��ュクリアヘッダーをチェチE��
    if (res.headers.get('X-Chat-Cleared') === 'true') {
      console.log('クエリ実行中にキャチE��ュクリア持E��を受信: 空配�Eを返しまぁE);
      // クリアフラグが付いてぁE��場合�E空配�Eを返す
      return [];
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Lazy initialization of queryClient
let _queryClient: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (!_queryClient) {
    _queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          queryFn: getQueryFn({ on401: "throw" }),
          refetchInterval: false,
          refetchOnWindowFocus: false,
          staleTime: 60000, // 1刁E��はキャチE��ュを使用
          retry: false,
          refetchOnMount: true, // コンポ�Eネントがマウントされるた�Eに再取征E
        },
        mutations: {
          retry: false,
        },
      },
    });
  }
  return _queryClient;
}

// For backward compatibility
export const queryClient = getQueryClient();

const setupWebSocket = (token: string) => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;

  // チE�Eロイメント環墁E��は標準�Eートを使用、E��発環墁E��は5000番ポ�Eトを使用
  let wsUrl;
  if (window.location.hostname.includes('replit.app') || window.location.hostname.includes('replit.dev')) {
    // ReplitチE�Eロイメント環墁E
    wsUrl = `${protocol}//${host}/ws?token=${token}`;
  } else {
    // 開発環墁E
    const port = window.location.port || '5000';
    wsUrl = `${protocol}//${host}:${port}/ws?token=${token}`;
  }

  console.log('WebSocket接続を開姁E', wsUrl);

  try {
    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';  // バイナリチE�Eタの高速�E琁E
    return ws;
  } catch (error) {
    console.error('WebSocket作�Eエラー:', error);
    throw error;
  }
};

// WebSocket接続�EチE��ト関数
export function testWebSocketConnection(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const ws = setupWebSocket('test-token');

      const timeout = setTimeout(() => {
        ws.close();
        resolve(false);
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        ws.close();
        resolve(true);
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };
    } catch (error) {
      console.error('WebSocket接続テストエラー:', error);
      resolve(false);
    }
  });
}

// Placeholder function, assuming this is where message processing happens
export async function processMessage(text: string): Promise<string> {
  try {
    // スチE��プ形式�Eレスポンスを取征E
    const response = await apiRequest('POST', '/api/chatgpt/steps', { text });
    const data = await response.json();
    if (data.steps) {
      // スチE��プ形式�Eレスポンスを整形
      let formattedResponse = `${data.title}\n\n`;
      data.steps.forEach((step: { description: string }, index: number) => {
        formattedResponse += `${index + 1}. ${step.description}\n`;
      });
      return formattedResponse;
    } else {
      return data.response;
    }
  } catch (error) {
    console.error('メチE��ージ処琁E��ラー:', error);
    return 'メチE��ージの処琁E��にエラーが発生しました、E;
  }
}
// The change request does not directly modify buildApiUrl but it relies on it, keep the original implementation of buildApiUrl function

// Replit環墁E��老E�EしたAPI URL構篁E
function buildApiUrl(path: string): string {
  if (path.startsWith('http')) return path;
  
  // Replit環墁E��は専用ポ�Eトを使用
  const isReplitEnvironment = window.location.hostname.includes('replit.dev') || window.location.hostname.includes('replit.app');
  
  if (isReplitEnvironment) {
    return `${window.location.protocol}//${window.location.hostname}:3000${path}`;
  }
  
  // 開発環墁E��はプロキシ経由でアクセス�E�相対パスを使用�E�E
  const isDevelopment = import.meta.env.DEV || window.location.hostname.includes('localhost');
  
  if (isDevelopment) {
    console.log('✁E開発環墁E プロキシ経由でアクセス�E�相対パス�E�E);
    return path; // 相対パスを使用してプロキシ経由でアクセス
  }
  
  // そ�E他�E環墁E��は相対パス
  return `${window.location.origin}${path}`;
}
// API設宁E- VITE_API_BASE_URLのみを使用
const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 環墁E��数の定義
const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

console.log('🔍 環墁E��数詳細確誁E', {
  VITE_API_BASE_URL,
  VITE_API_BASE_URL_TYPE: typeof VITE_API_BASE_URL,
  VITE_API_BASE_URL_LENGTH: VITE_API_BASE_URL?.length,
  isProduction,
  isDevelopment,
  NODE_ENV: import.meta.env.NODE_ENV,
  MODE: import.meta.env.MODE,
  BASE_URL: import.meta.env.BASE_URL,
  // 実際に使用されるURL
  finalApiBaseUrl: VITE_API_BASE_URL || 'http://localhost:3001'
});

console.log('🔧 API設宁E', {
  isProduction,
  isDevelopment,
  API_BASE_URL: VITE_API_BASE_URL || 'http://localhost:3001',
  // チE��チE��用�E�実際のリクエスチERLを確誁E
  sampleAuthUrl: `${VITE_API_BASE_URL || 'http://localhost:3001'}/api/login`,
  // 追加のチE��チE��惁E��
  location: window.location.href,
  origin: window.location.origin,
  hostname: window.location.hostname,
  protocol: window.location.protocol,
  // 実際のAPI URLを構築して確誁E
  actualAuthUrl: `${VITE_API_BASE_URL || 'http://localhost:3001'}/api/login`,
  actualMeUrl: `${VITE_API_BASE_URL || 'http://localhost:3001'}/api/auth/me`,
  // 環墁E��数の詳細確誁E
  envVars: {
    VITE_API_BASE_URL,
    NODE_ENV: import.meta.env.NODE_ENV,
    MODE: import.meta.env.MODE
  }
});

// API Base URLの設宁E- VITE_API_BASE_URLのみを使用
const API_BASE_URL = (() => {
  const isDevelopment = import.meta.env.DEV || window.location.hostname.includes('localhost');
  
  // 開発環墁E��はプロキシ経由でアクセス�E�相対パスを使用�E�E
  if (isDevelopment) {
    console.log('✁E開発環墁E プロキシ経由でアクセス');
    return ''; // 空斁E���Eで相対パスを使用
  }
  
  // 環墁E��数が設定されてぁE��場合�E優先使用
  if (VITE_API_BASE_URL && VITE_API_BASE_URL.trim() !== '') {
    console.log('✁E環墁E��数からAPI_BASE_URLを取征E', VITE_API_BASE_URL);
    return VITE_API_BASE_URL;
  }
  
  // チE��ォルチE
  return 'http://localhost:3001';
})();
