/**
 * Service Worker繧堤匳骭ｲ縺吶ｋ
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker縺ｯ縺薙・繝悶Λ繧ｦ繧ｶ縺ｧ縺ｯ繧ｵ繝昴・繝医＆繧後※縺・∪縺帙ｓ');
    return null;
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker縺檎匳骭ｲ縺輔ｌ縺ｾ縺励◆:', registration.scope);
    return registration;
  } catch (error) {
    console.error('Service Worker縺ｮ逋ｻ骭ｲ縺ｫ螟ｱ謨励＠縺ｾ縺励◆:', error);
    return null;
  }
}

/**
 * 繝舌ャ繧ｯ繧ｰ繝ｩ繧ｦ繝ｳ繝牙酔譛溘ｒ繝ｪ繧ｯ繧ｨ繧ｹ繝・
 */
export async function requestBackgroundSync(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker縺ｯ縺薙・繝悶Λ繧ｦ繧ｶ縺ｧ縺ｯ繧ｵ繝昴・繝医＆繧後※縺・∪縺帙ｓ');
    return false;
  }
  
  try {
    // Service Worker縺梧ｺ門ｙ縺ｧ縺阪ｋ縺ｾ縺ｧ蠕・ｩ・
    const registration = await getServiceWorkerRegistration();
    if (!registration) {
      console.warn('Service Worker縺ｮ逋ｻ骭ｲ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ');
      return false;
    }
    
    // 'sync'縺後し繝昴・繝医＆繧後※縺・ｋ縺狗｢ｺ隱・
    if (!('sync' in registration)) {
      console.warn('繝舌ャ繧ｯ繧ｰ繝ｩ繧ｦ繝ｳ繝牙酔譛蘗PI縺ｯ縺薙・繝悶Λ繧ｦ繧ｶ縺ｧ縺ｯ繧ｵ繝昴・繝医＆繧後※縺・∪縺帙ｓ');
      return false;
    }
    
    // 蜷梧悄繧ｿ繧ｰ繧堤匳骭ｲ
    if (registration.sync) {
      await registration.sync.register('chat-sync');
    }
    console.log('繝舌ャ繧ｯ繧ｰ繝ｩ繧ｦ繝ｳ繝牙酔譛溘′逋ｻ骭ｲ縺輔ｌ縺ｾ縺励◆');
    return true;
  } catch (error) {
    console.error('繝舌ャ繧ｯ繧ｰ繝ｩ繧ｦ繝ｳ繝牙酔譛溘・逋ｻ骭ｲ縺ｫ螟ｱ謨励＠縺ｾ縺励◆:', error);
    return false;
  }
}

/**
 * 迴ｾ蝨ｨ縺ｮService Worker逋ｻ骭ｲ繧貞叙蠕・
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }
  
  try {
    // 逋ｻ骭ｲ貂医∩縺ｮService Worker繧貞叙蠕・
    const registrations = await navigator.serviceWorker.getRegistrations();
    if (registrations.length === 0) {
      // 逋ｻ骭ｲ縺輔ｌ縺ｦ縺・↑縺・ｴ蜷医・譁ｰ隕冗匳骭ｲ
      return await registerServiceWorker();
    }
    
    // 譛蛻昴・逋ｻ骭ｲ繧定ｿ斐☆
    return registrations[0];
  } catch (error) {
    console.error('Service Worker逋ｻ骭ｲ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆:', error);
    return null;
  }
}

/**
 * 蜷梧悄繧ｿ繧ｰ縺檎匳骭ｲ縺輔ｌ縺ｦ縺・ｋ縺狗｢ｺ隱・
 */
export async function hasSyncRegistered(): Promise<boolean> {
  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    return false;
  }
  
  if (!('sync' in registration)) {
    return false;
  }
  
  try {
    if (registration.sync) {
      const tags = await registration.sync.getTags();
      return tags.includes('chat-sync');
    }
    return false;
  } catch (error) {
    console.error('蜷梧悄繧ｿ繧ｰ縺ｮ遒ｺ隱堺ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:', error);
    return false;
  }
}

/**
 * Service Worker縺ｮ繧ｹ繝・・繧ｿ繧ｹ騾夂衍繧定ｨｭ螳・
 */
export function setupServiceWorkerMessages() {
  if (!('serviceWorker' in navigator)) {
    return;
  }
  
  // Service Worker縺九ｉ縺ｮ繝｡繝・そ繝ｼ繧ｸ繝ｪ繧ｹ繝翫・
  navigator.serviceWorker.addEventListener('message', (event) => {
    const { type, data } = event.data;
    
    if (type === 'sync-status') {
      // 蜷梧悄迥ｶ諷九・譖ｴ譁ｰ繧､繝吶Φ繝医ｒ逋ｺ轣ｫ
      window.dispatchEvent(new CustomEvent('sync-status-update', {
        detail: data
      }));
    }
  });
}

/**
 * 繝｢繝舌う繝ｫ繝・ヰ繧､繧ｹ縺九←縺・°繧貞愛螳・
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * iPad縺九←縺・°繧貞愛螳・
 */
export function isIPadDevice(): boolean {
  return /iPad/i.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * 繝阪ャ繝医Ρ繝ｼ繧ｯ縺ｮ迥ｶ諷九ｒ蜿門ｾ・
 */
export function getNetworkInfo(): { online: boolean, effectiveType?: string } {
  const online = navigator.onLine;
  // @ts-ignore - TS2339: effectiveType繝励Ο繝代ユ繧｣縺靴onnection蝙九↓蟄伜惠縺励↑縺・
  const effectiveType = navigator.connection?.effectiveType;
  
  return {
    online,
    effectiveType
  };
}
