import { apiRequest } from '../api';

// 謨・囿螻･豁ｴ縺ｮ蝙句ｮ夂ｾｩ
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
 * 謨・囿螻･豁ｴ繧剃ｿ晏ｭ・
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
    throw new Error(response.error || '謨・囿螻･豁ｴ縺ｮ菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆');
  }

  return {
    id: response.id,
    imagePaths: response.imagePaths,
    imageCount: response.imageCount,
  };
};

/**
 * 謨・囿螻･豁ｴ荳隕ｧ繧貞叙蠕・
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
    throw new Error(response.error || '謨・囿螻･豁ｴ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆');
  }

  return response;
};

/**
 * 謨・囿螻･豁ｴ隧ｳ邏ｰ繧貞叙蠕・
 */
export const fetchFaultHistoryDetail = async (id: string): Promise<FaultHistoryItem> => {
  const response = await apiRequest(`/fault-history/${id}`);

  if (!response.success) {
    throw new Error(response.error || '謨・囿螻･豁ｴ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆');
  }

  return response.data;
};

/**
 * 謨・囿螻･豁ｴ邨ｱ險医ｒ蜿門ｾ・
 */
export const fetchFaultHistoryStats = async (): Promise<FaultHistoryStats> => {
  const response = await apiRequest('/fault-history/stats');

  if (!response.success) {
    throw new Error(response.error || '邨ｱ險域ュ蝣ｱ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆');
  }

  return response.data;
};

/**
 * 譌｢蟄倥・exports繝・ぅ繝ｬ繧ｯ繝医Μ縺九ｉ繝・・繧ｿ繝吶・繧ｹ縺ｫ遘ｻ陦・
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
    throw new Error(response.error || '遘ｻ陦後↓螟ｱ謨励＠縺ｾ縺励◆');
  }

  return {
    imported: response.imported,
    skipped: response.skipped,
    errors: response.errors,
    totalFiles: response.totalFiles,
  };
};

/**
 * 謨・囿螻･豁ｴ逕ｻ蜒上・URL繧堤函謌・
 */
export const getFaultHistoryImageUrl = (filename: string): string => {
  const baseUrl = import.meta.env.DEV 
    ? 'http://localhost:8080'
    : import.meta.env.VITE_API_BASE_URL || window.location.origin;
  
  return `${baseUrl}/api/fault-history/images/${filename}`;
};

/**
 * 繝√Ε繝・ヨ繧ｨ繧ｯ繧ｹ繝昴・繝医ョ繝ｼ繧ｿ縺九ｉ謨・囿螻･豁ｴ繧定・蜍穂ｿ晏ｭ・
 */
export const saveFromChatExport = async (
  exportData: any,
  options: {
    title?: string;
    description?: string;
  } = {}
): Promise<{ id: string; imagePaths?: string[]; imageCount: number }> => {
  // 繧ｨ繧ｯ繧ｹ繝昴・繝医ョ繝ｼ繧ｿ縺九ｉ蝓ｺ譛ｬ諠・ｱ繧呈歓蜃ｺ
  const title = options.title || 
    exportData.title || 
    exportData.metadata?.title ||
    '謨・囿蟇ｾ蠢懷ｱ･豁ｴ';
  
  const description = options.description || 
    exportData.description ||
    exportData.metadata?.description ||
    `繝√Ε繝・ヨ繧ｨ繧ｯ繧ｹ繝昴・繝医°繧芽・蜍穂ｿ晏ｭ・ ${new Date().toLocaleString()}`;

  return await saveFaultHistory({
    jsonData: exportData,
    title,
    description,
    extractImages: true,
  });
};

/**
 * 謨・囿螻･豁ｴ繧貞炎髯､・亥ｿ・ｦ√↓蠢懊§縺ｦ螳溯｣・ｼ・
 */
export const deleteFaultHistory = async (id: string): Promise<void> => {
  const response = await apiRequest(`/fault-history/${id}`, {
    method: 'DELETE',
  });

  if (!response.success) {
    throw new Error(response.error || '謨・囿螻･豁ｴ縺ｮ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
  }
};