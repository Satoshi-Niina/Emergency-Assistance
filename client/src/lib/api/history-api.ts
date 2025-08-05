import { 
  SupportHistoryItem, 
  HistorySearchFilters, 
  HistoryListResponse,
  BaseDataResponse,
  FlowListResponse,
  User,
  CreateUserRequest,
  ExportHistoryItem
} from '../../types/history';

// 履歴データから機種・機械番号一覧取得
export const fetchMachineData = async (): Promise<{
  machineTypes: Array<{ id: string; machineTypeName: string }>;
  machines: Array<{ id: string; machineNumber: string; machineTypeName: string }>;
}> => {
  const response = await fetch('/api/history/machine-data');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch machine data: ${response.statusText}`);
  }
  
  return response.json();
};

// 履歴一覧取得
export const fetchHistoryList = async (filters: HistorySearchFilters = {}): Promise<HistoryListResponse> => {
  const params = new URLSearchParams();
  
  if (filters.machineType) params.append('machineType', filters.machineType);
  if (filters.machineNumber) params.append('machineNumber', filters.machineNumber);
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.offset) params.append('offset', filters.offset.toString());

  const response = await fetch(`/api/history?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch history: ${response.statusText}`);
  }
  
  return response.json();
};

// 履歴詳細取得
export const fetchHistoryDetail = async (id: string): Promise<SupportHistoryItem> => {
  const response = await fetch(`/api/history/${id}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch history detail: ${response.statusText}`);
  }
  
  return response.json();
};

// 履歴作成
export const createHistory = async (data: {
  machineType: string;
  machineNumber: string;
  jsonData: any;
  image?: File;
}): Promise<SupportHistoryItem> => {
  const formData = new FormData();
  formData.append('machineType', data.machineType);
  formData.append('machineNumber', data.machineNumber);
  formData.append('jsonData', JSON.stringify(data.jsonData));
  
  if (data.image) {
    formData.append('image', data.image);
  }

  const response = await fetch('/api/history', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create history: ${response.statusText}`);
  }
  
  return response.json();
};

// 履歴削除
export const deleteHistory = async (id: string): Promise<void> => {
  const response = await fetch(`/api/history/${id}`, {
    method: 'DELETE'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete history: ${response.statusText}`);
  }
};

// 基礎データ取得
export const fetchBaseData = async (): Promise<BaseDataResponse> => {
  const response = await fetch('/api/base-data');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch base data: ${response.statusText}`);
  }
  
  return response.json();
};

// 処理済みファイル一覧取得
export const fetchProcessedFiles = async (): Promise<any> => {
  const response = await fetch('/api/files/processed');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch processed files: ${response.statusText}`);
  }
  
  return response.json();
};

// フロー一覧取得
export const fetchFlows = async (): Promise<FlowListResponse> => {
  const response = await fetch('/api/flows');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch flows: ${response.statusText}`);
  }
  
  return response.json();
};

// ユーザー一覧取得
export const fetchUsers = async (): Promise<User[]> => {
  const response = await fetch('/api/users');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.statusText}`);
  }
  
  return response.json();
};

// ユーザー作成
export const createUser = async (userData: CreateUserRequest): Promise<User> => {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create user: ${response.statusText}`);
  }
  
  return response.json();
};

// 履歴エクスポート機能

// 個別履歴エクスポート
export const exportHistoryItem = async (id: string, format: 'json' | 'csv' = 'json'): Promise<Blob> => {
  const response = await fetch(`/api/history/${id}/export?format=${format}`);
  
  if (!response.ok) {
    throw new Error(`Failed to export history: ${response.statusText}`);
  }
  
  return response.blob();
};

// 選択履歴一括エクスポート
export const exportSelectedHistory = async (ids: string[], format: 'json' | 'csv' = 'json'): Promise<Blob> => {
  const response = await fetch('/api/history/export-selected', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ids, format })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to export selected history: ${response.statusText}`);
  }
  
  return response.blob();
};

// 全履歴エクスポート
export const exportAllHistory = async (filters: HistorySearchFilters = {}, format: 'json' | 'csv' = 'json'): Promise<Blob> => {
  const params = new URLSearchParams();
  params.append('format', format);
  
  if (filters.machineType) params.append('machineType', filters.machineType);
  if (filters.machineNumber) params.append('machineNumber', filters.machineNumber);
  
  const response = await fetch(`/api/history/export-all?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error(`Failed to export all history: ${response.statusText}`);
  }
  
  return response.blob();
};

// エクスポート履歴取得
export const fetchExportHistory = async (): Promise<ExportHistoryItem[]> => {
  const response = await fetch('/api/history/export-history');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch export history: ${response.statusText}`);
  }
  
  return response.json();
}; 