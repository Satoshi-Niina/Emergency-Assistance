import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { buildApiUrl } from "./api/config.ts";

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

  // セッションクッキーを含めるための設定
  headers['credentials'] = 'include';
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
      // キャッシュ制御を追加
      cache: method === 'GET' ? 'no-cache' : 'default'
    });
    
    console.log('📡 APIレスポンス受信:', { 
      url: urlWithCache,
      status: res.status, 
      statusText: res.statusText,
      contentType: res.headers.get('content-type'),
      // 追加のデバッグ情報
      responseUrl: res.url,
      responseHeaders: Object.fromEntries(res.headers.entries()),
      redirected: res.redirected,
      type: res.type,
      timestamp: new Date().toISOString()
    });

    // レスポンスの内容を確認（デバッグ用）
    let responseText: string | null = null;
    
    if (res.status >= 400) {
      try {
        responseText = await res.text();
        console.error('❌ APIエラーレスポンス:', {
          url: urlWithCache,
          status: res.status,
          statusText: res.statusText,
          contentType: res.headers.get('content-type'),
          errorText: responseText.substring(0, 1000), // 最初の1000文字を表示
          isHtml: responseText.includes('<!DOCTYPE') || responseText.includes('<html'),
          timestamp: new Date().toISOString()
        });
        
        // HTMLレスポンスの場合は特別な処理
        if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
          console.error('🚨 HTMLレスポンスが返されました。バックエンドが正しく動作していない可能性があります。');
          console.error('考えられる原因:');
          console.error('1. バックエンドのAzure App Serviceが停止している');
          console.error('2. バックエンドのURLが間違っている');
          console.error('3. Azure Static Web Appsの設定が正しくない');
          console.error('4. バックエンドでエラーが発生している');
        }
      } catch (textError) {
        console.error('❌ APIエラーレスポンス（テキスト取得失敗）:', {
          url: urlWithCache,
          status: res.status,
          statusText: res.statusText,
          textError,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // 成功レスポンスでも内容を確認
      try {
        responseText = await res.text();
        console.log('✅ API成功レスポンス:', {
          url: urlWithCache,
          status: res.status,
          contentType: res.headers.get('content-type'),
          responseText: responseText.substring(0, 500), // 最初の500文字を表示
          isHtml: responseText.includes('<!DOCTYPE') || responseText.includes('<html'),
          timestamp: new Date().toISOString()
        });
        
        // HTMLレスポンスの場合は特別な処理
        if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
          console.error('🚨 成功ステータスでもHTMLレスポンスが返されました。');
          console.error('これは通常、Azure Static Web Appsの設定に問題があることを示します。');
        }
      } catch (textError) {
        console.error('❌ レスポンステキスト取得失敗:', textError);
      }
    }
    
    // キャッシュクリアヘッダーをチェック
    if (res.headers.get('X-Chat-Cleared') === 'true') {
      console.log('サーバーからキャッシュクリア指示を受信');
      // ローカルストレージの関連キーをクリア
      const keyPrefix = 'rq-' + url.split('?')[0];
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith(keyPrefix)) {
          localStorage.removeItem(key);
        }
      }
    }

    // レスポンスボディを既に読み込んだ場合は、新しいResponseオブジェクトを作成
    if (responseText !== null) {
      const newResponse = new Response(responseText, {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers
      });
      await throwIfResNotOk(newResponse);
      return newResponse;
    } else {
      await throwIfResNotOk(res);
      return res;
    }
  } catch (fetchError) {
    console.error('❌ フェッチエラー:', {
      url: urlWithCache,
      error: fetchError,
      message: fetchError.message,
      name: fetchError.name,
      timestamp: new Date().toISOString()
    });
    
    // ネットワークエラーの場合は特別な処理
    if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
      console.error('🚨 ネットワークエラーが発生しました。');
      console.error('考えられる原因:');
      console.error('1. バックエンドのAzure App Serviceが存在しない');
      console.error('2. バックエンドのURLが間違っている');
      console.error('3. ネットワーク接続の問題');
      console.error('4. CORSエラー');
    }
    
    throw fetchError;
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