// 繝輔ぃ繧､繝ｫ繝吶・繧ｹ螻･豁ｴ繝ｭ繝ｼ繝繝ｼ
import { SupportHistoryItem } from '../types/history';

export const loadHistoryFromDB = async (): Promise<SupportHistoryItem[]> => {
  try {
    const { buildApiUrl } = await import('../lib/api');
    
    // 繝輔ぃ繧､繝ｫ繝吶・繧ｹ縺ｮ邨ｱ諡ｬAPI菴ｿ逕ｨ
    const response = await fetch(buildApiUrl('/history?limit=100&source=files&includeImages=true'));
    
    if (!response.ok) {
      throw new Error(`螻･豁ｴ蜿門ｾ怜､ｱ謨・ ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success || !data.data) {
      console.warn('笞・・蠢懃ｭ斐↓繝・・繧ｿ縺悟性縺ｾ繧後※縺・∪縺帙ｓ');
      return [];
    }
    
    console.log(`剥 繝輔ぃ繧､繝ｫ繝吶・繧ｹ螻･豁ｴ蜿門ｾ玲・蜉・ ${data.data.length}莉ｶ, 繝舌・繧ｸ繝ｧ繝ｳ: ${data.version}`);
    
    // SupportHistoryItem蝙九↓螟画鋤・医ヵ繧｡繧､繝ｫ繝吶・繧ｹ・・
    const historyItems: SupportHistoryItem[] = data.data.map((item: any) => {
      // 讖溽ｨｮ縺ｨ讖滓｢ｰ逡ｪ蜿ｷ繧呈歓蜃ｺ・郁､・焚縺ｮ蠖｢蠑上↓蟇ｾ蠢懶ｼ・
      // 繧ｵ繝ｼ繝舌・蛛ｴ縺ｧ譌｢縺ｫ謚ｽ蜃ｺ縺輔ｌ縺ｦ縺・ｋ蝣ｴ蜷医・縺昴ｌ繧剃ｽｿ逕ｨ縲√↑縺代ｌ縺ｰ繝・ヵ繧ｩ繝ｫ繝亥､
      const machineType = 
        item.machineType && item.machineType !== 'Unknown' 
          ? item.machineType
          : item.jsonData?.machineType ||
            item.jsonData?.chatData?.machineInfo?.machineTypeName ||
            item.jsonData?.machineInfo?.machineTypeName ||
            'Unknown';
      const machineNumber = 
        item.machineNumber && item.machineNumber !== 'Unknown'
          ? item.machineNumber
          : item.jsonData?.machineNumber ||
            item.jsonData?.chatData?.machineInfo?.machineNumber ||
            item.jsonData?.machineInfo?.machineNumber ||
            'Unknown';
      
      return {
        id: item.id, // UUID繧偵◎縺ｮ縺ｾ縺ｾ菴ｿ逕ｨ
        chatId: item.id,
        machineType: machineType,
        machineNumber: machineNumber,
        incidentTitle: item.title || '繧ｿ繧､繝医Ν縺ｪ縺・,
        problemDescription: item.description || '',
        createdAt: item.createdAt || new Date().toISOString(),
        fileName: item.fileName || `${item.id}.json`,
        hasImage: item.hasImages || (item.imageCount > 0),
        jsonData: {
          // 逕ｻ蜒乗ュ蝣ｱ繧貞性繧jsonData繧呈ｧ狗ｯ・
          images: item.images || [],
          imageCount: item.imageCount || 0,
          savedImages: item.images ? item.images.map((img: any) => ({
            messageId: img.messageId,
            fileName: img.fileName,
            url: img.url || `/api/images/chat-exports/${img.fileName}`,
            path: img.fileName
          })) : [],
          // 螳悟・縺ｪJSON繝・・繧ｿ繧ゆｿ晄戟
          ...(item.jsonData || {}),
          chatData: item.jsonData?.chatData || item.jsonData || {},
        },
        source: 'files'
      };
    });
    
    return historyItems;
    
  } catch (error) {
    console.error('笶・螻･豁ｴ蜿門ｾ励お繝ｩ繝ｼ:', error);
    return [];
  }
};