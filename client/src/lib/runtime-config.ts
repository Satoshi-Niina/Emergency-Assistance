// Runtime configuration loader
// ビルド時ではなく実行時に環境変数を読み込む

interface RuntimeConfig {
  API_BASE_URL: string;
  CORS_ALLOW_ORIGINS: string;
}

// グローバルなruntime configを宣言
declare global {
  interface Window {
    runtimeConfig?: RuntimeConfig;
  }
}

// Runtime configの取得
export function getRuntimeConfig(): RuntimeConfig {
  // ブラウザ環境でwindow.runtimeConfigが利用可能な場合
  if (typeof window !== 'undefined' && window.runtimeConfig) {
    return window.runtimeConfig;
  }

  // フォールバック設定
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname.includes('localhost') || 
     window.location.hostname.includes('127.0.0.1'));

  return {
    // 開発時は Vite のプロキシを想定して相対 /api を使う
    API_BASE_URL: '/api',
    CORS_ALLOW_ORIGINS: '*'
  };
}

// API Base URLの取得
export function getApiBaseUrl(): string {
  const config = getRuntimeConfig();
  return config.API_BASE_URL;
}

// 設定のログ出力（デバッグ用）
export function logRuntimeConfig(): void {
  if (typeof window !== 'undefined') {
    const config = getRuntimeConfig();
    console.log('🔧 Runtime Config:', {
      API_BASE_URL: config.API_BASE_URL,
      CORS_ALLOW_ORIGINS: config.CORS_ALLOW_ORIGINS,
      windowRuntimeConfig: window.runtimeConfig,
      currentLocation: window.location.href
    });
  }
}

// 初期化時にログ出力
if (typeof window !== 'undefined') {
  logRuntimeConfig();
}
