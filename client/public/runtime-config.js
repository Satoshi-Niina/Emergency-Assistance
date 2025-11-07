// 動的環境設定
(function() {
  const isLocalhost = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.includes('localhost');
  
  const isAzureStaticWebApp = window.location.hostname.includes('azurestaticapps.net');
  
  // 環境別設定
  let config;
  
  if (isLocalhost) {
    // ローカル開発環境: ホットリロード統合サーバー使用
    config = {
      "API_BASE_URL": "http://localhost:8080/api",
      "CORS_ALLOW_ORIGINS": "http://localhost:5173,http://localhost:8080",
      "ENVIRONMENT": "development"
    };
  } else if (isAzureStaticWebApp) {
    // Azure Static Web Apps: 本番環境で統合Functions使用
    // CORS_ALLOW_ORIGINSは現在のオリジンを使用（動的）
    config = {
      "API_BASE_URL": "/api",
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
  });
  
  window.runtimeConfig = config;
})();
