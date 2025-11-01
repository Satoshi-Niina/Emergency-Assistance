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
    
    // 最初の数件の画像データをログ出力（デバッグ用）
    if (data.data.length > 0) {
      const firstItem = data.data[0];
      console.log('🔍 最初の履歴アイテムの画像データ:', {
        id: firstItem.id,
        hasImages: firstItem.hasImages,
        imageCount: firstItem.imageCount,
        images: firstItem.images,
        imagesLength: firstItem.images?.length || 0
      });
    }
    
    // SupportHistoryItem型に変換（ファイルベース）
    const historyItems: SupportHistoryItem[] = data.data.map((item: any) => {
      // 画像URLを正規化
      const normalizeImageUrl = (img: any): any => {
        // URLが既に設定されている場合は確認
        let url = img.url || '';
        const fileName = img.fileName || img.path || url.split('/').pop() || '';
        
        // URLが設定されていない、または相対パスの場合は生成
        if (!url || (!url.startsWith('http') && !url.startsWith('/api/'))) {
          if (fileName) {
            // ファイル名から正しいURLを生成
            url = `/api/images/chat-exports/${fileName}`;
          } else if (url && !url.startsWith('/')) {
            // 相対パスの場合
            url = `/api/images/chat-exports/${url}`;
          }
        }
        
        // /api/api/ を /api/ に正規化
        if (url) {
          url = url.replace(/\/api\/api\//g, '/api/');
          // knowledge-base\images\chat-exports パス対応
          if (url.includes('knowledge-base\\images\\chat-exports') || url.includes('knowledge-base/images/chat-exports')) {
            const fn = url.split(/[\\/]/).pop();
            url = `/api/images/chat-exports/${fn}`;
          }
        }
        
        return {
          messageId: img.messageId,
          fileName: fileName,
          url: url || `/api/images/chat-exports/${fileName}`,
          path: img.path || fileName
        };
      };
      
      const normalizedImages = (item.images || []).map(normalizeImageUrl);
      
      // 画像が見つからない場合、ファイル名から画像を推測
      // APIが画像を返さない場合でも、IDから画像ファイルを探せるようにする
      if (normalizedImages.length === 0 && item.hasImages) {
        const itemId = item.id;
        // UUIDパターンを抽出
        const uuidPattern = itemId.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
        const uuid = uuidPattern ? uuidPattern[1] : itemId;
        
        // 複数のパターンで画像を探す
        const possibleImageNames = [
          `chat_image_${itemId}.png`,
          `chat_image_${itemId}.jpg`,
          `chat_image_${itemId}.jpeg`,
          `${uuid}_3_0.jpeg`,
          `${uuid}_2_0.jpeg`,
          `${uuid}_1_0.jpeg`,
          `${uuid}_0_0.jpeg`,
          `${uuid}.jpg`,
          `${uuid}.jpeg`,
          `${uuid}.png`,
          `${itemId}.png`,
          `${itemId}.jpg`,
          `${itemId}.jpeg`
        ];
        
        // 最初のパターンを試す（実際のファイル存在確認はサーバー側で行う）
        const fallbackImage = possibleImageNames[0];
        normalizedImages.push({
          fileName: fallbackImage,
          url: `/api/images/chat-exports/${fallbackImage}`,
          path: fallbackImage
        });
      }
      
      return {
        id: item.id, // UUIDをそのまま使用
        chatId: item.id,
        machineType: item.machineType || 'Unknown',
        machineNumber: item.machineNumber || 'Unknown',  
        incidentTitle: item.title || 'タイトルなし',
        problemDescription: item.description || '',
        createdAt: item.createdAt || new Date().toISOString(),
        fileName: item.fileName || `${item.id}.json`,
        hasImage: item.hasImages || (item.imageCount > 0),
        images: normalizedImages, // APIから返されたimages配列を正規化
        jsonData: {
          // APIから返された全データを含める（chatDataなども含む）
          ...item, // これによりchatData、messagesなどが含まれる
          // 画像情報を含むjsonDataを構築
          images: normalizedImages,
          savedImages: normalizedImages,
          imageCount: item.imageCount || normalizedImages.length || 0,
          // 明示的にchatDataも含める（JSONファイルから読み込まれたデータ）
          chatData: item.chatData || item.jsonData?.chatData,
          // 元のJSONファイルのデータも保存
          originalJson: item.jsonData || item
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