// ファイルベース履歴ローダー
import { SupportHistoryItem } from '../types/history';

export const loadHistoryFromDB = async (): Promise<SupportHistoryItem[]> => {
  try {
    const { buildApiUrl } = await import('../lib/api-unified');
    
    // ファイルベースの統括API使用
    const response = await fetch(buildApiUrl('/history?limit=100&source=files&includeImages=true'));
    
    if (!response.ok) {
      throw new Error(`履歴取得失敗: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success || !data.data) {
      console.warn('⚠️ 応答にデータが含まれていません');
      return [];
    }
    
    console.log(`🔍 ファイルベース履歴取得成功: ${data.data.length}件, バージョン: ${data.version}`);
    
    // SupportHistoryItem型に変換（ファイルベース）
    const historyItems: SupportHistoryItem[] = data.data.map((item: any) => {
      // 機種と機械番号を抽出（複数の形式に対応）
      // サーバー側で既に抽出されている場合はそれを使用、なければデフォルト値
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
        id: item.id, // UUIDをそのまま使用
        chatId: item.id,
        machineType: machineType,
        machineNumber: machineNumber,
        incidentTitle: item.title || 'タイトルなし',
        problemDescription: item.description || '',
        createdAt: item.createdAt || new Date().toISOString(),
        fileName: item.fileName || `${item.id}.json`,
        hasImage: item.hasImages || (item.imageCount > 0),
        jsonData: {
          // 画像情報を含むjsonDataを構築
          images: item.images || [],
          imageCount: item.imageCount || 0,
          savedImages: item.images ? item.images.map((img: any) => ({
            messageId: img.messageId,
            fileName: img.fileName,
            url: img.url || `/api/images/chat-exports/${img.fileName}`,
            path: img.fileName
          })) : [],
          // 完全なJSONデータも保持
          ...(item.jsonData || {}),
          chatData: item.jsonData?.chatData || item.jsonData || {},
        },
        source: 'files'
      };
    });
    
    return historyItems;
    
  } catch (error) {
    console.error('❌ 履歴取得エラー:', error);
    return [];
  }
};