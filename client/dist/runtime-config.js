// 動的環墁E��宁E
// Trigger deploy: noop comment updated at runtime
// Version: 2025-12-02T12:00:00+09:00
(function () {
  const isLocalhost = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('localhost');

  const isAzureStaticWebApp = window.location.hostname.includes('azurestaticapps.net');

  // 環墁E��設宁E
  let config;

  if (isLocalhost) {
    // ローカル開発環墁E ホットリロード統合サーバ�E使用
    config = {
      "API_BASE_URL": "http://localhost:8080/api",
      "CORS_ALLOW_ORIGINS": "http://localhost:5173,http://localhost:8080",
      "ENVIRONMENT": "development"
    };
  } else if (isAzureStaticWebApp) {
    // Azure Static Web Apps: App ServiceバックエンドAPI使用
    // CORS_ALLOW_ORIGINSは現在のオリジンを使用�E�動皁E��E
    // https://emergency-assistantapp-gwgscxcca5cahyb9.japanwest-01.azurewebsites.net/api はチE�Eロイ時に VITE_API_BASE_URL で置換される
    let apiBaseUrl = "https://emergency-assistantapp-gwgscxcca5cahyb9.japanwest-01.azurewebsites.net/api";
    
    // PLACEHOLDER が置換されてぁE��ぁE��合�Eフォールバック
    if (apiBaseUrl === "https://emergency-assistantapp-gwgscxcca5cahyb9.japanwest-01.azurewebsites.net/api" || apiBaseUrl.includes("PLACEHOLDER")) {
      console.warn('⚠�E�Ehttps://emergency-assistantapp-gwgscxcca5cahyb9.japanwest-01.azurewebsites.net/api was not replaced during build');
      console.warn('⚠�E�EAttempting to use default Azure App Service URL...');
      
      // チE��ォルト�EAzure App Service URL�E�環墁E��数から取得また�E固定値�E�E
      // 実際のApp Service名に置き換えてください
      apiBaseUrl = "https://emergency-assistantapp-gwgscxcca5cahyb9.japanwest-01.azurewebsites.net/api";
      
      console.log('🔄 Fallback API_BASE_URL:', apiBaseUrl);
    }
    
    config = {
      "API_BASE_URL": apiBaseUrl,
      "CORS_ALLOW_ORIGINS": window.location.origin,
      "ENVIRONMENT": "production"
    };
  } else {
    // そ�E他�E環墁E Static Web App統吁Eunctions使用
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
