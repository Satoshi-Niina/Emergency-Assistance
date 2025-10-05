// 動的環境設定
(function() {
  const isLocalhost = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.includes('localhost');
  
  const isAzureStaticWebApp = window.location.hostname.includes('azurestaticapps.net');
  
  // 環境別設定
  let config;
  
  if (isLocalhost) {
    // ローカル開発環境（Azure Functions Core Tools使用）
    config = {
      "API_BASE_URL": "http://localhost:7071/api",
      "CORS_ALLOW_ORIGINS": "http://localhost:5173,http://localhost:7071",
      "ENVIRONMENT": "development"
    };
  } else if (isAzureStaticWebApp) {
    // Azure Static Web Apps（本番環境、統合Functions使用）
    config = {
      "API_BASE_URL": "/api", // Static Web App統合Functions
      "CORS_ALLOW_ORIGINS": "https://witty-river-012f39e00.1.azurestaticapps.net",
      "ENVIRONMENT": "production"
    };
  } else {
    // その他の環境（Static Web App統合Functions使用）
    config = {
      "API_BASE_URL": "/api",
      "CORS_ALLOW_ORIGINS": "*",
      "ENVIRONMENT": "production"
    };
  }
  
  console.log('🔧 Runtime Config Applied:', {
    hostname: window.location.hostname,
    environment: config.ENVIRONMENT,
    apiBaseUrl: config.API_BASE_URL
  });
  
  window.runtimeConfig = config;
})();