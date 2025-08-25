// 蠢懈･蜃ｦ鄂ｮ繧ｵ繝昴・繝亥ｱ･豁ｴ縺ｮ蝙句ｮ夂ｾｩ
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
  data?: any; // 蠕梧婿莠呈鋤諤ｧ
  conversationHistory?: any[];
  originalChatData?: any;
  messages?: any[];
  savedImages?: any[];
  machineInfo?: {
    machineTypeName?: string;
    machineNumber?: string;
  };
  jsonData: {
    // 譁ｰ縺励＞繝輔か繝ｼ繝槭ャ繝・
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
    repairSchedule?: string;
    remarks?: string;
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
    // 蠕捺擂縺ｮ繝輔か繝ｼ繝槭ャ繝茨ｼ亥ｾ梧婿莠呈鋤諤ｧ・・
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

// 螻･豁ｴ讀懃ｴ｢繝輔ぅ繝ｫ繧ｿ繝ｼ
export interface HistorySearchFilters {
  machineType?: string;
  machineNumber?: string;
  searchText?: string; // 繝・く繧ｹ繝域､懃ｴ｢逕ｨ
  searchDate?: string; // 譌･莉俶､懃ｴ｢逕ｨ
  limit?: number;
  offset?: number;
}

// 螻･豁ｴAPI繝ｬ繧ｹ繝昴Φ繧ｹ
export interface HistoryListResponse {
  items: SupportHistoryItem[];
  total: number;
  hasMore: boolean;
}

// 蝓ｺ遉弱ョ繝ｼ繧ｿ邂｡逅・・蝙句ｮ夂ｾｩ
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

// 繝輔Ο繝ｼ邂｡逅・・蝙句ｮ夂ｾｩ
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

// 繝ｦ繝ｼ繧ｶ繝ｼ邂｡逅・・蝙句ｮ夂ｾｩ
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

// 繧ｨ繧ｯ繧ｹ繝昴・繝域ｩ溯・縺ｮ蝙句ｮ夂ｾｩ
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


