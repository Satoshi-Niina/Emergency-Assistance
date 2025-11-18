// 統一APIクライアント - シンプル版（改善版）
// ローカル開発・本番環境対応

// 環境判定
const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

// APIベースURL決定（シンプル版）
// 実行時に毎回評価して、window.runtimeConfigが確実に反映されるようにする
const getApiBaseUrl = (): string => {
    // window.runtimeConfigが設定されている場合は最優先（index.htmlで設定される）
    if (typeof window !== 'undefined' && (window as any).runtimeConfig?.API_BASE_URL) {
        return (window as any).runtimeConfig.API_BASE_URL;
    }

    // 環境変数が設定されていて、本番環境の場合のみ使用
    if (isProduction && import.meta.env.VITE_API_BASE_URL) {
        return import.meta.env.VITE_API_BASE_URL;
    }

    // 開発・その他では相対パス（統合サーバーを使用）
    return '';
};

// API URL構築（改善版 - パス重複を防止）
// 実行時に毎回getApiBaseUrl()を呼び出して、最新の設定を取得
export const buildApiUrl = (path: string): string => {
    // パスの正規化（先頭の/を確保）
    let cleanPath = path.startsWith('/') ? path : `/${path}`;

    // /api/auth/login のような形式の場合、/api プレフィックスを除去
    if (cleanPath.startsWith('/api/')) {
        cleanPath = cleanPath.substring(4); // '/api' を除去
    }

    const apiBaseUrl = getApiBaseUrl(); // 実行時に毎回取得

    if (apiBaseUrl) {
        // 絶対URLが設定されている場合
        const normalizedBaseUrl = apiBaseUrl.replace(/\/+$/, ''); // 末尾のスラッシュを除去

        // ベースURLが既に /api で終わっているかチェック
        if (normalizedBaseUrl.endsWith('/api')) {
            // ベースURLが /api で終わっている場合、そのままパスを追加
            const finalUrl = `${normalizedBaseUrl}${cleanPath}`;
            console.log(`🔗 API URL (base has /api): ${path} -> ${finalUrl}`);
            return finalUrl;
        } else {
            // /api を追加してパスを結合
            const finalUrl = `${normalizedBaseUrl}/api${cleanPath}`;
            console.log(`🔗 API URL (add /api): ${path} -> ${finalUrl}`);
            return finalUrl;
        }
    } else {
        // 開発環境: 相対パス（統合サーバーが処理）
        const finalUrl = `/api${cleanPath}`;
        console.log(`🔗 API URL (relative): ${path} -> ${finalUrl}`);
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
            const errorText = await response.text();
            console.error(`❌ API Error: ${response.status} ${response.statusText}`);

            if (response.status === 401) {
                localStorage.removeItem('authToken');
                throw new Error('AUTHENTICATION_ERROR');
            }

            throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log(`✅ API Response: ${options.method || 'GET'} ${url}`);
        return data;
    } catch (error) {
        console.error(`❌ API Request Failed: ${options.method || 'GET'} ${url}`, error);
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
    login: (credentials: { username: string; password: string }) =>
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
    login: (credentials: { username: string; password: string }) =>
        apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        }),
};

export const auth = {
    login: (credentials: { username: string; password: string }) =>
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
