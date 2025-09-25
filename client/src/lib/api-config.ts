// 統一API設定
// 本番環境と開発環境のAPI接続を管理

// 環境変数からAPIベースURLを取得
const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE;

// 環境判定
const isDevelopment = import.meta.env.DEV || window.location.hostname.includes('localhost');
const isProduction = import.meta.env.PROD && !isDevelopment;
const isAzureStaticWebApp = /\.azurestaticapps\.net$/i.test(window.location.hostname);

// APIベースURLの決定
export const API_BASE_URL = (() => {
  // 環境変数が設定されている場合は最優先
  if (VITE_API_BASE_URL && VITE_API_BASE_URL.trim() !== '') {
    console.log('✅ 環境変数からAPI_BASE_URLを取得:', VITE_API_BASE_URL);
    return VITE_API_BASE_URL.replace(/\/$/, ''); // 末尾スラッシュを削除
  }

  // Azure Static Web Appの場合は相対パスを使用
  if (isAzureStaticWebApp) {
    console.log('✅ Azure Static Web App: 相対パスを使用');
    return '';
  }

  // 本番環境のデフォルト
  if (isProduction) {
    console.log('✅ 本番環境: デフォルトURLを使用');
    return 'https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net';
  }

  // 開発環境のデフォルト
  console.log('✅ 開発環境: localhostを使用');
  return 'http://localhost:8000';
})();

// APIエンドポイントの構築
export function buildApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  if (isAzureStaticWebApp) {
    // Azure Static Web Appの場合は相対パスでAPIプロキシを使用
    return `/api${cleanPath}`;
  }
  
  // ローカル開発環境でAPIサーバーが起動していない場合はモックレスポンスを返す
  if (isDevelopment && !API_BASE_URL.includes('localhost')) {
    console.log('🔧 ローカル開発環境: API接続をスキップ');
    return '/api/mock' + cleanPath;
  }
  
  // その他の場合は絶対URLを使用
  return `${API_BASE_URL}/api${cleanPath}`;
}

// 設定情報のログ出力
console.log('🔧 API設定詳細:', {
  VITE_API_BASE_URL,
  API_BASE_URL,
  isDevelopment,
  isProduction,
  isAzureStaticWebApp,
  hostname: window.location.hostname,
  exampleUrl: buildApiUrl('/health')
});

export default {
  API_BASE_URL,
  buildApiUrl,
  isDevelopment,
  isProduction,
  isAzureStaticWebApp
};
