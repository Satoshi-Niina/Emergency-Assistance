import { apiRequest } from './queryClient';
import { LoginCredentials } from '@shared/schema';
import { AUTH_API } from './api/config';

/**
 * Login a user with the provided credentials
 * @param credentials The login credentials
 * @returns User data if login successful
 */
export const login = async (credentials: LoginCredentials) => {
  try {
    console.log('柏 繝ｭ繧ｰ繧､繝ｳ隧ｦ陦・', { username: credentials.username });
    console.log('藤 繝ｪ繧ｯ繧ｨ繧ｹ繝・RL:', AUTH_API.LOGIN);
    
    // 繝ｪ繧ｯ繧ｨ繧ｹ繝亥燕縺ｮ繝・ヰ繝・げ諠・ｱ
    console.log('倹 迴ｾ蝨ｨ縺ｮlocation:', {
      origin: window.location.origin,
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      port: window.location.port
    });
    
    // Azure Static Web Apps 縺ｮ繧ｳ繝ｼ繝ｫ繝峨せ繧ｿ繝ｼ繝亥ｯｾ遲・
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20遘偵ち繧､繝繧｢繧ｦ繝・
    
    const response = await fetch(AUTH_API.LOGIN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      credentials: 'include',
      signal: controller.signal,
      body: JSON.stringify(credentials)
    });
    
    clearTimeout(timeoutId);
    
    console.log('藤 繝ｭ繧ｰ繧､繝ｳ繝ｬ繧ｹ繝昴Φ繧ｹ:', { 
      status: response.status, 
      ok: response.ok,
      statusText: response.statusText,
      url: response.url
    });
    
    if (!response.ok) {
      let errorMessage = '隱崎ｨｼ繧ｨ繝ｩ繝ｼ';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
      } catch (parseError) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      
      console.error('笶・繝ｭ繧ｰ繧､繝ｳ繧ｨ繝ｩ繝ｼ:', {
        status: response.status,
        statusText: response.statusText,
        message: errorMessage
      });
      
      // 503繧ｨ繝ｩ繝ｼ縺ｮ蝣ｴ蜷医・迚ｹ蛻･縺ｪ繝｡繝・そ繝ｼ繧ｸ
      if (response.status === 503) {
        throw new Error('繝舌ャ繧ｯ繧ｨ繝ｳ繝峨し繝ｼ繝舌・縺悟茜逕ｨ縺ｧ縺阪∪縺帙ｓ縲ゅ＠縺ｰ繧峨￥蠕・▲縺ｦ縺九ｉ蜀崎ｩｦ陦後＠縺ｦ縺上□縺輔＞縲・);
      }
      
      if (response.status === 404) {
        throw new Error('隱崎ｨｼAPI縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ縲りｨｭ螳壹ｒ遒ｺ隱阪＠縺ｦ縺上□縺輔＞縲・);
      }
      
      throw new Error(errorMessage);
    }
    
    const userData = await response.json();
    console.log('笨・繝ｭ繧ｰ繧､繝ｳ謌仙粥:', userData);
    return userData;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('竢ｰ 繝ｭ繧ｰ繧､繝ｳ繧ｿ繧､繝繧｢繧ｦ繝・', error);
      throw new Error('繝ｭ繧ｰ繧､繝ｳ蜃ｦ逅・′繧ｿ繧､繝繧｢繧ｦ繝医＠縺ｾ縺励◆縲ゅロ繝・ヨ繝ｯ繝ｼ繧ｯ謗･邯壹ｒ遒ｺ隱阪＠縺ｦ縺上□縺輔＞縲・);
    }
    
    console.error('笶・Login error:', error);
    
    // 繝阪ャ繝医Ρ繝ｼ繧ｯ繧ｨ繝ｩ繝ｼ縺ｮ蝣ｴ蜷・
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('繝舌ャ繧ｯ繧ｨ繝ｳ繝峨し繝ｼ繝舌・縺ｫ謗･邯壹〒縺阪∪縺帙ｓ縲ゅロ繝・ヨ繝ｯ繝ｼ繧ｯ謗･邯壹ｒ遒ｺ隱阪＠縺ｦ縺上□縺輔＞縲・);
    }
    
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('繝ｭ繧ｰ繧､繝ｳ縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
  }
};

/**
 * Logout the current user
 */
export const logout = async () => {
  try {
    console.log('柏 繝ｭ繧ｰ繧｢繧ｦ繝郁ｩｦ陦・', AUTH_API.LOGOUT);
    
    const response = await fetch(AUTH_API.LOGOUT, {
      method: 'POST',
      credentials: 'include'
    });
  } catch (error) {
    console.error('Logout error:', error);
    throw new Error('繝ｭ繧ｰ繧｢繧ｦ繝医↓螟ｱ謨励＠縺ｾ縺励◆');
  }
};

/**
 * Get the current logged-in user
 * @returns User data or null if not logged in
 */
export const getCurrentUser = async () => {
  try {
    console.log('剥 getCurrentUser API蜻ｼ縺ｳ蜃ｺ縺・', AUTH_API.ME);
    
    // Azure Static Web Apps 縺ｮ繧ｳ繝ｼ繝ｫ繝峨せ繧ｿ繝ｼ繝亥ｯｾ遲・
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15遘偵ち繧､繝繧｢繧ｦ繝・
    
    const response = await fetch(AUTH_API.ME, {
      credentials: 'include',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);
    
    console.log('藤 getCurrentUser 繝ｬ繧ｹ繝昴Φ繧ｹ:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        console.log('箔 譛ｪ隱崎ｨｼ迥ｶ諷・);
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const userData = await response.json();
    console.log('笨・getCurrentUser 謌仙粥:', userData);
    return userData;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('竢ｰ getCurrentUser 繧ｿ繧､繝繧｢繧ｦ繝・', error);
      throw new Error('隱崎ｨｼ遒ｺ隱阪′繧ｿ繧､繝繧｢繧ｦ繝医＠縺ｾ縺励◆縲ゅロ繝・ヨ繝ｯ繝ｼ繧ｯ謗･邯壹ｒ遒ｺ隱阪＠縺ｦ縺上□縺輔＞縲・);
    }
    console.error('笶・Get current user error:', error);
    return null;
  }
};



