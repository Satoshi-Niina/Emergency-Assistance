// 動的環境設定
// Trigger deploy: noop comment updated at runtime
// Version: 2025-12-02T12:00:00+09:00
(function () {
  const isLocalhost = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('localhost');

  const isAzureStaticWebApp = window.location.hostname.includes('azurestaticapps.net');

  // 環境別設定
  let config;

  if (isLocalhost) {
    // ローカル開発環境: ホットリロード統合サーバー使用
    config = {
      "API_BASE_URL": "",
      "CORS_ALLOW_ORIGINS": "http://localhost:5173,http://localhost:8080",
      "ENVIRONMENT": "development"
    };
  } else if (isAzureStaticWebApp) {
    // Azure Static Web Apps: App ServiceバックエンドAPI使用
    // CORS_ALLOW_ORIGINSは現在のオリジンを使用（動的）
    // PLACEHOLDER_API_BASE_URL はデプロイ時に VITE_API_BASE_URL で置換される
    let apiBaseUrl = "PLACEHOLDER_API_BASE_URL";

    // PLACEHOLDER が置換されていない場合のフォールバック
    if (apiBaseUrl === "PLACEHOLDER_API_BASE_URL" || apiBaseUrl.includes("PLACEHOLDER")) {
      console.warn('⚠️ PLACEHOLDER_API_BASE_URL was not replaced during build');
      console.warn('⚠️ Attempting to use default Azure App Service URL...');

      // デフォルトのAzure App Service URL（環境変数から取得した固定値）
      apiBaseUrl = "https://emergency-assistantapp.azurewebsites.net/api";

      console.log('ℹ️ Fallback API_BASE_URL:', apiBaseUrl);
    }

    config = {
      "API_BASE_URL": apiBaseUrl,
      "CORS_ALLOW_ORIGINS": window.location.origin,
      "ENVIRONMENT": "production"
    };
  } else {
    // その他の環境: Static Web App統合Functions使用
    config = {
      "API_BASE_URL": "/api",
      "CORS_ALLOW_ORIGINS": "*",
      "ENVIRONMENT": "production"
    };
  }

  console.log('🔧 Runtime Config Applied:', {
    hostname: window.location.hostname,
    environment: config.ENVIRONMENT,
    "API_BASE_URL": config.API_BASE_URL,
    isAzureStaticWebApp: isAzureStaticWebApp,
    origin: window.location.origin
  });

  window.runtimeConfig = config;
})();
