import { apiRequest } from "../lib/queryClient.ts";
import { 
  getUnsyncedMessages, 
  markMessageAsSynced,
  markMediaAsSynced, 
  getChatSyncStats, 
  optimizeImageDataUrl 
} from './offline-storage';

/**
 * チE�EタURLをBlobに変換
 */
function dataURLtoBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new Blob([u8arr], { type: mime });
}

/**
 * Base64のチE�EタURLからFileオブジェクトを作�E
 */
function dataURLtoFile(dataUrl: string, filename: string): File {
  const blob = dataURLtoBlob(dataUrl);
  return new File([blob], filename, { type: blob.type });
}

/**
 * 持E��されたチャチE��の未同期メチE��ージを同朁E
 */
export async function syncChat(chatId: number) {
  try {
    // 未同期メチE��ージを取征E
    const messages = await getUnsyncedMessages(chatId);
    
    if (messages.length === 0) {
      console.log('同期するメチE��ージがありません');
      return { success: true, totalSynced: 0 };
    }
    
    console.log(`${messages.length}件のメチE��ージを同期します`);
    
    // メチE��ージめE件ずつ同期
    let syncedCount = 0;
    
    for (const message of messages) {
      // 既に同期済みの場合�EスキチE�E
      if (message.synced) {
        continue;
      }
      
      try {
        // メチE��ージを送信
        const response = await apiRequest('POST', `/api/chats/${chatId}/messages`, {
          content: message.content,
          senderId: message.senderId,
          isAiResponse: message.isAiResponse
        });
        
        if (!response.ok) {
          console.error('メチE��ージの同期に失敗しました:', await response.text());
          continue;
        }
        
        const data = await response.json();
        
        // メチE��ージを同期済みとしてマ�Eク
        await markMessageAsSynced(message.localId, data.id);
        
        // メチE��アがある場合�E同期
        if (message.media && message.media.length > 0) {
          for (const media of message.media) {
            if (media.synced) continue;
            
            // 画像�E場合�E最適匁E
            let mediaUrl = media.url;
            if (media.type === 'image' && mediaUrl.startsWith('data:')) {
              try {
                mediaUrl = await optimizeImageDataUrl(mediaUrl, 0.8);
              } catch (err) {
                console.warn('画像�E最適化に失敗しました:', err);
              }
            }
            
            // メチE��アチE�Eタを送信
            const formData = new FormData();
            
            if (mediaUrl.startsWith('data:')) {
              // チE�EタURLの場合�Eファイルに変換
              const file = dataURLtoFile(
                mediaUrl, 
                `media_${Date.now()}.${media.type === 'image' ? 'jpg' : 'mp4'}`
              );
              formData.append('file', file);
            } else {
              // 既存�EURLはそ�Eまま送信
              formData.append('url', mediaUrl);
            }
            
            formData.append('type', media.type);
            formData.append('messageId', data.id.toString());
            
            if (media.thumbnail) {
              formData.append('thumbnail', media.thumbnail);
            }
            
            const mediaResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/messages/${data.id}/media`, {
              method: 'POST',
              body: formData,
              credentials: 'include'
            });
            
            if (!mediaResponse.ok) {
              console.error('メチE��アの同期に失敗しました:', await mediaResponse.text());
              continue;
            }
            
            const mediaData = await mediaResponse.json();
            
            // メチE��アを同期済みとしてマ�Eク
            await markMediaAsSynced(media.localId, mediaData.id);
          }
        }
        
        syncedCount++;
        
        // 進捗状況を通知
        window.dispatchEvent(new CustomEvent('sync-status-update', {
          detail: { 
            type: 'sync-progress',
            progress: Math.round((syncedCount / messages.length) * 100),
            syncedCount,
            totalCount: messages.length
          }
        }));
        
      } catch (error) {
        console.error('メチE��ージの同期処琁E��にエラーが発生しました:', error);
      }
    }
    
    // 同期結果を返す
    const stats = await getChatSyncStats(chatId);
    
    return { 
      success: true, 
      totalSynced: syncedCount,
      stats
    };
  } catch (error) {
    console.error('同期処琁E��にエラーが発生しました:', error);
    return { 
      success: false, 
      totalSynced: 0,
      error
    };
  }
}
