import { openDB, IDBPDatabase } from 'idb';

/**
 * IndexedDBのチE�Eタベ�Eス定義
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

// チE�Eタベ�Eス名とバ�Eジョン
const DB_NAME = 'chat-sync-db';
const DB_VERSION = 1;

/**
 * IndexedDBを開ぁE
 */
async function openDatabase(): Promise<IDBPDatabase<SyncDB>> {
  return await openDB<SyncDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 未同期メチE��ージ用のオブジェクトストア
      const messageStore = db.createObjectStore('unsyncedMessages', { 
        keyPath: 'localId',
        autoIncrement: true 
      });
      messageStore.createIndex('by-chat', 'chatId');
      
      // 未同期メチE��ア用のオブジェクトストア
      const mediaStore = db.createObjectStore('unsyncedMedia', { 
        keyPath: 'localId',
        autoIncrement: true 
      });
      mediaStore.createIndex('by-message', 'localMessageId');
    }
  });
}

/**
 * 未同期メチE��ージをローカルストレージに保孁E
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
      localId: Date.now() // 一時的なローカルID
    });
    
    await tx.done;
    console.log('未同期メチE��ージをローカルに保存しました:', localId);
    return localId;
  } catch (error) {
    console.error('メチE��ージのローカル保存に失敗しました:', error);
    throw error;
  }
}

/**
 * 未同期メチE��アをローカルストレージに保孁E
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
      localId: Date.now() // 一時的なローカルID
    });
    
    await tx.done;
    console.log('未同期メチE��アをローカルに保存しました:', localId);
    return localId;
  } catch (error) {
    console.error('メチE��アのローカル保存に失敗しました:', error);
    throw error;
  }
}

/**
 * 特定�EチャチE��の未同期メチE��ージを取征E
 */
export async function getUnsyncedMessages(chatId: number) {
  try {
    const db = await openDatabase();
    const tx = db.transaction('unsyncedMessages', 'readonly');
    const index = tx.store.index('by-chat');
    
    const messages = await index.getAll(chatId);
    
    // メチE��ージに紐づくメチE��アも取征E
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
    console.error('未同期メチE��ージの取得に失敗しました:', error);
    return [];
  }
}

/**
 * メチE��ージを同期済みにマ�Eク
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
    console.error('メチE��ージの同期状態�E更新に失敗しました:', error);
    throw error;
  }
}

/**
 * メチE��アを同期済みにマ�Eク
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
    console.error('メチE��アの同期状態�E更新に失敗しました:', error);
    throw error;
  }
}

/**
 * チャチE��が完�Eに同期されてぁE��か確誁E
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
    console.error('同期状態�E確認に失敗しました:', error);
    return false;
  }
}

/**
 * チャチE��の同期統計を取征E
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
    console.error('同期統計�E取得に失敗しました:', error);
    return { total: 0, synced: 0, pending: 0, isFullySynced: true };
  }
}

/**
 * 画像DataURLを最適化（サイズ削減！E
 */
export async function optimizeImageDataUrl(dataUrl: string, quality = 0.8, maxWidth = 1200) {
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      
      // 最大幁E��合わせてサイズを調整
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
        reject(new Error('キャンバスコンチE��スト�E取得に失敗しました'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // 最適化した画像を取征E
      const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(optimizedDataUrl);
    };
    
    img.onerror = () => {
      reject(new Error('画像�E読み込みに失敗しました'));
    };
    
    img.src = dataUrl;
  });
}

/**
 * 同期済みのメチE��ージとメチE��アをクリーンアチE�E
 */
export async function cleanupSyncedData() {
  try {
    const db = await openDatabase();
    
    // 同期済みメチE��ージを削除
    const messageTx = db.transaction('unsyncedMessages', 'readwrite');
    const messages = await messageTx.store.getAll();
    
    for (const message of messages) {
      if (message.synced) {
        await messageTx.store.delete(message.localId);
      }
    }
    
    await messageTx.done;
    
    // 同期済みメチE��アを削除
    const mediaTx = db.transaction('unsyncedMedia', 'readwrite');
    const mediaItems = await mediaTx.store.getAll();
    
    for (const media of mediaItems) {
      if (media.synced) {
        await mediaTx.store.delete(media.localId);
      }
    }
    
    await mediaTx.done;
    
    console.log('同期済みチE�EタのクリーンアチE�Eが完亁E��ました');
  } catch (error) {
    console.error('同期済みチE�EタのクリーンアチE�Eに失敗しました:', error);
  }
}
