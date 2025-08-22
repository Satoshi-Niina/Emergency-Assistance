import { apiRequest } from "../lib/queryClient.ts";
import { 
  getUnsyncedMessages, 
  markMessageAsSynced,
  markMediaAsSynced, 
  getChatSyncStats, 
  optimizeImageDataUrl 
} from './offline-storage';

/**
 * 繝・・繧ｿURL繧達lob縺ｫ螟画鋤
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
 * Base64縺ｮ繝・・繧ｿURL縺九ｉFile繧ｪ繝悶ず繧ｧ繧ｯ繝医ｒ菴懈・
 */
function dataURLtoFile(dataUrl: string, filename: string): File {
  const blob = dataURLtoBlob(dataUrl);
  return new File([blob], filename, { type: blob.type });
}

/**
 * 謖・ｮ壹＆繧後◆繝√Ε繝・ヨ縺ｮ譛ｪ蜷梧悄繝｡繝・そ繝ｼ繧ｸ繧貞酔譛・
 */
export async function syncChat(chatId: number) {
  try {
    // 譛ｪ蜷梧悄繝｡繝・そ繝ｼ繧ｸ繧貞叙蠕・
    const messages = await getUnsyncedMessages(chatId);
    
    if (messages.length === 0) {
      console.log('蜷梧悄縺吶ｋ繝｡繝・そ繝ｼ繧ｸ縺後≠繧翫∪縺帙ｓ');
      return { success: true, totalSynced: 0 };
    }
    
    console.log(`${messages.length}莉ｶ縺ｮ繝｡繝・そ繝ｼ繧ｸ繧貞酔譛溘＠縺ｾ縺兪);
    
    // 繝｡繝・そ繝ｼ繧ｸ繧・莉ｶ縺壹▽蜷梧悄
    let syncedCount = 0;
    
    for (const message of messages) {
      // 譌｢縺ｫ蜷梧悄貂医∩縺ｮ蝣ｴ蜷医・繧ｹ繧ｭ繝・・
      if (message.synced) {
        continue;
      }
      
      try {
        // 繝｡繝・そ繝ｼ繧ｸ繧帝∽ｿ｡
        const response = await apiRequest('POST', `/api/chats/${chatId}/messages`, {
          content: message.content,
          senderId: message.senderId,
          isAiResponse: message.isAiResponse
        });
        
        if (!response.ok) {
          console.error('繝｡繝・そ繝ｼ繧ｸ縺ｮ蜷梧悄縺ｫ螟ｱ謨励＠縺ｾ縺励◆:', await response.text());
          continue;
        }
        
        const data = await response.json();
        
        // 繝｡繝・そ繝ｼ繧ｸ繧貞酔譛滓ｸ医∩縺ｨ縺励※繝槭・繧ｯ
        await markMessageAsSynced(message.localId, data.id);
        
        // 繝｡繝・ぅ繧｢縺後≠繧句ｴ蜷医・蜷梧悄
        if (message.media && message.media.length > 0) {
          for (const media of message.media) {
            if (media.synced) continue;
            
            // 逕ｻ蜒上・蝣ｴ蜷医・譛驕ｩ蛹・
            let mediaUrl = media.url;
            if (media.type === 'image' && mediaUrl.startsWith('data:')) {
              try {
                mediaUrl = await optimizeImageDataUrl(mediaUrl, 0.8);
              } catch (err) {
                console.warn('逕ｻ蜒上・譛驕ｩ蛹悶↓螟ｱ謨励＠縺ｾ縺励◆:', err);
              }
            }
            
            // 繝｡繝・ぅ繧｢繝・・繧ｿ繧帝∽ｿ｡
            const formData = new FormData();
            
            if (mediaUrl.startsWith('data:')) {
              // 繝・・繧ｿURL縺ｮ蝣ｴ蜷医・繝輔ぃ繧､繝ｫ縺ｫ螟画鋤
              const file = dataURLtoFile(
                mediaUrl, 
                `media_${Date.now()}.${media.type === 'image' ? 'jpg' : 'mp4'}`
              );
              formData.append('file', file);
            } else {
              // 譌｢蟄倥・URL縺ｯ縺昴・縺ｾ縺ｾ騾∽ｿ｡
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
              console.error('繝｡繝・ぅ繧｢縺ｮ蜷梧悄縺ｫ螟ｱ謨励＠縺ｾ縺励◆:', await mediaResponse.text());
              continue;
            }
            
            const mediaData = await mediaResponse.json();
            
            // 繝｡繝・ぅ繧｢繧貞酔譛滓ｸ医∩縺ｨ縺励※繝槭・繧ｯ
            await markMediaAsSynced(media.localId, mediaData.id);
          }
        }
        
        syncedCount++;
        
        // 騾ｲ謐礼憾豕√ｒ騾夂衍
        window.dispatchEvent(new CustomEvent('sync-status-update', {
          detail: { 
            type: 'sync-progress',
            progress: Math.round((syncedCount / messages.length) * 100),
            syncedCount,
            totalCount: messages.length
          }
        }));
        
      } catch (error) {
        console.error('繝｡繝・そ繝ｼ繧ｸ縺ｮ蜷梧悄蜃ｦ逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:', error);
      }
    }
    
    // 蜷梧悄邨先棡繧定ｿ斐☆
    const stats = await getChatSyncStats(chatId);
    
    return { 
      success: true, 
      totalSynced: syncedCount,
      stats
    };
  } catch (error) {
    console.error('蜷梧悄蜃ｦ逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:', error);
    return { 
      success: false, 
      totalSynced: 0,
      error
    };
  }
}
