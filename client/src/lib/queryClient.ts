import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { buildApiUrl } from "./api/config.ts";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Response縺ｮbody stream繧剃ｸ蠎ｦ縺縺題ｪｭ繧
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
  // 謾ｹ蝟・＆繧後◆蠑墓焚縺ｮ豁｣隕丞喧
  let method = 'GET';
  let url = '';
  let data: unknown = undefined;
  let headers: Record<string, string> = {};

  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  if (httpMethods.includes(methodOrUrl)) {
    // 譁ｰ縺励＞蠖｢蠑・ apiRequest('GET', '/api/endpoint')
    method = methodOrUrl;
    url = urlOrData as string;
    data = dataOrHeaders;
    headers = customHeaders || {};
  } else {
    // 隨ｬ荳蠑墓焚縺袈RL
    url = methodOrUrl;
    if (urlOrData && typeof urlOrData !== 'string') {
      // 隨ｬ莠悟ｼ墓焚縺後ョ繝ｼ繧ｿ繧ｪ繝悶ず繧ｧ繧ｯ繝・ apiRequest('/api/endpoint', {data})
      method = 'POST';
      data = urlOrData;
      headers = dataOrHeaders as Record<string, string> || {};
    } else if (urlOrData && typeof urlOrData === 'string' && httpMethods.includes(urlOrData)) {
      // 譌ｧ蠖｢蠑上・莠呈鋤諤ｧ邯ｭ謖・ apiRequest('POST', '/api/endpoint', {data})
      // 隴ｦ蜻翫Γ繝・そ繝ｼ繧ｸ繧定｡ｨ遉ｺ縺励↑縺・ｼ亥酔縺伜ｮ溯｣・ｒ菴ｿ縺｣縺ｦ縺・ｋ縺ｮ縺ｧ隴ｦ蜻翫ｒ豸医☆・・
      method = urlOrData;
      url = methodOrUrl;
      data = dataOrHeaders;
      headers = customHeaders || {};
    } else if (urlOrData && typeof urlOrData === 'string') {
      // URL繝代せ縺ｨ蜷井ｽ薙＆縺帙ｋ繧ｱ繝ｼ繧ｹ: apiRequest('/api', '/endpoint')
      url = `${methodOrUrl}${urlOrData}`;
    }
  }

  // Content-Type縺ｨAuthorization繝倥ャ繝繝ｼ繧定ｿｽ蜉
  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  // 繧ｻ繝・す繝ｧ繝ｳ繧ｯ繝・く繝ｼ繧貞性繧√ｋ縺溘ａ縺ｮ險ｭ螳夲ｼ・redentials繝倥ャ繝繝ｼ縺ｯ騾∽ｿ｡縺励↑縺・ｼ・
  headers['Cache-Control'] = 'no-cache';

  // 逶ｸ蟇ｾ繝代せ縺ｮ蝣ｴ蜷医・API_BASE_URL縺ｨ邨仙粋
  const fullUrl = url.startsWith('/') ? buildApiUrl(url) : url;

  // 繝悶Λ繧ｦ繧ｶ繧ｭ繝｣繝・す繝･蟇ｾ遲也畑縺ｮ繧ｿ繧､繝繧ｹ繧ｿ繝ｳ繝励ヱ繝ｩ繝｡繝ｼ繧ｿ繧定ｿｽ蜉
  const urlWithCache = fullUrl.includes('?') 
    ? `${fullUrl}&_t=${Date.now()}` 
    : `${fullUrl}?_t=${Date.now()}`;

  // 菫ｮ豁｣: URL縺ｮ繝代・繧ｹ繧ｨ繝ｩ繝ｼ繧帝亟縺舌◆繧√√・繝ｼ繝育分蜿ｷ縺ｨ繝代せ繧堤｢ｺ隱・
  if (!fullUrl.startsWith('http') && !fullUrl.startsWith('/')) {
    console.error('荳肴ｭ｣縺ｪURL:', fullUrl);
  }

  console.log('剥 API繝ｪ繧ｯ繧ｨ繧ｹ繝亥ｮ溯｡・', { 
    method, 
    url: urlWithCache, 
    hasData: !!data,
    headers,
    // 霑ｽ蜉縺ｮ繝・ヰ繝・げ諠・ｱ
    fullUrl: urlWithCache,
    baseUrl: window.location.origin,
    isRelative: url.startsWith('/'),
    isAbsolute: url.startsWith('http'),
    // 繝ｪ繧ｯ繧ｨ繧ｹ繝医・隧ｳ邏ｰ
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
      // 繧ｭ繝｣繝・す繝･蛻ｶ蠕｡繧定ｿｽ蜉
      cache: method === 'GET' ? 'no-cache' : 'default'
    });

    console.log('藤 API繝ｬ繧ｹ繝昴Φ繧ｹ蜿嶺ｿ｡:', { 
      url: urlWithCache,
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
      headers: Object.fromEntries(res.headers.entries()),
      cookies: res.headers.get('set-cookie'),
      timestamp: new Date().toISOString()
    });

    // 繧ｨ繝ｩ繝ｼ繝ｬ繧ｹ繝昴Φ繧ｹ縺ｮ隧ｳ邏ｰ繝ｭ繧ｰ
    if (!res.ok) {
      let errorText = res.statusText;
      try {
        const clonedRes = res.clone();
        errorText = await clonedRes.text();
      } catch (e) {
        console.warn('Error reading error response body:', e);
      }
      console.error('笶・API繧ｨ繝ｩ繝ｼ繝ｬ繧ｹ繝昴Φ繧ｹ:', {
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
    console.error('笶・API繝ｪ繧ｯ繧ｨ繧ｹ繝医お繝ｩ繝ｼ:', {
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
    // 繝√Ε繝・ヨ繧ｯ繝ｪ繧｢蠕後・蠑ｷ蛻ｶ逧・↓遨ｺ驟榊・繧定ｿ斐☆
    if (
      (queryKey[0] as string).includes('/api/chats') && 
      (queryKey[0] as string).includes('/messages')
    ) {
      const chatClearedTimestamp = localStorage.getItem('chat_cleared_timestamp');
      if (chatClearedTimestamp) {
        const clearTime = parseInt(chatClearedTimestamp);
        const now = Date.now();
        // 繧ｯ繝ｪ繧｢縺励※縺九ｉ10遘剃ｻ･蜀・↑繧牙ｼｷ蛻ｶ逧・↓遨ｺ驟榊・繧定ｿ斐☆
        if (now - clearTime < 10000) {
          console.log('繧ｯ繧ｨ繝ｪ繧ｭ繝｣繝・す繝･繧ｯ繝ｪ繧｢逶ｴ蠕後・縺溘ａ繝｡繝・そ繝ｼ繧ｸ繧堤ｩｺ縺ｫ縺励∪縺・);
          return [];
        }
      }
    }

    // 繧ｯ繧ｨ繝ｪ繧ｭ繝ｼ縺ｫ繧ｭ繝｣繝・す繝･繝舌せ繝・ぅ繝ｳ繧ｰ繝代Λ繝｡繝ｼ繧ｿ繧定ｿｽ蜉
    let url = queryKey[0] as string;
    const timestamp = Date.now();
    url = url.includes('?') ? `${url}&_t=${timestamp}` : `${url}?_t=${timestamp}`;

    console.log('剥 繧ｯ繧ｨ繝ｪ螳溯｡・', { url, timestamp });

    const res = await fetch(url, {
      credentials: "include",
      cache: "no-cache", // 繝悶Λ繧ｦ繧ｶ繧ｭ繝｣繝・す繝･繧剃ｽｿ逕ｨ縺励↑縺・
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    console.log('藤 繝ｬ繧ｹ繝昴Φ繧ｹ蜿嶺ｿ｡:', { 
      url, 
      status: res.status, 
      statusText: res.statusText,
      contentType: res.headers.get('content-type')
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    // 繧ｭ繝｣繝・す繝･繧ｯ繝ｪ繧｢繝倥ャ繝繝ｼ繧偵メ繧ｧ繝・け
    if (res.headers.get('X-Chat-Cleared') === 'true') {
      console.log('繧ｯ繧ｨ繝ｪ螳溯｡御ｸｭ縺ｫ繧ｭ繝｣繝・す繝･繧ｯ繝ｪ繧｢謖・､ｺ繧貞女菫｡: 遨ｺ驟榊・繧定ｿ斐＠縺ｾ縺・);
      // 繧ｯ繝ｪ繧｢繝輔Λ繧ｰ縺御ｻ倥＞縺ｦ縺・ｋ蝣ｴ蜷医・遨ｺ驟榊・繧定ｿ斐☆
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
          staleTime: 60000, // 1蛻・俣縺ｯ繧ｭ繝｣繝・す繝･繧剃ｽｿ逕ｨ
          retry: false,
          refetchOnMount: true, // 繧ｳ繝ｳ繝昴・繝阪Φ繝医′繝槭え繝ｳ繝医＆繧後ｋ縺溘・縺ｫ蜀榊叙蠕・
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

  // 繝・・繝ｭ繧､繝｡繝ｳ繝育腸蠅・〒縺ｯ讓呎ｺ悶・繝ｼ繝医ｒ菴ｿ逕ｨ縲・幕逋ｺ迺ｰ蠅・〒縺ｯ5000逡ｪ繝昴・繝医ｒ菴ｿ逕ｨ
  let wsUrl;
  if (window.location.hostname.includes('replit.app') || window.location.hostname.includes('replit.dev')) {
    // Replit繝・・繝ｭ繧､繝｡繝ｳ繝育腸蠅・
    wsUrl = `${protocol}//${host}/ws?token=${token}`;
  } else {
    // 髢狗匱迺ｰ蠅・
    const port = window.location.port || '5000';
    wsUrl = `${protocol}//${host}:${port}/ws?token=${token}`;
  }

  console.log('WebSocket謗･邯壹ｒ髢句ｧ・', wsUrl);

  try {
    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';  // 繝舌う繝翫Μ繝・・繧ｿ縺ｮ鬮倬溷・逅・
    return ws;
  } catch (error) {
    console.error('WebSocket菴懈・繧ｨ繝ｩ繝ｼ:', error);
    throw error;
  }
};

// WebSocket謗･邯壹・繝・せ繝磯未謨ｰ
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
      console.error('WebSocket謗･邯壹ユ繧ｹ繝医お繝ｩ繝ｼ:', error);
      resolve(false);
    }
  });
}

// Placeholder function, assuming this is where message processing happens
export async function processMessage(text: string): Promise<string> {
  try {
    // 繧ｹ繝・ャ繝怜ｽ｢蠑上・繝ｬ繧ｹ繝昴Φ繧ｹ繧貞叙蠕・
    const response = await apiRequest('POST', '/api/chatgpt/steps', { text });
    const data = await response.json();
    if (data.steps) {
      // 繧ｹ繝・ャ繝怜ｽ｢蠑上・繝ｬ繧ｹ繝昴Φ繧ｹ繧呈紛蠖｢
      let formattedResponse = `${data.title}\n\n`;
      data.steps.forEach((step: { description: string }, index: number) => {
        formattedResponse += `${index + 1}. ${step.description}\n`;
      });
      return formattedResponse;
    } else {
      return data.response;
    }
  } catch (error) {
    console.error('繝｡繝・そ繝ｼ繧ｸ蜃ｦ逅・お繝ｩ繝ｼ:', error);
    return '繝｡繝・そ繝ｼ繧ｸ縺ｮ蜃ｦ逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲・;
  }
}
// The change request does not directly modify buildApiUrl but it relies on it, keep the original implementation of buildApiUrl function

// Replit迺ｰ蠅・ｒ閠・・縺励◆API URL讒狗ｯ・
function buildApiUrl(path: string): string {
  if (path.startsWith('http')) return path;
  
  // Replit迺ｰ蠅・〒縺ｯ蟆ら畑繝昴・繝医ｒ菴ｿ逕ｨ
  const isReplitEnvironment = window.location.hostname.includes('replit.dev') || window.location.hostname.includes('replit.app');
  
  if (isReplitEnvironment) {
    return `${window.location.protocol}//${window.location.hostname}:3000${path}`;
  }
  
  // 髢狗匱迺ｰ蠅・〒縺ｯ繝励Ο繧ｭ繧ｷ邨檎罰縺ｧ繧｢繧ｯ繧ｻ繧ｹ・育嶌蟇ｾ繝代せ繧剃ｽｿ逕ｨ・・
  const isDevelopment = import.meta.env.DEV || window.location.hostname.includes('localhost');
  
  if (isDevelopment) {
    console.log('笨・髢狗匱迺ｰ蠅・ 繝励Ο繧ｭ繧ｷ邨檎罰縺ｧ繧｢繧ｯ繧ｻ繧ｹ・育嶌蟇ｾ繝代せ・・);
    return path; // 逶ｸ蟇ｾ繝代せ繧剃ｽｿ逕ｨ縺励※繝励Ο繧ｭ繧ｷ邨檎罰縺ｧ繧｢繧ｯ繧ｻ繧ｹ
  }
  
  // 縺昴・莉悶・迺ｰ蠅・〒縺ｯ逶ｸ蟇ｾ繝代せ
  return `${window.location.origin}${path}`;
}
// API險ｭ螳・- VITE_API_BASE_URL縺ｮ縺ｿ繧剃ｽｿ逕ｨ
const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 迺ｰ蠅・､画焚縺ｮ螳夂ｾｩ
const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

console.log('剥 迺ｰ蠅・､画焚隧ｳ邏ｰ遒ｺ隱・', {
  VITE_API_BASE_URL,
  VITE_API_BASE_URL_TYPE: typeof VITE_API_BASE_URL,
  VITE_API_BASE_URL_LENGTH: VITE_API_BASE_URL?.length,
  isProduction,
  isDevelopment,
  NODE_ENV: import.meta.env.NODE_ENV,
  MODE: import.meta.env.MODE,
  BASE_URL: import.meta.env.BASE_URL,
  // 螳滄圀縺ｫ菴ｿ逕ｨ縺輔ｌ繧偽RL
  finalApiBaseUrl: VITE_API_BASE_URL || 'http://localhost:3001'
});

console.log('肌 API險ｭ螳・', {
  isProduction,
  isDevelopment,
  API_BASE_URL: VITE_API_BASE_URL || 'http://localhost:3001',
  // 繝・ヰ繝・げ逕ｨ・壼ｮ滄圀縺ｮ繝ｪ繧ｯ繧ｨ繧ｹ繝・RL繧堤｢ｺ隱・
  sampleAuthUrl: `${VITE_API_BASE_URL || 'http://localhost:3001'}/api/login`,
  // 霑ｽ蜉縺ｮ繝・ヰ繝・げ諠・ｱ
  location: window.location.href,
  origin: window.location.origin,
  hostname: window.location.hostname,
  protocol: window.location.protocol,
  // 螳滄圀縺ｮAPI URL繧呈ｧ狗ｯ峨＠縺ｦ遒ｺ隱・
  actualAuthUrl: `${VITE_API_BASE_URL || 'http://localhost:3001'}/api/login`,
  actualMeUrl: `${VITE_API_BASE_URL || 'http://localhost:3001'}/api/auth/me`,
  // 迺ｰ蠅・､画焚縺ｮ隧ｳ邏ｰ遒ｺ隱・
  envVars: {
    VITE_API_BASE_URL,
    NODE_ENV: import.meta.env.NODE_ENV,
    MODE: import.meta.env.MODE
  }
});

// API Base URL縺ｮ險ｭ螳・- VITE_API_BASE_URL縺ｮ縺ｿ繧剃ｽｿ逕ｨ
const API_BASE_URL = (() => {
  const isDevelopment = import.meta.env.DEV || window.location.hostname.includes('localhost');
  
  // 髢狗匱迺ｰ蠅・〒縺ｯ繝励Ο繧ｭ繧ｷ邨檎罰縺ｧ繧｢繧ｯ繧ｻ繧ｹ・育嶌蟇ｾ繝代せ繧剃ｽｿ逕ｨ・・
  if (isDevelopment) {
    console.log('笨・髢狗匱迺ｰ蠅・ 繝励Ο繧ｭ繧ｷ邨檎罰縺ｧ繧｢繧ｯ繧ｻ繧ｹ');
    return ''; // 遨ｺ譁・ｭ怜・縺ｧ逶ｸ蟇ｾ繝代せ繧剃ｽｿ逕ｨ
  }
  
  // 迺ｰ蠅・､画焚縺瑚ｨｭ螳壹＆繧後※縺・ｋ蝣ｴ蜷医・蜆ｪ蜈井ｽｿ逕ｨ
  if (VITE_API_BASE_URL && VITE_API_BASE_URL.trim() !== '') {
    console.log('笨・迺ｰ蠅・､画焚縺九ｉAPI_BASE_URL繧貞叙蠕・', VITE_API_BASE_URL);
    return VITE_API_BASE_URL;
  }
  
  // 繝・ヵ繧ｩ繝ｫ繝・
  return 'http://localhost:3001';
})();


