/// API險ｭ螳・
const isProduction = import.meta.env.PROD && !window.location.hostname.includes('localhost');
const isDevelopment = import.meta.env.DEV || window.location.hostname.includes('localhost');

// Replit迺ｰ蠅・・讀懷・
const isReplitEnvironment = window.location.hostname.includes('replit.dev') || window.location.hostname.includes('replit.app');

// Azure迺ｰ蠅・・讀懷・
const isAzureEnvironment = window.location.hostname.includes('azurewebsites.net') || 
                          window.location.hostname.includes('azurestaticapps.net') || 
                          window.location.hostname.includes('azure.com');

// API Base URL縺ｮ險ｭ螳・
// 髢狗匱迺ｰ蠅・〒縺ｯ繝励Ο繧ｭ繧ｷ邨檎罰縺ｧ繧｢繧ｯ繧ｻ繧ｹ
export const API_BASE_URL = (() => {
  console.log('剥 迺ｰ蠅・､画焚遒ｺ隱・', {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_API_BASE_URL_TYPE: typeof import.meta.env.VITE_API_BASE_URL,
    VITE_API_BASE_URL_LENGTH: import.meta.env.VITE_API_BASE_URL?.length,
    NODE_ENV: import.meta.env.NODE_ENV,
    MODE: import.meta.env.MODE
  });
  
  // 迺ｰ蠅・､画焚縺瑚ｨｭ螳壹＆繧後※縺・ｋ蝣ｴ蜷医・譛蜆ｪ蜈井ｽｿ逕ｨ
  if (import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim() !== '') {
    console.log('笨・迺ｰ蠅・､画焚縺九ｉAPI_BASE_URL繧貞叙蠕・', import.meta.env.VITE_API_BASE_URL);
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // 髢狗匱迺ｰ蠅・〒縺ｯ繝励Ο繧ｭ繧ｷ邨檎罰縺ｧ繧｢繧ｯ繧ｻ繧ｹ・育嶌蟇ｾ繝代せ繧剃ｽｿ逕ｨ・・
  if (isDevelopment) {
    console.log('笨・髢狗匱迺ｰ蠅・ 繝励Ο繧ｭ繧ｷ邨檎罰縺ｧ繧｢繧ｯ繧ｻ繧ｹ');
    return ''; // 遨ｺ譁・ｭ怜・縺ｧ逶ｸ蟇ｾ繝代せ繧剃ｽｿ逕ｨ
  }
  
  // 譛ｬ逡ｪ迺ｰ蠅・・蝣ｴ蜷・
  if (isProduction) {
    if (isAzureEnvironment) {
      // Azure Static Web Apps 縺ｧ縺ｮAPI Functions繧剃ｽｿ逕ｨ
      console.log('笨・Azure Static Web Apps迺ｰ蠅・ API Functions繧剃ｽｿ逕ｨ');
      return window.location.origin; // 蜷後§繝峨Γ繧､繝ｳ縺ｮAPI Functions繧剃ｽｿ逕ｨ
    }
    if (isReplitEnvironment) {
      return `${window.location.protocol}//${window.location.hostname.split(':')[0]}:3000`;
    }
    // 縺昴・莉悶・譛ｬ逡ｪ迺ｰ蠅・
    return window.location.origin;
  }
  
  // 繝・ヵ繧ｩ繝ｫ繝・
  console.log('笞・・繝・ヵ繧ｩ繝ｫ繝亥､繧剃ｽｿ逕ｨ');
  return 'http://localhost:3001';
})();

console.log('肌 API險ｭ螳夊ｩｳ邏ｰ:', {
  isReplitEnvironment,
  isAzureEnvironment,
  isProduction,
  isDevelopment,
  currentHostname: window.location.hostname,
  currentProtocol: window.location.protocol,
  finalApiBaseUrl: API_BASE_URL,
  envVars: {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL, // 菴ｿ逕ｨ荳ｭ: API縺ｮ繝吶・繧ｹURL
    NODE_ENV: import.meta.env.NODE_ENV, // 菴ｿ逕ｨ荳ｭ: 迺ｰ蠅・愛蛻･
    MODE: import.meta.env.MODE // 菴ｿ逕ｨ荳ｭ: 繝薙Ν繝峨Δ繝ｼ繝・
  }
});

// API繧ｨ繝ｳ繝峨・繧､繝ｳ繝医・讒狗ｯ・
export const buildApiUrl = (endpoint: string): string => {
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  console.log(`迫 API URL讒狗ｯ・ ${endpoint} -> ${fullUrl}`);
  return fullUrl;
};

// 繝・ヰ繝・げ逕ｨ・夂腸蠅・､画焚縺ｮ迥ｶ諷九ｒ隧ｳ邏ｰ縺ｫ繝ｭ繧ｰ蜃ｺ蜉・
console.log('剥 迺ｰ蠅・､画焚隧ｳ邏ｰ遒ｺ隱・', {
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_API_BASE_URL_TYPE: typeof import.meta.env.VITE_API_BASE_URL,
  VITE_API_BASE_URL_LENGTH: import.meta.env.VITE_API_BASE_URL?.length,
  isProduction,
  isDevelopment,
  NODE_ENV: import.meta.env.NODE_ENV,
  MODE: import.meta.env.MODE,
  BASE_URL: import.meta.env.BASE_URL,
  // 螳滄圀縺ｫ菴ｿ逕ｨ縺輔ｌ繧偽RL
  finalApiBaseUrl: API_BASE_URL,
  // 霑ｽ蜉縺ｮ繝・ヰ繝・げ諠・ｱ
  location: window.location.href,
  origin: window.location.origin,
  hostname: window.location.hostname
});

console.log('肌 API險ｭ螳・', {
  isProduction,
  isDevelopment,
  API_BASE_URL,
  // 繝・ヰ繝・げ逕ｨ・壼ｮ滄圀縺ｮ繝ｪ繧ｯ繧ｨ繧ｹ繝・RL繧堤｢ｺ隱・
  sampleAuthUrl: buildApiUrl('/api/login'),
  // 霑ｽ蜉縺ｮ繝・ヰ繝・げ諠・ｱ
  location: window.location.href,
  origin: window.location.origin,
  hostname: window.location.hostname,
  protocol: window.location.protocol,
  // 螳滄圀縺ｮAPI URL繧呈ｧ狗ｯ峨＠縺ｦ遒ｺ隱・
  actualAuthUrl: buildApiUrl('/api/login'),
  actualMeUrl: buildApiUrl('/api/auth/me'),
  // 迺ｰ蠅・､画焚縺ｮ隧ｳ邏ｰ遒ｺ隱・
  envVars: {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    NODE_ENV: import.meta.env.NODE_ENV,
    MODE: import.meta.env.MODE
  }
});

// 隱崎ｨｼAPI繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
export const AUTH_API = {
  LOGIN: buildApiUrl('/api/auth/login'),
  LOGOUT: buildApiUrl('/api/auth/logout'),
  ME: buildApiUrl('/api/auth/me'),
  // 繝・ヰ繝・げ逕ｨ繝・せ繝医お繝ｳ繝峨・繧､繝ｳ繝・
  TEST: buildApiUrl('/api/health'),
};

// 繝翫Ξ繝・ず繝吶・繧ｹAPI繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
export const KNOWLEDGE_API = {
  BASE: buildApiUrl('/api/knowledge'),
  GPT_DATA: buildApiUrl('/api/knowledge/gpt/data'),
  FUSE_IMAGES: buildApiUrl('/api/knowledge/fuse/images'),
  TROUBLESHOOTING_FLOWS: buildApiUrl('/api/knowledge/troubleshooting/flows'),
  SHARED_DATA: (type: string) => buildApiUrl(`/api/knowledge/shared/${type}`),
  IMAGES: (category: string, filename: string) => buildApiUrl(`/api/knowledge/images/${category}/${filename}`),
};

// 繝√Ε繝・ヨAPI繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
export const CHAT_API = {
  CHATGPT: buildApiUrl('/api/chatgpt'),
  HEALTH: buildApiUrl('/api/health'),
};

// 險ｭ螳壽ュ蝣ｱ
export const API_CONFIG = {
  isProduction,
  isDevelopment,
  baseUrl: API_BASE_URL,
  timeout: 30000, // 30遘・
  retryAttempts: 3,
};

// API 繝ｪ繧ｯ繧ｨ繧ｹ繝育畑縺ｮ繝吶・繧ｹ繧ｪ繝励す繝ｧ繝ｳ
export const API_REQUEST_OPTIONS = {
  credentials: 'include' as RequestCredentials, // 繧ｻ繝・す繝ｧ繝ｳ邯ｭ謖√・縺溘ａ蠢・・
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Cache-Control': 'no-cache',
    'X-Requested-With': 'XMLHttpRequest'
  }
};


