import { apiRequest } from '../api-unified';

// 故障履歴の型定義
export interface FaultHistoryItem {
  id: string;
  title: string;
  description?: string;
  machineType?: string;
  machineNumber?: string;
  office?: string;
  category?: string;
  keywords?: string[];
  emergencyGuideTitle?: string;
  emergencyGuideContent?: string;
  jsonData: any;
  storageMode: 'database' | 'file';
  filePath?: string;
  createdAt: string;
  updatedAt: string;
  images?: FaultHistoryImage[];
}

export interface FaultHistoryImage {
  id: string;
  faultHistoryId: string;
  originalFileName?: string;
  fileName: string;
  filePath: string;
  relativePath?: string;
  mimeType?: string;
  fileSize?: string;
  description?: string;
  createdAt: string;
}

export interface FaultHistoryCreateData {
  jsonData: any;
  title?: string;
  description?: string;
  extractImages?: boolean;
}

export interface FaultHistorySearchFilters {
  machineType?: string;
  machineNumber?: string;
  category?: string;
  office?: string;
  keyword?: string;
  limit?: number;
  offset?: number;
}

export interface FaultHistoryListResponse {
  success: boolean;
  data: FaultHistoryItem[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface FaultHistoryStats {
  total: number;
  byMachineType: Record<string, number>;
  byCategory: Record<string, number>;
  byOffice: Record<string, number>;
  recentCount: number;
}

/**
 * 故障履歴を保存
 */
export const saveFaultHistory = async (
  data: FaultHistoryCreateData
): Promise<{ id: string; imagePaths?: string[]; imageCount: number }> => {
  const formData = new FormData();
  
  formData.append('jsonData', JSON.stringify(data.jsonData));
  
  if (data.title) {
    formData.append('title', data.title);
  }
  
  if (data.description) {
    formData.append('description', data.description);
  }
  
  formData.append('extractImages', data.extractImages !== false ? 'true' : 'false');

  const response = await apiRequest('/fault-history', {
    method: 'POST',
    body: formData,
  });

  if (!response.success) {
    throw new Error(response.error || '故障履歴の保存に失敗しました');
  }

  return {
    id: response.id,
    imagePaths: response.imagePaths,
    imageCount: response.imageCount,
  };
};

/**
 * 故障履歴一覧を取得
 */
export const fetchFaultHistoryList = async (
  filters: FaultHistorySearchFilters = {}
): Promise<FaultHistoryListResponse> => {
  const params = new URLSearchParams();
  
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.offset) params.append('offset', filters.offset.toString());
  if (filters.machineType) params.append('machineType', filters.machineType);
  if (filters.machineNumber) params.append('machineNumber', filters.machineNumber);
  if (filters.category) params.append('category', filters.category);
  if (filters.office) params.append('office', filters.office);
  if (filters.keyword) params.append('keyword', filters.keyword);

  const response = await apiRequest(`/fault-history?${params.toString()}`);

  if (!response.success) {
    throw new Error(response.error || '故障履歴の取得に失敗しました');
  }

  return response;
};

/**
 * 故障履歴詳細を取得
 */
export const fetchFaultHistoryDetail = async (id: string): Promise<FaultHistoryItem> => {
  const response = await apiRequest(`/fault-history/${id}`);

  if (!response.success) {
    throw new Error(response.error || '故障履歴の取得に失敗しました');
  }

  return response.data;
};

/**
 * 故障履歴統計を取得
 */
export const fetchFaultHistoryStats = async (): Promise<FaultHistoryStats> => {
  const response = await apiRequest('/fault-history/stats');

  if (!response.success) {
    throw new Error(response.error || '統計情報の取得に失敗しました');
  }

  return response.data;
};

/**
 * 既存のexportsディレクトリからデータベースに移行
 */
export const importFromExports = async (force = false): Promise<{
  imported: number;
  skipped: number;
  errors?: string[];
  totalFiles: number;
}> => {
  const response = await apiRequest('/fault-history/import-from-exports', {
    method: 'POST',
    body: JSON.stringify({ force }),
  });

  if (!response.success) {
    throw new Error(response.error || '移行に失敗しました');
  }

  return {
    imported: response.imported,
    skipped: response.skipped,
    errors: response.errors,
    totalFiles: response.totalFiles,
  };
};

/**
 * 故障履歴画像のURLを生成
 */
export const getFaultHistoryImageUrl = (filename: string): string => {
  const baseUrl = import.meta.env.DEV 
    ? 'http://localhost:8080'
    : import.meta.env.VITE_API_BASE_URL || window.location.origin;
  
  return `${baseUrl}/api/fault-history/images/${filename}`;
};

/**
 * チャットエクスポートデータから故障履歴を自動保存
 */
export const saveFromChatExport = async (
  exportData: any,
  options: {
    title?: string;
    description?: string;
  } = {}
): Promise<{ id: string; imagePaths?: string[]; imageCount: number }> => {
  // エクスポートデータから基本情報を抽出
  const title = options.title || 
    exportData.title || 
    exportData.metadata?.title ||
    '故障対応履歴';
  
  const description = options.description || 
    exportData.description ||
    exportData.metadata?.description ||
    `チャットエクスポートから自動保存: ${new Date().toLocaleString()}`;

  return await saveFaultHistory({
    jsonData: exportData,
    title,
    description,
    extractImages: true,
  });
};

/**
 * 故障履歴を削除（必要に応じて実装）
 */
export const deleteFaultHistory = async (id: string): Promise<void> => {
  const response = await apiRequest(`/fault-history/${id}`, {
    method: 'DELETE',
  });

  if (!response.success) {
    throw new Error(response.error || '故障履歴の削除に失敗しました');
  }
};