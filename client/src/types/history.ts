// 応急処置サポート履歴の型定義
export interface SupportHistoryItem {
  id: string;
  machineType: string;
  machineNumber: string;
  jsonData: any;
  imagePath?: string;
  createdAt: string;
}

// 履歴検索フィルター
export interface HistorySearchFilters {
  machineType?: string;
  machineNumber?: string;
  limit?: number;
  offset?: number;
}

// 履歴APIレスポンス
export interface HistoryListResponse {
  items: SupportHistoryItem[];
  total: number;
  hasMore: boolean;
}

// 基礎データ管理の型定義
export interface BaseDataItem {
  id: string;
  title: string;
  processedAt: string;
  status: string;
}

export interface BaseDataResponse {
  success: boolean;
  data: BaseDataItem[];
  total: number;
}

// フロー管理の型定義
export interface FlowItem {
  id: string;
  title: string;
  description?: string;
  keyword: string;
  category: string;
  createdAt: string;
}

export interface FlowListResponse {
  success: boolean;
  flows: FlowItem[];
  total: number;
}

// ユーザー管理の型定義
export interface User {
  id: string;
  username: string;
  display_name: string;
  role: string;
  department?: string;
  description?: string;
  created_at: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  display_name: string;
  role: string;
  department?: string;
  description?: string;
}

// エクスポート機能の型定義
export interface ExportHistoryItem {
  id: string;
  filename: string;
  format: 'json' | 'csv' | 'pdf';
  exportedAt: string;
  fileSize?: number;
  recordCount?: number;
}

export interface ExportRequest {
  ids?: string[];
  format: 'json' | 'csv' | 'pdf';
  filters?: HistorySearchFilters;
}

export interface ExportResponse {
  success: boolean;
  filename: string;
  downloadUrl?: string;
  message?: string;
} 