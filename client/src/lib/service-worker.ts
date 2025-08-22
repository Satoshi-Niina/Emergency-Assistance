/**
 * Service Workerを登録する
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workerはこ�Eブラウザではサポ�EトされてぁE��せん');
    return null;
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Workerが登録されました:', registration.scope);
    return registration;
  } catch (error) {
    console.error('Service Workerの登録に失敗しました:', error);
    return null;
  }
}

/**
 * バックグラウンド同期をリクエスチE
 */
export async function requestBackgroundSync(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workerはこ�Eブラウザではサポ�EトされてぁE��せん');
    return false;
  }
  
  try {
    // Service Workerが準備できるまで征E��E
    const registration = await getServiceWorkerRegistration();
    if (!registration) {
      console.warn('Service Workerの登録が見つかりません');
      return false;
    }
    
    // 'sync'がサポ�EトされてぁE��か確誁E
    if (!('sync' in registration)) {
      console.warn('バックグラウンド同期APIはこ�Eブラウザではサポ�EトされてぁE��せん');
      return false;
    }
    
    // 同期タグを登録
    if (registration.sync) {
      await registration.sync.register('chat-sync');
    }
    console.log('バックグラウンド同期が登録されました');
    return true;
  } catch (error) {
    console.error('バックグラウンド同期�E登録に失敗しました:', error);
    return false;
  }
}

/**
 * 現在のService Worker登録を取征E
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }
  
  try {
    // 登録済みのService Workerを取征E
    const registrations = await navigator.serviceWorker.getRegistrations();
    if (registrations.length === 0) {
      // 登録されてぁE��ぁE��合�E新規登録
      return await registerServiceWorker();
    }
    
    // 最初�E登録を返す
    return registrations[0];
  } catch (error) {
    console.error('Service Worker登録の取得に失敗しました:', error);
    return null;
  }
}

/**
 * 同期タグが登録されてぁE��か確誁E
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
    console.error('同期タグの確認中にエラーが発生しました:', error);
    return false;
  }
}

/**
 * Service WorkerのスチE�Eタス通知を設宁E
 */
export function setupServiceWorkerMessages() {
  if (!('serviceWorker' in navigator)) {
    return;
  }
  
  // Service WorkerからのメチE��ージリスナ�E
  navigator.serviceWorker.addEventListener('message', (event) => {
    const { type, data } = event.data;
    
    if (type === 'sync-status') {
      // 同期状態�E更新イベントを発火
      window.dispatchEvent(new CustomEvent('sync-status-update', {
        detail: data
      }));
    }
  });
}

/**
 * モバイルチE��イスかどぁE��を判宁E
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * iPadかどぁE��を判宁E
 */
export function isIPadDevice(): boolean {
  return /iPad/i.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * ネットワークの状態を取征E
 */
export function getNetworkInfo(): { online: boolean, effectiveType?: string } {
  const online = navigator.onLine;
  // @ts-ignore - TS2339: effectiveTypeプロパティがConnection型に存在しなぁE
  const effectiveType = navigator.connection?.effectiveType;
  
  return {
    online,
    effectiveType
  };
}
