// Service Worker for background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'chat-sync') {
    event.waitUntil(syncChatData());
  }
});

// 繝｡繝・そ繝ｼ繧ｸ蜷梧悄縺ｮ縺溘ａ縺ｮ繧､繝吶Φ繝磯夂衍逕ｨ繝√Ε繝阪Ν
const messageChannel = new BroadcastChannel('chat-sync-channel');

// 繝√Ε繝・ヨ繝・・繧ｿ繧貞酔譛溘☆繧矩未謨ｰ
async function syncChatData() {
  console.log('繝舌ャ繧ｯ繧ｰ繝ｩ繧ｦ繝ｳ繝牙酔譛溘ｒ髢句ｧ九＠縺ｾ縺・..');
  
  try {
    // 繧ｯ繝ｩ繧､繧｢繝ｳ繝医↓蜷梧悄髢句ｧ九ｒ騾夂衍
    messageChannel.postMessage({
      type: 'sync-started'
    });
    
    // 繧ｯ繝ｩ繧､繧｢繝ｳ繝医い繝励Μ縺ｫ蜷梧悄蜃ｦ逅・ｒ萓晞ｼ
    // ・・ndexedDB縺ｸ縺ｮ逶ｴ謗･繧｢繧ｯ繧ｻ繧ｹ縺ｯService Worker縺ｧ縺ｯ縺ｪ縺上け繝ｩ繧､繧｢繝ｳ繝医し繧､繝峨〒陦後≧・・
    const clients = await self.clients.matchAll({ type: 'window' });
    
    if (clients.length > 0) {
      // 繧｢繧ｯ繝・ぅ繝悶↑繧ｯ繝ｩ繧､繧｢繝ｳ繝医′縺ゅｋ蝣ｴ蜷医・繝｡繝・そ繝ｼ繧ｸ繧帝∽ｿ｡
      clients[0].postMessage({
        type: 'perform-chat-sync'
      });
    } else {
      // 繧｢繧ｯ繝・ぅ繝悶↑繧ｯ繝ｩ繧､繧｢繝ｳ繝医′縺ｪ縺・ｴ蜷医・螳壽悄逧・↓蜷梧悄繧定ｩｦ縺ｿ繧・
      messageChannel.postMessage({
        type: 'sync-no-client',
        message: 'No active clients found, will retry when app reopens.'
      });
    }
    
    // 謌仙粥繧定ｿ斐☆・亥ｮ滄圀縺ｮ蜷梧悄縺ｯ繧ｯ繝ｩ繧､繧｢繝ｳ繝医し繧､繝峨〒陦後ｏ繧後ｋ・・
    return true;
  } catch (error) {
    console.error('蜷梧悄荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:', error);
    
    // 繧ｨ繝ｩ繝ｼ繧帝夂衍
    messageChannel.postMessage({
      type: 'sync-error',
      error: error.message
    });
    
    // 繧ｨ繝ｩ繝ｼ繧呈兜縺偵※蜀崎ｩｦ陦後ｒ菫・☆
    throw error;
  }
}

// 繝励ャ繧ｷ繝･騾夂衍縺ｮ蜿嶺ｿ｡
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  
  const options = {
    body: data.body || '繝｡繝・そ繝ｼ繧ｸ縺ｮ蜷梧悄縺悟ｿ・ｦ√〒縺・,
    icon: '/icon-192x192.png',
    badge: '/icon-badge.png',
    data: data
  };
  
  event.waitUntil(
    self.registration.showNotification(
      data.title || '蜷梧悄迥ｶ諷九・騾夂衍', 
      options
    )
  );
});

// 騾夂衍縺後け繝ｪ繝・け縺輔ｌ縺溘→縺阪・蜃ｦ逅・
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// 繧､繝ｳ繧ｹ繝医・繝ｫ譎ゅ・蜃ｦ逅・
self.addEventListener('install', (event) => {
  console.log('Service Worker繧偵う繝ｳ繧ｹ繝医・繝ｫ縺励∪縺励◆縲・);
  self.skipWaiting();
});

// 繧｢繧ｯ繝・ぅ繝吶・繧ｷ繝ｧ繝ｳ譎ゅ・蜃ｦ逅・
self.addEventListener('activate', (event) => {
  console.log('Service Worker縺後い繧ｯ繝・ぅ繝吶・繝医＆繧後∪縺励◆縲・);
  event.waitUntil(self.clients.claim());
});