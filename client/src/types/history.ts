// 応急処置サポート履歴の型定義
export interface SupportHistoryItem {
  id: string;
  chatId?: string;
  fileName?: string;
  machineType: string;
  machineNumber: string;
  title?: string;
  incidentTitle?: string;
  location?: string;
  failureCode?: string;
  status?: string;
  engineer?: string;
  notes?: string;
  extractedComponents?: string[];
  extractedSymptoms?: string[];
  possibleModels?: string[];
  repairSchedule?: string;
  repairLocation?: string;
  requestDate?: string;
  machineTypeName?: string;
  data?: any; // 後方互換性
  conversationHistory?: any[];
  originalChatData?: any;
  messages?: any[];
  savedImages?: any[];
  machineInfo?: {
    machineTypeName?: string;
    machineNumber?: string;
  };
  jsonData: {
    // 新しいフォーマット
    title?: string;
    problemDescription?: string;
    machineType?: string;
    machineNumber?: string;
    extractedComponents?: string[];
    extractedSymptoms?: string[];
    possibleModels?: string[];
    conversationHistory?: any[];
    originalChatData?: {
      messages?: any[];
      machineInfo?: {
        machineTypeName?: string;
        machineNumber?: string;
      };
    };
    savedImages?: Array<{
      url?: string;
      path?: string;
      fileName?: string;
      description?: string;
    }>;
    messages?: any[];
    location?: string;
    status?: string;
    imagePath?: string;
    exportTimestamp?: string;
    metadata?: {
      total_messages?: number;
      user_messages?: number;
      ai_messages?: number;
      total_media?: number;
      export_format_version?: string;
      fileName?: string;
    };
    // 従来のフォーマット（後方互換性）
    question?: string;
    answer?: string;
    machineInfo?: {
      machineTypeName?: string;
      machineNumber?: string;
    };
    chatData?: {
      messages?: any[];
      machineInfo?: {
        machineTypeName?: string;
        machineNumber?: string;
      };
    };
    messageCount?: number;
    exportType?: string;
    fileName?: string;
  };
  imagePath?: string;
  imageUrl?: string;
  createdAt: string;
  lastModified?: string;
}

// 履歴検索フィルター
export interface HistorySearchFilters {
  machineType?: string;
  machineNumber?: string;
  searchText?: string; // テキスト検索用
  searchDate?: string; // 日付検索用
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