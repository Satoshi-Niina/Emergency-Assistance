import { openDB, IDBPDatabase } from 'idb';

/**
 * IndexedDB縺ｮ繝・・繧ｿ繝吶・繧ｹ螳夂ｾｩ
 */
interface SyncDB {
  unsyncedMessages: {
    key: number;
    value: {
      id?: number;
      localId: number;
      content: string;
      senderId: number | null;
      isAiResponse: boolean;
      timestamp: Date;
      chatId: number;
      synced: boolean;
    };
    indexes: { 'by-chat': number };
  };
  unsyncedMedia: {
    key: number;
    value: {
      id?: number;
      localId: number;
      messageId?: number;
      localMessageId: number;
      type: string;
      url: string;
      thumbnail?: string;
      synced: boolean;
    };
    indexes: { 'by-message': number };
  };
}

// 繝・・繧ｿ繝吶・繧ｹ蜷阪→繝舌・繧ｸ繝ｧ繝ｳ
const DB_NAME = 'chat-sync-db';
const DB_VERSION = 1;

/**
 * IndexedDB繧帝幕縺・
 */
async function openDatabase(): Promise<IDBPDatabase<SyncDB>> {
  return await openDB<SyncDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 譛ｪ蜷梧悄繝｡繝・そ繝ｼ繧ｸ逕ｨ縺ｮ繧ｪ繝悶ず繧ｧ繧ｯ繝医せ繝医い
      const messageStore = db.createObjectStore('unsyncedMessages', { 
        keyPath: 'localId',
        autoIncrement: true 
      });
      messageStore.createIndex('by-chat', 'chatId');
      
      // 譛ｪ蜷梧悄繝｡繝・ぅ繧｢逕ｨ縺ｮ繧ｪ繝悶ず繧ｧ繧ｯ繝医せ繝医い
      const mediaStore = db.createObjectStore('unsyncedMedia', { 
        keyPath: 'localId',
        autoIncrement: true 
      });
      mediaStore.createIndex('by-message', 'localMessageId');
    }
  });
}

/**
 * 譛ｪ蜷梧悄繝｡繝・そ繝ｼ繧ｸ繧偵Ο繝ｼ繧ｫ繝ｫ繧ｹ繝医Ξ繝ｼ繧ｸ縺ｫ菫晏ｭ・
 */
export async function storeUnsyncedMessage(message: {
  content: string;
  senderId: number | null;
  isAiResponse: boolean;
  chatId: number;
}) {
  try {
    const db = await openDatabase();
    const tx = db.transaction('unsyncedMessages', 'readwrite');
    
    const localId = await tx.store.add({
      ...message,
      timestamp: new Date(),
      synced: false,
      localId: Date.now() // 荳譎ら噪縺ｪ繝ｭ繝ｼ繧ｫ繝ｫID
    });
    
    await tx.done;
    console.log('譛ｪ蜷梧悄繝｡繝・そ繝ｼ繧ｸ繧偵Ο繝ｼ繧ｫ繝ｫ縺ｫ菫晏ｭ倥＠縺ｾ縺励◆:', localId);
    return localId;
  } catch (error) {
    console.error('繝｡繝・そ繝ｼ繧ｸ縺ｮ繝ｭ繝ｼ繧ｫ繝ｫ菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆:', error);
    throw error;
  }
}

/**
 * 譛ｪ蜷梧悄繝｡繝・ぅ繧｢繧偵Ο繝ｼ繧ｫ繝ｫ繧ｹ繝医Ξ繝ｼ繧ｸ縺ｫ菫晏ｭ・
 */
export async function storeUnsyncedMedia(media: {
  localMessageId: number;
  type: string;
  url: string;
  thumbnail?: string;
}) {
  try {
    const db = await openDatabase();
    const tx = db.transaction('unsyncedMedia', 'readwrite');
    
    const localId = await tx.store.add({
      ...media,
      synced: false,
      localId: Date.now() // 荳譎ら噪縺ｪ繝ｭ繝ｼ繧ｫ繝ｫID
    });
    
    await tx.done;
    console.log('譛ｪ蜷梧悄繝｡繝・ぅ繧｢繧偵Ο繝ｼ繧ｫ繝ｫ縺ｫ菫晏ｭ倥＠縺ｾ縺励◆:', localId);
    return localId;
  } catch (error) {
    console.error('繝｡繝・ぅ繧｢縺ｮ繝ｭ繝ｼ繧ｫ繝ｫ菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆:', error);
    throw error;
  }
}

/**
 * 迚ｹ螳壹・繝√Ε繝・ヨ縺ｮ譛ｪ蜷梧悄繝｡繝・そ繝ｼ繧ｸ繧貞叙蠕・
 */
export async function getUnsyncedMessages(chatId: number) {
  try {
    const db = await openDatabase();
    const tx = db.transaction('unsyncedMessages', 'readonly');
    const index = tx.store.index('by-chat');
    
    const messages = await index.getAll(chatId);
    
    // 繝｡繝・そ繝ｼ繧ｸ縺ｫ邏舌▼縺上Γ繝・ぅ繧｢繧ょ叙蠕・
    const messagesWithMedia = await Promise.all(
      messages.map(async (message) => {
        const mediaTx = db.transaction('unsyncedMedia', 'readonly');
        const mediaIndex = mediaTx.store.index('by-message');
        const media = await mediaIndex.getAll(message.localId);
        
        return {
          ...message,
          media: media.length > 0 ? media : undefined
        };
      })
    );
    
    await tx.done;
    return messagesWithMedia;
  } catch (error) {
    console.error('譛ｪ蜷梧悄繝｡繝・そ繝ｼ繧ｸ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆:', error);
    return [];
  }
}

/**
 * 繝｡繝・そ繝ｼ繧ｸ繧貞酔譛滓ｸ医∩縺ｫ繝槭・繧ｯ
 */
export async function markMessageAsSynced(localId: number, serverId: number) {
  try {
    const db = await openDatabase();
    const tx = db.transaction('unsyncedMessages', 'readwrite');
    
    const message = await tx.store.get(localId);
    if (message) {
      message.synced = true;
      message.id = serverId;
      await tx.store.put(message);
    }
    
    await tx.done;
  } catch (error) {
    console.error('繝｡繝・そ繝ｼ繧ｸ縺ｮ蜷梧悄迥ｶ諷九・譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆:', error);
    throw error;
  }
}

/**
 * 繝｡繝・ぅ繧｢繧貞酔譛滓ｸ医∩縺ｫ繝槭・繧ｯ
 */
export async function markMediaAsSynced(localId: number, serverId: number) {
  try {
    const db = await openDatabase();
    const tx = db.transaction('unsyncedMedia', 'readwrite');
    
    const media = await tx.store.get(localId);
    if (media) {
      media.synced = true;
      media.id = serverId;
      await tx.store.put(media);
    }
    
    await tx.done;
  } catch (error) {
    console.error('繝｡繝・ぅ繧｢縺ｮ蜷梧悄迥ｶ諷九・譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆:', error);
    throw error;
  }
}

/**
 * 繝√Ε繝・ヨ縺悟ｮ悟・縺ｫ蜷梧悄縺輔ｌ縺ｦ縺・ｋ縺狗｢ｺ隱・
 */
export async function isChatSynced(chatId: number): Promise<boolean> {
  try {
    const db = await openDatabase();
    const tx = db.transaction('unsyncedMessages', 'readonly');
    const index = tx.store.index('by-chat');
    
    const messages = await index.getAll(chatId);
    const hasUnsyncedMessages = messages.some(msg => !msg.synced);
    
    await tx.done;
    return !hasUnsyncedMessages;
  } catch (error) {
    console.error('蜷梧悄迥ｶ諷九・遒ｺ隱阪↓螟ｱ謨励＠縺ｾ縺励◆:', error);
    return false;
  }
}

/**
 * 繝√Ε繝・ヨ縺ｮ蜷梧悄邨ｱ險医ｒ蜿門ｾ・
 */
export async function getChatSyncStats(chatId: number) {
  try {
    const db = await openDatabase();
    const tx = db.transaction('unsyncedMessages', 'readonly');
    const index = tx.store.index('by-chat');
    
    const messages = await index.getAll(chatId);
    const total = messages.length;
    const synced = messages.filter(msg => msg.synced).length;
    
    await tx.done;
    return {
      total,
      synced,
      pending: total - synced,
      isFullySynced: total === synced
    };
  } catch (error) {
    console.error('蜷梧悄邨ｱ險医・蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆:', error);
    return { total: 0, synced: 0, pending: 0, isFullySynced: true };
  }
}

/**
 * 逕ｻ蜒愁ataURL繧呈怙驕ｩ蛹厄ｼ医し繧､繧ｺ蜑頑ｸ幢ｼ・
 */
export async function optimizeImageDataUrl(dataUrl: string, quality = 0.8, maxWidth = 1200) {
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      
      // 譛螟ｧ蟷・↓蜷医ｏ縺帙※繧ｵ繧､繧ｺ繧定ｪｿ謨ｴ
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = height * ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('繧ｭ繝｣繝ｳ繝舌せ繧ｳ繝ｳ繝・く繧ｹ繝医・蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // 譛驕ｩ蛹悶＠縺溽判蜒上ｒ蜿門ｾ・
      const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(optimizedDataUrl);
    };
    
    img.onerror = () => {
      reject(new Error('逕ｻ蜒上・隱ｭ縺ｿ霎ｼ縺ｿ縺ｫ螟ｱ謨励＠縺ｾ縺励◆'));
    };
    
    img.src = dataUrl;
  });
}

/**
 * 蜷梧悄貂医∩縺ｮ繝｡繝・そ繝ｼ繧ｸ縺ｨ繝｡繝・ぅ繧｢繧偵け繝ｪ繝ｼ繝ｳ繧｢繝・・
 */
export async function cleanupSyncedData() {
  try {
    const db = await openDatabase();
    
    // 蜷梧悄貂医∩繝｡繝・そ繝ｼ繧ｸ繧貞炎髯､
    const messageTx = db.transaction('unsyncedMessages', 'readwrite');
    const messages = await messageTx.store.getAll();
    
    for (const message of messages) {
      if (message.synced) {
        await messageTx.store.delete(message.localId);
      }
    }
    
    await messageTx.done;
    
    // 蜷梧悄貂医∩繝｡繝・ぅ繧｢繧貞炎髯､
    const mediaTx = db.transaction('unsyncedMedia', 'readwrite');
    const mediaItems = await mediaTx.store.getAll();
    
    for (const media of mediaItems) {
      if (media.synced) {
        await mediaTx.store.delete(media.localId);
      }
    }
    
    await mediaTx.done;
    
    console.log('蜷梧悄貂医∩繝・・繧ｿ縺ｮ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・縺悟ｮ御ｺ・＠縺ｾ縺励◆');
  } catch (error) {
    console.error('蜷梧悄貂医∩繝・・繧ｿ縺ｮ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・縺ｫ螟ｱ謨励＠縺ｾ縺励◆:', error);
  }
}


