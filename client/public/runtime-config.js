// 蜍慕噪迺ｰ蠅・ｨｭ螳・
// Trigger deploy: noop comment updated at runtime
// Version: 2025-12-02T12:00:00+09:00
(function () {
  const isLocalhost = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('localhost');

  const isAzureStaticWebApp = window.location.hostname.includes('azurestaticapps.net');

  // 迺ｰ蠅・挨險ｭ螳・
  let config;

  if (isLocalhost) {
    // 繝ｭ繝ｼ繧ｫ繝ｫ髢狗匱迺ｰ蠅・ 繝帙ャ繝医Μ繝ｭ繝ｼ繝臥ｵｱ蜷医し繝ｼ繝舌・菴ｿ逕ｨ
    config = {
      "API_BASE_URL": "http://localhost:8080/api",
      "CORS_ALLOW_ORIGINS": "http://localhost:5173,http://localhost:8080",
      "ENVIRONMENT": "development"
    };
  } else if (isAzureStaticWebApp) {
    // Azure Static Web Apps: App Service繝舌ャ繧ｯ繧ｨ繝ｳ繝陰PI菴ｿ逕ｨ
    // CORS_ALLOW_ORIGINS縺ｯ迴ｾ蝨ｨ縺ｮ繧ｪ繝ｪ繧ｸ繝ｳ繧剃ｽｿ逕ｨ・亥虚逧・ｼ・
    // PLACEHOLDER_API_BASE_URL 縺ｯ繝・・繝ｭ繧､譎ゅ↓ VITE_API_BASE_URL 縺ｧ鄂ｮ謠帙＆繧後ｋ
    let apiBaseUrl = "PLACEHOLDER_API_BASE_URL";
    
    // PLACEHOLDER 縺檎ｽｮ謠帙＆繧後※縺・↑縺・ｴ蜷医・繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ
    if (apiBaseUrl === "PLACEHOLDER_API_BASE_URL" || apiBaseUrl.includes("PLACEHOLDER")) {
      console.warn('笞・・PLACEHOLDER_API_BASE_URL was not replaced during build');
      console.warn('笞・・Attempting to use default Azure App Service URL...');
      
      // 繝・ヵ繧ｩ繝ｫ繝医・Azure App Service URL・育腸蠅・､画焚縺九ｉ蜿門ｾ励∪縺溘・蝗ｺ螳壼､・・
      // 螳滄圀縺ｮApp Service蜷阪↓鄂ｮ縺肴鋤縺医※縺上□縺輔＞
      apiBaseUrl = "https://emergency-assistantapp-gwgscxcca5cahyb9.japanwest-01.azurewebsites.net/api";
      
      console.log('売 Fallback API_BASE_URL:', apiBaseUrl);
    }
    
    config = {
      "API_BASE_URL": apiBaseUrl,
      "CORS_ALLOW_ORIGINS": window.location.origin,
      "ENVIRONMENT": "production"
    };
  } else {
    // 縺昴・莉悶・迺ｰ蠅・ Static Web App邨ｱ蜷・unctions菴ｿ逕ｨ
    config = {
      "API_BASE_URL": "/api",
      "CORS_ALLOW_ORIGINS": "*",
      "ENVIRONMENT": "production"
    };
  }

  console.log('肌 Runtime Config Applied:', {
    hostname: window.location.hostname,
    environment: config.ENVIRONMENT,
    "API_BASE_URL": config.API_BASE_URL,
    isAzureStaticWebApp: isAzureStaticWebApp,
    origin: window.location.origin
  });

  window.runtimeConfig = config;
})();
