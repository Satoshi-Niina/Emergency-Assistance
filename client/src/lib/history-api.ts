
import { API_BASE_URL } from './api/config';

export interface HistoryCreateData {
  chatId: string;
  title: string;
  description: string;
  machineModel?: string;
  office?: string;
  category?: string;
  emergencyGuideTitle?: string;
  emergencyGuideContent?: string;
  keywords?: string[];
  images?: Array<{
    url: string;
    description?: string;
  }>;
}

export interface HistorySearchParams {
  query?: string;
  machineModel?: string;
  office?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

// 履歴の作�E
export async function createHistoryItem(data: HistoryCreateData): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/history/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`履歴の作�Eに失敗しました: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('履歴作�Eエラー:', error);
    throw error;
  }
}

// 履歴の検索
export async function searchHistoryItems(params: HistorySearchParams): Promise<any> {
  try {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const response = await fetch(`${API_BASE_URL}/api/history/list?${searchParams}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`履歴の検索に失敗しました: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('履歴検索エラー:', error);
    throw error;
  }
}

// 履歴詳細の取征E
export async function getHistoryItem(id: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/history/item/${id}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`履歴詳細の取得に失敗しました: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('履歴詳細取得エラー:', error);
    throw error;
  }
}

// 統計情報の取征E
export async function getHistoryStats(): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/history/stats`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`統計情報の取得に失敗しました: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('統計情報取得エラー:', error);
    throw error;
  }
}

// チャチE��送信時�E自動履歴保孁E
export async function saveToHistory(data: HistoryCreateData): Promise<void> {
  try {
    // 機種めE��業所などの惁E��を�E動推測する処琁E
    const enhancedData = {
      ...data,
      machineModel: extractMachineModel(data.description),
      office: extractOffice(data.description),
      category: extractCategory(data.description),
      keywords: extractKeywords(data.description)
    };

    await createHistoryItem(enhancedData);
    console.log('✁E履歴に保存しました:', enhancedData.title);
  } catch (error) {
    console.error('❁E履歴保存に失敗しました:', error);
    // 履歴保存エラーは主機�Eに影響しなぁE��ぁE��エラーを投げなぁE
  }
}

// チE��ストから機種を推測
function extractMachineModel(text: string): string | undefined {
  const machineModels = ['MT-100', 'MR-400', 'TC-250', 'SS-750'];
  
  for (const model of machineModels) {
    if (text.toLowerCase().includes(model.toLowerCase())) {
      return model;
    }
  }
  
  return undefined;
}

// チE��ストから事業所を推測
function extractOffice(text: string): string | undefined {
  const offices = ['東京事業所', '大阪事業所', '名古屋事業所', '福岡事業所'];
  
  for (const office of offices) {
    if (text.includes(office)) {
      return office;
    }
  }
  
  return undefined;
}

// チE��ストからカチE��リを推測
function extractCategory(text: string): string | undefined {
  const categories = [
    { name: 'エンジン', keywords: ['エンジン', '始動', '停止', '燁E��'] },
    { name: 'ブレーキ', keywords: ['ブレーキ', '制勁E, '停軁E] },
    { name: '電気系統', keywords: ['電氁E, '電溁E, 'バッチE��ー', 'ライチE] },
    { name: '油圧系統', keywords: ['油圧', 'オイル', '圧劁E] }
  ];
  
  for (const category of categories) {
    if (category.keywords.some(keyword => text.includes(keyword))) {
      return category.name;
    }
  }
  
  return undefined;
}

// チE��ストからキーワードを抽出
function extractKeywords(text: string): string[] {
  const keywords: string[] = [];
  
  // 一般皁E��キーワードパターン
  const patterns = [
    /エンジン[停止起動始動]/g,
    /ブレーキ[不良敁E��]/g,
    /MT-\d+|MR-\d+|TC-\d+|SS-\d+/g,
    /[東京大阪名古屋福岡]事業所/g
  ];
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      keywords.push(...matches);
    }
  });
  
  return [...new Set(keywords)]; // 重褁E��去
}
