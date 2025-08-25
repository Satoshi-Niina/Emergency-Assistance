export const openDatabase = async () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('chat-app', 1);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // 譛ｪ蜷梧悄繝｡繝・そ繝ｼ繧ｸ逕ｨ縺ｮ繧ｹ繝医い繧剃ｽ懈・
      if (!db.objectStoreNames.contains('unsyncedMessages')) {
        const store = db.createObjectStore('unsyncedMessages', { keyPath: 'localId', autoIncrement: true });
        store.createIndex('by-chat', 'chatId', { unique: false });
      }
    };
  });
}; 


