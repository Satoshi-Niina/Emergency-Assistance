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

// 螻･豁ｴ繝・・繧ｿ縺九ｉ讖溽ｨｮ繝ｻ讖滓｢ｰ逡ｪ蜿ｷ荳隕ｧ蜿門ｾ・
export const fetchMachineData = async (): Promise<{
  machineTypes: Array<{ id: string; machineTypeName: string }>;
  machines: Array<{ id: string; machineNumber: string; machineTypeName: string }>;
}> => {
  try {
    const response = await fetch('/api/history/machine-data');
    
    if (!response.ok) {
      console.warn(`讖溽ｨｮ繝・・繧ｿ蜿門ｾ励お繝ｩ繝ｼ: ${response.status} ${response.statusText}`);
      // 繧ｨ繝ｩ繝ｼ縺ｮ蝣ｴ蜷医・遨ｺ縺ｮ繝・・繧ｿ繧定ｿ斐☆
      return {
        machineTypes: [],
        machines: []
      };
    }
    
    return response.json();
  } catch (error) {
    console.error('讖溽ｨｮ繝・・繧ｿ蜿門ｾ励お繝ｩ繝ｼ:', error);
    // 繧ｨ繝ｩ繝ｼ縺ｮ蝣ｴ蜷医・遨ｺ縺ｮ繝・・繧ｿ繧定ｿ斐☆
    return {
      machineTypes: [],
      machines: []
    };
  }
};

// 螻･豁ｴ荳隕ｧ蜿門ｾ・
export const fetchHistoryList = async (filters: HistorySearchFilters = {}): Promise<HistoryListResponse> => {
  try {
    const params = new URLSearchParams();
    
    if (filters.machineType) params.append('machineType', filters.machineType);
    if (filters.machineNumber) params.append('machineNumber', filters.machineNumber);
    if (filters.searchText) params.append('searchText', filters.searchText);
    if (filters.searchDate) params.append('searchDate', filters.searchDate);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    const response = await fetch(`/api/history?${params.toString()}`);
    
    if (!response.ok) {
      console.warn(`螻･豁ｴ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ: ${response.status} ${response.statusText}`);
      // 繧ｨ繝ｩ繝ｼ縺ｮ蝣ｴ蜷医・遨ｺ縺ｮ繝・・繧ｿ繧定ｿ斐☆
      return {
        success: true,
        items: [],
        total: 0,
        timestamp: new Date().toISOString()
      };
    }
    
    return response.json();
  } catch (error) {
    console.error('螻･豁ｴ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
    // 繧ｨ繝ｩ繝ｼ縺ｮ蝣ｴ蜷医・遨ｺ縺ｮ繝・・繧ｿ繧定ｿ斐☆
    return {
      success: true,
      items: [],
      total: 0,
      timestamp: new Date().toISOString()
    };
  }
};

// 螻･豁ｴ隧ｳ邏ｰ蜿門ｾ・
export const fetchHistoryDetail = async (id: string): Promise<SupportHistoryItem> => {
  const response = await fetch(`/api/history/${id}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch history detail: ${response.statusText}`);
  }
  
  return response.json();
};

// 螻･豁ｴ菴懈・
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

// 螻･豁ｴ蜑企勁
export const deleteHistory = async (id: string): Promise<void> => {
  const response = await fetch(`/api/history/${id}`, {
    method: 'DELETE'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete history: ${response.statusText}`);
  }
};

// 蝓ｺ遉弱ョ繝ｼ繧ｿ蜿門ｾ・
export const fetchBaseData = async (): Promise<BaseDataResponse> => {
  const response = await fetch('/api/base-data');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch base data: ${response.statusText}`);
  }
  
  return response.json();
};

// 蜃ｦ逅・ｸ医∩繝輔ぃ繧､繝ｫ荳隕ｧ蜿門ｾ・
export const fetchProcessedFiles = async (): Promise<any> => {
  const response = await fetch('/api/files/processed');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch processed files: ${response.statusText}`);
  }
  
  return response.json();
};

// 繝輔Ο繝ｼ荳隕ｧ蜿門ｾ・
export const fetchFlows = async (): Promise<FlowListResponse> => {
  const response = await fetch('/api/flows');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch flows: ${response.statusText}`);
  }
  
  return response.json();
};

// 繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ蜿門ｾ・
export const fetchUsers = async (): Promise<User[]> => {
  const response = await fetch('/api/users');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.statusText}`);
  }
  
  return response.json();
};

// 繝ｦ繝ｼ繧ｶ繝ｼ菴懈・
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

// 螻･豁ｴ繧ｨ繧ｯ繧ｹ繝昴・繝域ｩ溯・

// 蛟句挨螻･豁ｴ繧ｨ繧ｯ繧ｹ繝昴・繝・
export const exportHistoryItem = async (id: string, format: 'json' | 'csv' = 'json'): Promise<Blob> => {
  const response = await fetch(`/api/history/${id}/export?format=${format}`);
  
  if (!response.ok) {
    throw new Error(`Failed to export history: ${response.statusText}`);
  }
  
  return response.blob();
};

// 驕ｸ謚槫ｱ･豁ｴ荳諡ｬ繧ｨ繧ｯ繧ｹ繝昴・繝・
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

// 蜈ｨ螻･豁ｴ繧ｨ繧ｯ繧ｹ繝昴・繝・
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

// 繧ｨ繧ｯ繧ｹ繝昴・繝亥ｱ･豁ｴ蜿門ｾ・
export const fetchExportHistory = async (): Promise<ExportHistoryItem[]> => {
  const response = await fetch('/api/history/export-history');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch export history: ${response.statusText}`);
  }
  
  return response.json();
};

// 鬮伜ｺｦ縺ｪ繝・く繧ｹ繝域､懃ｴ｢
export const advancedSearch = async (searchText: string, limit: number = 50): Promise<any> => {
  const response = await fetch('/api/history/advanced-search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ searchText, limit })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to perform advanced search: ${response.statusText}`);
  }
  
  return response.json();
};

// 繝ｬ繝昴・繝育函謌・
export const generateReport = async (searchFilters: any, reportTitle?: string, reportDescription?: string): Promise<Blob> => {
  const response = await fetch('/api/history/generate-report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ searchFilters, reportTitle, reportDescription })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to generate report: ${response.statusText}`);
  }
  
  return response.blob();
}; 


