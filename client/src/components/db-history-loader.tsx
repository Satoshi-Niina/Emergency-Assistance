// ファイルベ�Eス履歴ローダー
import { SupportHistoryItem } from '../types/history';

export const loadHistoryFromDB = async (): Promise<SupportHistoryItem[]> => {
  try {
    const { buildApiUrl } = await import('../lib/api');

    // ファイルベ�Eスの統括API使用
    const response = await fetch(buildApiUrl('/history?limit=100&source=files&includeImages=true'));

    if (!response.ok) {
      throw new Error(`履歴取得失敁E ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      console.warn('⚠�E�E応答ティングE�Eタが含まれてぁEーせん');
      return [];
    }

    console.log(`🔍 ファイルベ�Eス履歴取得�E劁E ${data.data.length}件, バ�Eジョン: ${data.version}`);

    // SupportHistoryItem型に変換�E�ファイルベ�Eス�E�E
    const historyItems: SupportHistoryItem[] = data.data.map((item: any) => {
      // 機種と機械番号を抽出�E�褁Eーの形式に対応！E
      // サーバ�E側で既に抽出されてぁEー場合�Eそれを使用、なけティングチEーォルト値
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
        incidentTitle: item.title || 'タイトルなぁE,
        problemDescription: item.description || '',
        createdAt: item.createdAt || new Date().toISOString(),
        fileName: item.fileName || `${item.id}.json`,
        hasImage: item.hasImages || (item.imageCount > 0),
        jsonData: {
          // 画像情報を含むjsonDataを構篁E
          images: item.images || [],
          imageCount: item.imageCount || 0,
          savedImages: item.images ? item.images.map((img: any) => ({
            messageId: img.messageId,
            fileName: img.fileName,
            url: img.url || `/api/images/chat-exports/${img.fileName}`,
            path: img.fileName
          })) : [],
          // 完�EなJSOティングE�Eタも保持
          ...(item.jsonData || {}),
          chatData: item.jsonData?.chatData || item.jsonData || {},
        },
        source: 'files'
      };
    });

    return historyItems;

  } catch (error) {
    console.error('❁E履歴取得エラー:', error);
    return [];
  }
};
