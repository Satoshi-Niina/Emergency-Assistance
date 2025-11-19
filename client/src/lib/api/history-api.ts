import {
  SupportHistoryItem,
  HistorySearchFilters,
  HistoryListResponse,
  BaseDataResponse,
  FlowListResponse,
  User,
  CreateUserRequest,
  ExportHistoryItem,
} from '../../types/history';
import { apiRequest } from '../api';
import {
  fetchFaultHistoryList,
  fetchFaultHistoryDetail,
  saveFaultHistory,
  getFaultHistoryImageUrl,
  type FaultHistoryItem,
} from './fault-history-api';

// 履歴シューティングから機種・機械番号一覧取征E
export const fetchMachineData = async (): Promise<{
  machineTypes: Array<{ id: string; machineTypeName: string }>;
  machines: Array<{
    id: string;
    machineNumber: string;
    machineTypeName: string;
  }>;
}> => {
  try {
    return await apiRequest('/history/machine-data');
  } catch (error) {
    console.error('機種シューティング取得エラー:', error);
    // エラーの場合�E空のシューティングを返す
    return {
      machineTypes: [],
      machines: [],
    };
  }
};

// 履歴一覧取得（既存履歴 + 敁Eー履歴DB統合！E
export const fetchHistoryList = async (
  filters: HistorySearchFilters = {}
): Promise<HistoryListResponse> => {
  try {
    // 並行して既存履歴と敁Eー履歴DBから取征E
    const [legacyResponse, faultHistoryResponse] = await Promise.allSettled([
      fetchLegacyHistoryList(filters),
      fetchFaultHistoryListInternal(filters)
    ]);

    let allItems: SupportHistoryItem[] = [];

    // 既存履歴の結果を�E琁E
    if (legacyResponse.status === 'fulfilled' && legacyResponse.value.items) {
      allItems = [...allItems, ...legacyResponse.value.items];
    }

    // 敁Eー履歴DBの結果を�E琁EーEupportHistoryItem形式に変換�E�E
    if (faultHistoryResponse.status === 'fulfilled' && faultHistoryResponse.value.data) {
      const convertedItems = faultHistoryResponse.value.data.map(convertFaultHistoryToSupportHistory);
      allItems = [...allItems, ...convertedItems];
    }

    // 作�E日時でソーティング
    allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // ペ�Eジング適用
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    const paginatedItems = allItems.slice(offset, offset + limit);

    return {
      items: paginatedItems,
      total: allItems.length,
      hasMore: offset + limit < allItems.length,
    };
  } catch (error) {
    console.error('履歴一覧取得エラー:', error);
    return {
      items: [],
      total: 0,
      hasMore: false,
    };
  }
};

// 既存履歴取得（従来の方法！E
const fetchLegacyHistoryList = async (
  filters: HistorySearchFilters = {}
): Promise<HistoryListResponse> => {
  const params = new URLSearchParams();

  if (filters.machineType) params.append('machineType', filters.machineType);
  if (filters.machineNumber) params.append('machineNumber', filters.machineNumber);
  if (filters.searchText) params.append('searchText', filters.searchText);
  if (filters.searchDate) params.append('searchDate', filters.searchDate);
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.offset) params.append('offset', filters.offset.toString());

  const response = await apiRequest(`/history?${params.toString()}`);

  if (!response.ok) {
    return {
      items: [],
      total: 0,
      hasMore: false,
    };
  }

  return response.json();
};

// 敁Eー履歴DB取得（�E部用�E�E
const fetchFaultHistoryListInternal = async (filters: HistorySearchFilters) => {
  return await fetchFaultHistoryList({
    machineType: filters.machineType,
    machineNumber: filters.machineNumber,
    keyword: filters.searchText,
    limit: filters.limit,
    offset: filters.offset,
  });
};

// FaultHistoryItemをSupportHistoryItem形式に変換
const convertFaultHistoryToSupportHistory = (faultItem: FaultHistoryItem): SupportHistoryItem => {
  // 画像情報を抽出
  const imageUrl = faultItem.images && faultItem.images.length > 0
    ? getFaultHistoryImageUrl(faultItem.images[0].fileName)
    : undefined;

  return {
    id: faultItem.id,
    machineType: faultItem.machineType || '',
    machineNumber: faultItem.machineNumber || '',
    title: faultItem.title,
    jsonData: {
      ...faultItem.jsonData,
      title: faultItem.title,
      problemDescription: faultItem.description,
      machineType: faultItem.machineType,
      machineNumber: faultItem.machineNumber,
      metadata: {
        office: faultItem.office,
        category: faultItem.category,
        keywords: faultItem.keywords,
        source: 'fault-history-db',
      },
    },
    imagePath: imageUrl,
    imageUrl: imageUrl,
    createdAt: faultItem.createdAt,
    source: 'fault-history-db',
  };
};

// 履歴詳細取得（既存履歴 + 敁Eー履歴DB統合！E
export const fetchHistoryDetail = async (
  id: string
): Promise<SupportHistoryItem> => {
  try {
    // まず故障履歴DBから検索
    const faultHistoryDetail = await fetchFaultHistoryDetail(id);
    if (faultHistoryDetail) {
      return convertFaultHistoryToSupportHistory(faultHistoryDetail);
    }
  } catch (error) {
    // 敁Eー履歴DBになぁEー合�E既存履歴から検索
    console.warn('敁Eー履歴DBで見つからず、既存履歴を検索:', error);
  }

  // 既存履歴から取征E
  const response = await apiRequest(`/history/${id}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch history detail: ${response.statusText}`);
  }

  return response.json();
};

// 履歴作�E�E�故障履歴DBに優先保存！E
export const createHistory = async (data: {
  machineType: string;
  machineNumber: string;
  jsonData: any;
  image?: File;
}): Promise<SupportHistoryItem> => {
  try {
    // 敁Eー履歴DBに保存を試衁E
    const faultHistoryResult = await saveFaultHistory({
      jsonData: data.jsonData,
      title: data.jsonData.title || `${data.machineType} - ${data.machineNumber}`,
      extractImages: true,
    });

    // 敁Eー履歴DBから詳細を取得してSupportHistoryItem形式で返す
    const savedItem = await fetchFaultHistoryDetail(faultHistoryResult.id);
    return convertFaultHistoryToSupportHistory(savedItem);
  } catch (error) {
    console.warn('敁Eー履歴DBへの保存に失敗、従来方式で保孁E', error);

    // 従来の方式で既存履歴に保孁E
    const formData = new FormData();
    formData.append('machineType', data.machineType);
    formData.append('machineNumber', data.machineNumber);
    formData.append('jsonData', JSON.stringify(data.jsonData));

    if (data.image) {
      formData.append('image', data.image);
    }

    return await apiRequest('/history', {
      method: 'POST',
      body: formData,
    });
  }
};

// 履歴削除
export const deleteHistory = async (id: string): Promise<void> => {
  try {
    const result = await apiRequest<{ success: boolean; message?: string; error?: string }>(`/history/${id}`, {
      method: 'DELETE',
    });

    // apiRequestは成功時にシューティングを返し、エラー時には例外をthrowする
    // レスポンスシューティングをチェティングー
    if (result && !result.success) {
      throw new Error(result.error || result.message || '履歴の削除に失敗しました');
    }
  } catch (error) {
    // apiRequestが既にエラーをthrowしてぁEー場合、そのまま再スロー
    console.error('履歴削除APIエラー:', error);
    throw error;
  }
};

// 基礎データ取征E
export const fetchBaseData = async (): Promise<BaseDataResponse> => {
  return await apiRequest('/base-data');
};

// 処琁Eーみファイル一覧取征E
export const fetchProcessedFiles = async (): Promise<any> => {
  return await apiRequest('/files/processed');
};

// フロー一覧取征E
export const fetchFlows = async (): Promise<FlowListResponse> => {
  return await apiRequest('/flows');
};

// ユーザー一覧取征E
export const fetchUsers = async (): Promise<User[]> => {
  return await apiRequest('/users');
};

// ユーザー作�E
export const createUser = async (
  userData: CreateUserRequest
): Promise<User> => {
  return await apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

// 履歴エクスポ�Eト機�E

// 個別履歴エクスポ�ティングE
export const exportHistoryItem = async (
  id: string,
  format: 'json' | 'csv' = 'json'
): Promise<Blob> => {
  const response = await apiRequest(`/history/${id}/export?format=${format}`);

  if (!response.ok) {
    throw new Error(`Failed to export history: ${response.statusText}`);
  }

  return response.blob();
};

// 選択履歴一括エクスポ�ティングE
export const exportSelectedHistory = async (
  ids: string[],
  format: 'json' | 'csv' = 'json'
): Promise<Blob> => {
  return await apiRequest('/history/export-selected', {
    method: 'POST',
    body: JSON.stringify({ ids, format }),
  });
};

// 全履歴エクスポ�ティングE
export const exportAllHistory = async (
  filters: HistorySearchFilters = {},
  format: 'json' | 'csv' = 'json'
): Promise<Blob> => {
  const params = new URLSearchParams();
  params.append('format', format);

  if (filters.machineType) params.append('machineType', filters.machineType);
  if (filters.machineNumber)
    params.append('machineNumber', filters.machineNumber);

  const response = await apiRequest(`/history/export-all?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Failed to export all history: ${response.statusText}`);
  }

  return response.blob();
};

// エクスポ�Eト履歴取征E
export const fetchExportHistory = async (): Promise<ExportHistoryItem[]> => {
  return await apiRequest('/history/export-history');
};

// 高度なティングースト検索
export const advancedSearch = async (
  searchText: string,
  limit: number = 50
): Promise<any> => {
  return await apiRequest('/history/advanced-search', {
    method: 'POST',
    body: JSON.stringify({ searchText, limit }),
  });
};

// レポ�Eト生戁E
export const generateReport = async (
  searchFilters: any,
  reportTitle?: string,
  reportDescription?: string
): Promise<Blob> => {
  return await apiRequest('/history/generate-report', {
    method: 'POST',
    body: JSON.stringify({ searchFilters, reportTitle, reportDescription }),
  });
};

// JSONシューティングをGPTで要紁E
export const summarizeWithGPT = async (jsonData: any): Promise<string> => {
  try {
    const response = await apiRequest<{ success: boolean; summary: string; error?: string }>(
      '/history/summarize',
      {
        method: 'POST',
        body: JSON.stringify({ jsonData }),
      }
    );

    if (!response.success || !response.summary) {
      throw new Error(response.error || '要紁E�E生�Eに失敗しました');
    }

    return response.summary;
  } catch (error) {
    console.error('GPT要紁Eーラー:', error);
    throw error;
  }
};
