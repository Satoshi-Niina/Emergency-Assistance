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

// 履歴の作成
export async function createHistoryItem(data: HistoryCreateData): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/history/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`履歴の作成に失敗しました: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('履歴作成エラー:', error);
    throw error;
  }
}

// 履歴の検索
export async function searchHistoryItems(
  params: HistorySearchParams
): Promise<any> {
  try {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const response = await fetch(
      `${API_BASE_URL}/api/history/list?${searchParams}`,
      {
        method: 'GET',
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error(`履歴の検索に失敗しました: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('履歴検索エラー:', error);
    throw error;
  }
}

// 履歴詳細の取得
export async function getHistoryItem(id: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/history/item/${id}`, {
      method: 'GET',
      credentials: 'include',
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

// 統計情報の取得
export async function getHistoryStats(): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/history/stats`, {
      method: 'GET',
      credentials: 'include',
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

// チャット送信時の自動履歴保存
export async function saveToHistory(data: HistoryCreateData): Promise<void> {
  try {
    // 機種や事業所などの情報を自動推測する処理
    const enhancedData = {
      ...data,
      machineModel: extractMachineModel(data.description),
      office: extractOffice(data.description),
      category: extractCategory(data.description),
      keywords: extractKeywords(data.description),
    };

    await createHistoryItem(enhancedData);
    console.log('✅ 履歴に保存しました:', enhancedData.title);
  } catch (error) {
    console.error('❌ 履歴保存に失敗しました:', error);
    // 履歴保存エラーは主機能に影響しないよう、エラーを投げない
  }
}

// テキストから機種を推測
function extractMachineModel(text: string): string | undefined {
  const machineModels = ['MT-100', 'MR-400', 'TC-250', 'SS-750'];

  for (const model of machineModels) {
    if (text.toLowerCase().includes(model.toLowerCase())) {
      return model;
    }
  }

  return undefined;
}

// テキストから事業所を推測
function extractOffice(text: string): string | undefined {
  const offices = ['東京事業所', '大阪事業所', '名古屋事業所', '福岡事業所'];

  for (const office of offices) {
    if (text.includes(office)) {
      return office;
    }
  }

  return undefined;
}

// テキストからカテゴリを推測
function extractCategory(text: string): string | undefined {
  const categories = [
    { name: 'エンジン', keywords: ['エンジン', '始動', '停止', '燃料'] },
    { name: 'ブレーキ', keywords: ['ブレーキ', '制動', '停車'] },
    { name: '電気系統', keywords: ['電気', '電源', 'バッテリー', 'ライト'] },
    { name: '油圧系統', keywords: ['油圧', 'オイル', '圧力'] },
  ];

  for (const category of categories) {
    if (category.keywords.some(keyword => text.includes(keyword))) {
      return category.name;
    }
  }

  return undefined;
}

// テキストからキーワードを抽出
function extractKeywords(text: string): string[] {
  const keywords: string[] = [];

  // 一般的なキーワードパターン
  const patterns = [
    /エンジン[停止起動始動]/g,
    /ブレーキ[不良故障]/g,
    /MT-\d+|MR-\d+|TC-\d+|SS-\d+/g,
    /[東京大阪名古屋福岡]事業所/g,
  ];

  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      keywords.push(...matches);
    }
  });

  return [...new Set(keywords)]; // 重複除去
}
