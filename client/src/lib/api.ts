// 統一APIクライアント - シンプル版（改善版）
// ローカル開発・本番環境対応

// 環境判定
const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

const normalizeBaseUrl = (baseUrl: string): string => baseUrl.trim().replace(/\/+$/, '');

const normalizeRuntimeBaseUrl = (baseUrl?: string): string => {
    if (!baseUrl) {
        return '';
    }

    return normalizeBaseUrl(baseUrl);
};

const normalizeApiPath = (path: string): string => {
    let cleanPath = path.startsWith('/') ? path : `/${path}`;

    if (cleanPath.startsWith('/api/')) {
        cleanPath = cleanPath.substring(4);
    }

    return cleanPath;
};

// APIベースURL決定（シンプル版）
// 実行時に毎回評価して、window.runtimeConfigが確実に反映されるようにする
export const getApiBaseUrl = (): string => {
    // window.runtimeConfigが設定されている場合は最優先（index.htmlで設定される）
    if (typeof window !== 'undefined' && (window as any).runtimeConfig?.API_BASE_URL) {
        const runtimeBaseUrl = normalizeRuntimeBaseUrl((window as any).runtimeConfig.API_BASE_URL);
        if (runtimeBaseUrl && runtimeBaseUrl !== '/api') {
            return runtimeBaseUrl;
        }
    }

    const configuredBaseUrl =
        import.meta.env.VITE_API_URL ||
        import.meta.env.VITE_API_BASE_URL ||
        import.meta.env.VITE_BACKEND_SERVICE_URL ||
        import.meta.env.VITE_SERVER_URL;

    // 環境変数が設定されている場合は優先使用
    if (configuredBaseUrl) {
        return normalizeBaseUrl(configuredBaseUrl);
    }

    // 開発・その他では相対パス（統合サーバーを使用）
    return '';
};

// API URL構築（改善版 - パス重複を防止）
// 実行時に毎回getApiBaseUrl()を呼び出して、最新の設定を取得
export const buildApiUrl = (path: string): string => {
    const cleanPath = normalizeApiPath(path);
    const apiBaseUrl = getApiBaseUrl(); // 実行時に毎回取得

    if (apiBaseUrl) {
        if (apiBaseUrl.endsWith('/api')) {
            const finalUrl = `${apiBaseUrl}${cleanPath}`;
            console.log(`🔗 API URL (base has /api): ${path} -> ${finalUrl}`);
            return finalUrl;
        }

        const finalUrl = `${apiBaseUrl}/api${cleanPath}`;
        console.log(`🔗 API URL (add /api): ${path} -> ${finalUrl}`);
        return finalUrl;
    } else {
        // 開発環境: 相対パス（Viteプロキシが /api を http://localhost:8080 に転送）
        const finalUrl = `/api${cleanPath}`;
        console.log(`🔗 API URL (relative, via Vite proxy): ${path} -> ${finalUrl}`);
        return finalUrl;
    }
};

// 認証トークン取得
const getAuthToken = (): string | null => {
    return localStorage.getItem('authToken');
};

// 統一APIリクエスト関数
export const apiRequest = async <T = any>(
    path: string,
    options: RequestInit = {}
): Promise<T> => {
    const url = buildApiUrl(path);
    const token = getAuthToken();

    const config: RequestInit = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers,
        },
        credentials: 'include',
        mode: 'cors',
    };

    console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);

    try {
        const response = await fetch(url, config);

        if (!response.ok) {
            let errorMessage = `API Error ${response.status}: ${response.statusText}`;
            try {
                // テキストとして読み取り、その後JSONパースを試みる
                const errorText = await response.text();
                try {
                    const errorData = JSON.parse(errorText);
                    console.error(`❌ API Error Response:`, errorData);
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch {
                    // JSONパースに失敗した場合はテキストをそのまま使用
                    console.error(`❌ API Error: ${response.status} ${response.statusText} - ${errorText}`);
                    errorMessage = errorText || errorMessage;
                }
            } catch (err) {
                console.error(`❌ Failed to read error response:`, err);
            }

            if (response.status === 401) {
                localStorage.removeItem('authToken');
                throw new Error('AUTHENTICATION_ERROR');
            }

            throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log(`✅ API Response: ${options.method || 'GET'} ${url}`, data);

        // サーバーがsuccess: falseを返している場合でもHTTP 200の場合がある
        if (data && typeof data === 'object' && 'success' in data && data.success === false) {
            const errorMessage = data.error || data.message || 'Unknown error';
            console.error(`❌ API returned success: false:`, errorMessage);
            throw new Error(errorMessage);
        }

        return data;
    } catch (error) {
        console.error(`❌ API Request Failed: ${options.method || 'GET'} ${url}`, error);

        // ネットワーク未解決等で失敗した場合のフォールバック（本番のみ）
        // DNS未解決/TypeError: Failed to fetch 時に絶対URL→相対URLで再試行
        try {
            const base = getApiBaseUrl();
            if (base && error instanceof TypeError) {
                let cleanPath = path.startsWith('/') ? path : `/${path}`;
                if (cleanPath.startsWith('/api/')) {
                    cleanPath = cleanPath.substring(4);
                }
                const fallbackUrl = `/api${cleanPath}`;
                console.warn(`⚠️ Fallback API retry: ${fallbackUrl} (original failed: ${url})`);
                const retryResponse = await fetch(fallbackUrl, config);
                if (retryResponse.ok) {
                    const retryData = await retryResponse.json();
                    console.log(`✅ Fallback API Response: ${options.method || 'GET'} ${fallbackUrl}`);
                    return retryData;
                } else {
                    console.warn(`⚠️ Fallback API also failed: ${retryResponse.status} ${retryResponse.statusText}`);
                }
            }
        } catch (fallbackError) {
            console.warn('⚠️ Fallback attempt threw error:', fallbackError);
        }
        throw error;
    }
};

// HTTPメソッドヘルパー
export const api = {
    get: <T = any>(path: string) => apiRequest<T>(path, { method: 'GET' }),
    post: <T = any>(path: string, data?: any) =>
        apiRequest<T>(path, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined
        }),
    put: <T = any>(path: string, data?: any) =>
        apiRequest<T>(path, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined
        }),
    delete: <T = any>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};

// 認証関連API（後方互換性のため）
export const authApi = {
    login: (credentials: { username: string; password: string; appId?: string; tenantId?: string }) =>
        api.post('/auth/login', credentials),
    logout: () => api.post('/auth/logout'),
    me: () => api.get('/auth/me'),
};

// 完全な後方互換性のためのエイリアス
export const userApi = {
    get: <T = any>(path: string) => apiRequest<T>(path, { method: 'GET' }),
    post: <T = any>(path: string, data?: any) =>
        apiRequest<T>(path, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined
        }),
    put: <T = any>(path: string, data?: any) =>
        apiRequest<T>(path, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined
        }),
    delete: <T = any>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
    login: (credentials: { username: string; password: string; tenantId?: string; appId?: string }) =>
        apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        }),
};

export const auth = {
    login: (credentials: { username: string; password: string; tenantId?: string; appId?: string }) =>
        userApi.post('/auth/login', credentials),
    logout: () => userApi.post('/auth/logout'),
    me: () => userApi.get('/auth/me'),
    getCurrentUser: () => userApi.get('/auth/me'),
    handshake: () => Promise.resolve({ valid: true }), // 簡略化
};

export const storage = {
    list: (prefix: string) => api.get(`/storage/list?prefix=${encodeURIComponent(prefix)}`),
    getJson: (name: string) => api.get(`/storage/json/${encodeURIComponent(name)}`),
    putJson: (name: string, data: any, etag?: string) => {
        const headers = etag ? { 'If-Match': etag } : {};
        return apiRequest(`/storage/json/${encodeURIComponent(name)}`, {
            method: 'PUT',
            body: JSON.stringify(data),
            headers
        });
    },
    getImageUrl: (name: string) => api.get(`/storage/image-url?name=${encodeURIComponent(name)}`),
};

// ヘルスチェック機能
export const health = {
    check: () => api.get('/health').then(() => true).catch(() => false),
};

// 設定をログ出力（実行時に評価）
setTimeout(() => {
    console.log('🔧 Simple API Client:', {
        isDevelopment,
        isProduction,
        API_BASE_URL: getApiBaseUrl(),
        runtimeConfig: typeof window !== 'undefined' ? (window as any).runtimeConfig : undefined,
        VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
        exampleUrl: buildApiUrl('/health'),
        loginUrl: buildApiUrl('/auth/login')
    });
}, 100); // window.runtimeConfigが設定されるまで少し待つ

export default api;
