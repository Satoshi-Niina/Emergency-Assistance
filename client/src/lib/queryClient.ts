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
  // 改善された引数の正規化
  let method = 'GET';
  let url = '';
  let data: unknown = undefined;
  let headers: Record<string, string> = {};

  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  if (httpMethods.includes(methodOrUrl)) {
    // 新しい形式: apiRequest('GET', '/api/endpoint')
    method = methodOrUrl;
    url = urlOrData as string;
    data = dataOrHeaders;
    headers = customHeaders || {};
  } else {
    // 第一引数がURL
    url = methodOrUrl;
    if (urlOrData && typeof urlOrData !== 'string') {
      // 第二引数がデータオブジェクト: apiRequest('/api/endpoint', {data})
      method = 'POST';
      data = urlOrData;
      headers = dataOrHeaders as Record<string, string> || {};
    } else if (urlOrData && typeof urlOrData === 'string' && httpMethods.includes(urlOrData)) {
      // 旧形式の互換性維持: apiRequest('POST', '/api/endpoint', {data})
      // 警告メッセージを表示しない（同じ実装を使っているので警告を消す）
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

  // セッションクッキーを含めるための設定（credentialsヘッダーは送信しない）
  headers['Cache-Control'] = 'no-cache';

  // 相対パスの場合はAPI_BASE_URLと結合
  const fullUrl = url.startsWith('/') ? buildApiUrl(url) : url;

  // ブラウザキャッシュ対策用のタイムスタンプパラメータを追加
  const urlWithCache = fullUrl.includes('?') 
    ? `${fullUrl}&_t=${Date.now()}` 
    : `${fullUrl}?_t=${Date.now()}`;

  // 修正: URLのパースエラーを防ぐため、ポート番号とパスを確認
  if (!fullUrl.startsWith('http')) {
    console.error('不正なURL:', fullUrl);
  }

  console.log('🔍 APIリクエスト実行:', { 
    method, 
    url: urlWithCache, 
    hasData: !!data,
    headers,
    // 追加のデバッグ情報
    fullUrl: urlWithCache,
    baseUrl: window.location.origin,
    isRelative: url.startsWith('/'),
    isAbsolute: url.startsWith('http'),
    // リクエストの詳細
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
      // キャッシュ制御を追加
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
      console.error('❌ APIエラーレスポンス:', {
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
    console.error('❌ APIリクエストエラー:', {
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
    // チャットクリア後は強制的に空配列を返す
    if (
      (queryKey[0] as string).includes('/api/chats') && 
      (queryKey[0] as string).includes('/messages')
    ) {
      const chatClearedTimestamp = localStorage.getItem('chat_cleared_timestamp');
      if (chatClearedTimestamp) {
        const clearTime = parseInt(chatClearedTimestamp);
        const now = Date.now();
        // クリアしてから10秒以内なら強制的に空配列を返す
        if (now - clearTime < 10000) {
          console.log('クエリキャッシュクリア直後のためメッセージを空にします');
          return [];
        }
      }
    }

    // クエリキーにキャッシュバスティングパラメータを追加
    let url = queryKey[0] as string;
    const timestamp = Date.now();
    url = url.includes('?') ? `${url}&_t=${timestamp}` : `${url}?_t=${timestamp}`;

    console.log('🔍 クエリ実行:', { url, timestamp });

    const res = await fetch(url, {
      credentials: "include",
      cache: "no-cache", // ブラウザキャッシュを使用しない
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

    // キャッシュクリアヘッダーをチェック
    if (res.headers.get('X-Chat-Cleared') === 'true') {
      console.log('クエリ実行中にキャッシュクリア指示を受信: 空配列を返します');
      // クリアフラグが付いている場合は空配列を返す
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
          staleTime: 60000, // 1分間はキャッシュを使用
          retry: false,
          refetchOnMount: true, // コンポーネントがマウントされるたびに再取得
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

  // デプロイメント環境では標準ポートを使用、開発環境では5000番ポートを使用
  let wsUrl;
  if (window.location.hostname.includes('replit.app') || window.location.hostname.includes('replit.dev')) {
    // Replitデプロイメント環境
    wsUrl = `${protocol}//${host}/ws?token=${token}`;
  } else {
    // 開発環境
    const port = window.location.port || '5000';
    wsUrl = `${protocol}//${host}:${port}/ws?token=${token}`;
  }

  console.log('WebSocket接続を開始:', wsUrl);

  try {
    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';  // バイナリデータの高速処理
    return ws;
  } catch (error) {
    console.error('WebSocket作成エラー:', error);
    throw error;
  }
};

// WebSocket接続のテスト関数
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
    // ステップ形式のレスポンスを取得
    const response = await apiRequest('POST', '/api/chatgpt/steps', { text });
    const data = await response.json();
    if (data.steps) {
      // ステップ形式のレスポンスを整形
      let formattedResponse = `${data.title}\n\n`;
      data.steps.forEach((step: { description: string }, index: number) => {
        formattedResponse += `${index + 1}. ${step.description}\n`;
      });
      return formattedResponse;
    } else {
      return data.response;
    }
  } catch (error) {
    console.error('メッセージ処理エラー:', error);
    return 'メッセージの処理中にエラーが発生しました。';
  }
}
// The change request does not directly modify buildApiUrl but it relies on it, keep the original implementation of buildApiUrl function

// Replit環境を考慮したAPI URL構築
function buildApiUrl(path: string): string {
  if (path.startsWith('http')) return path;
  
  // Replit環境では専用ポートを使用
  const isReplitEnvironment = window.location.hostname.includes('replit.dev') || window.location.hostname.includes('replit.app');
  
  if (isReplitEnvironment) {
    return `${window.location.protocol}//${window.location.hostname}:3000${path}`;
  }
  
  // 開発環境ではプロキシ経由でアクセス（相対パスを使用）
  const isDevelopment = import.meta.env.DEV || window.location.hostname.includes('localhost');
  
  if (isDevelopment) {
    console.log('✅ 開発環境: プロキシ経由でアクセス（相対パス）');
    return path; // 相対パスを使用してプロキシ経由でアクセス
  }
  
  // その他の環境では相対パス
  return `${window.location.origin}${path}`;
}
// API設定 - VITE_API_BASE_URLのみを使用
const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 環境変数の定義
const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

console.log('🔍 環境変数詳細確認:', {
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

console.log('🔧 API設定:', {
  isProduction,
  isDevelopment,
  API_BASE_URL: VITE_API_BASE_URL || 'http://localhost:3001',
  // デバッグ用：実際のリクエストURLを確認
  sampleAuthUrl: `${VITE_API_BASE_URL || 'http://localhost:3001'}/api/login`,
  // 追加のデバッグ情報
  location: window.location.href,
  origin: window.location.origin,
  hostname: window.location.hostname,
  protocol: window.location.protocol,
  // 実際のAPI URLを構築して確認
  actualAuthUrl: `${VITE_API_BASE_URL || 'http://localhost:3001'}/api/login`,
  actualMeUrl: `${VITE_API_BASE_URL || 'http://localhost:3001'}/api/auth/me`,
  // 環境変数の詳細確認
  envVars: {
    VITE_API_BASE_URL,
    NODE_ENV: import.meta.env.NODE_ENV,
    MODE: import.meta.env.MODE
  }
});

// API Base URLの設定 - VITE_API_BASE_URLのみを使用
const API_BASE_URL = (() => {
  const isDevelopment = import.meta.env.DEV || window.location.hostname.includes('localhost');
  
  // 開発環境ではプロキシ経由でアクセス（相対パスを使用）
  if (isDevelopment) {
    console.log('✅ 開発環境: プロキシ経由でアクセス');
    return ''; // 空文字列で相対パスを使用
  }
  
  // 環境変数が設定されている場合は優先使用
  if (VITE_API_BASE_URL && VITE_API_BASE_URL.trim() !== '') {
    console.log('✅ 環境変数からAPI_BASE_URLを取得:', VITE_API_BASE_URL);
    return VITE_API_BASE_URL;
  }
  
  // デフォルト
  return 'http://localhost:3001';
})();