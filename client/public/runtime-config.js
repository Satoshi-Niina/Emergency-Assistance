// 動的環境設定
(function() {
  const isLocalhost = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.includes('localhost');
  
  const isAzureStaticWebApp = window.location.hostname.includes('azurestaticapps.net');
  
  // 環境別設定
  let config;
  
  if (isLocalhost) {
    // ローカル開発環境
    config = {
      "API_BASE_URL": "http://localhost:8081/api",
      "CORS_ALLOW_ORIGINS": "http://localhost:5173,http://localhost:8081",
      "ENVIRONMENT": "development"
    };
  } else if (isAzureStaticWebApp) {
    // Azure Static Web Apps（本番環境）
    config = {
      "API_BASE_URL": "/api", // Static Web Appのリライトルールを使用
      "CORS_ALLOW_ORIGINS": "https://witty-river-012f39e00.1.azurestaticapps.net,https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net",
      "ENVIRONMENT": "production"
    };
  } else {
    // その他の環境（フォールバック）
    config = {
      "API_BASE_URL": "/api",
      "CORS_ALLOW_ORIGINS": "*",
      "ENVIRONMENT": "unknown"
    };
  }
  
  console.log('🔧 Runtime Config Applied:', {
    hostname: window.location.hostname,
    environment: config.ENVIRONMENT,
    apiBaseUrl: config.API_BASE_URL
  });
  
  window.runtimeConfig = config;
})();