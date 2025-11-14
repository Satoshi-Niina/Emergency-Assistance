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

// 螻･豁ｴ繝・・繧ｿ縺九ｉ讖溽ｨｮ繝ｻ讖滓｢ｰ逡ｪ蜿ｷ荳隕ｧ蜿門ｾ・
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
    console.error('讖溽ｨｮ繝・・繧ｿ蜿門ｾ励お繝ｩ繝ｼ:', error);
    // 繧ｨ繝ｩ繝ｼ縺ｮ蝣ｴ蜷医・遨ｺ縺ｮ繝・・繧ｿ繧定ｿ斐☆
    return {
      machineTypes: [],
      machines: [],
    };
  }
};

// 螻･豁ｴ荳隕ｧ蜿門ｾ暦ｼ域里蟄伜ｱ･豁ｴ + 謨・囿螻･豁ｴDB邨ｱ蜷茨ｼ・
export const fetchHistoryList = async (
  filters: HistorySearchFilters = {}
): Promise<HistoryListResponse> => {
  try {
    // 荳ｦ陦後＠縺ｦ譌｢蟄伜ｱ･豁ｴ縺ｨ謨・囿螻･豁ｴDB縺九ｉ蜿門ｾ・
    const [legacyResponse, faultHistoryResponse] = await Promise.allSettled([
      fetchLegacyHistoryList(filters),
      fetchFaultHistoryListInternal(filters)
    ]);

    let allItems: SupportHistoryItem[] = [];
    
    // 譌｢蟄伜ｱ･豁ｴ縺ｮ邨先棡繧貞・逅・
    if (legacyResponse.status === 'fulfilled' && legacyResponse.value.items) {
      allItems = [...allItems, ...legacyResponse.value.items];
    }

    // 謨・囿螻･豁ｴDB縺ｮ邨先棡繧貞・逅・ｼ・upportHistoryItem蠖｢蠑上↓螟画鋤・・
    if (faultHistoryResponse.status === 'fulfilled' && faultHistoryResponse.value.data) {
      const convertedItems = faultHistoryResponse.value.data.map(convertFaultHistoryToSupportHistory);
      allItems = [...allItems, ...convertedItems];
    }

    // 菴懈・譌･譎ゅ〒繧ｽ繝ｼ繝・
    allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 繝壹・繧ｸ繝ｳ繧ｰ驕ｩ逕ｨ
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    const paginatedItems = allItems.slice(offset, offset + limit);

    return {
      items: paginatedItems,
      total: allItems.length,
      hasMore: offset + limit < allItems.length,
    };
  } catch (error) {
    console.error('螻･豁ｴ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
    return {
      items: [],
      total: 0,
      hasMore: false,
    };
  }
};

// 譌｢蟄伜ｱ･豁ｴ蜿門ｾ暦ｼ亥ｾ捺擂縺ｮ譁ｹ豕包ｼ・
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

// 謨・囿螻･豁ｴDB蜿門ｾ暦ｼ亥・驛ｨ逕ｨ・・
const fetchFaultHistoryListInternal = async (filters: HistorySearchFilters) => {
  return await fetchFaultHistoryList({
    machineType: filters.machineType,
    machineNumber: filters.machineNumber,
    keyword: filters.searchText,
    limit: filters.limit,
    offset: filters.offset,
  });
};

// FaultHistoryItem繧担upportHistoryItem蠖｢蠑上↓螟画鋤
const convertFaultHistoryToSupportHistory = (faultItem: FaultHistoryItem): SupportHistoryItem => {
  // 逕ｻ蜒乗ュ蝣ｱ繧呈歓蜃ｺ
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

// 螻･豁ｴ隧ｳ邏ｰ蜿門ｾ暦ｼ域里蟄伜ｱ･豁ｴ + 謨・囿螻･豁ｴDB邨ｱ蜷茨ｼ・
export const fetchHistoryDetail = async (
  id: string
): Promise<SupportHistoryItem> => {
  try {
    // 縺ｾ縺壽腐髫懷ｱ･豁ｴDB縺九ｉ讀懃ｴ｢
    const faultHistoryDetail = await fetchFaultHistoryDetail(id);
    if (faultHistoryDetail) {
      return convertFaultHistoryToSupportHistory(faultHistoryDetail);
    }
  } catch (error) {
    // 謨・囿螻･豁ｴDB縺ｫ縺ｪ縺・ｴ蜷医・譌｢蟄伜ｱ･豁ｴ縺九ｉ讀懃ｴ｢
    console.warn('謨・囿螻･豁ｴDB縺ｧ隕九▽縺九ｉ縺壹∵里蟄伜ｱ･豁ｴ繧呈､懃ｴ｢:', error);
  }

  // 譌｢蟄伜ｱ･豁ｴ縺九ｉ蜿門ｾ・
  const response = await apiRequest(`/history/${id}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch history detail: ${response.statusText}`);
  }

  return response.json();
};

// 螻･豁ｴ菴懈・・域腐髫懷ｱ･豁ｴDB縺ｫ蜆ｪ蜈井ｿ晏ｭ假ｼ・
export const createHistory = async (data: {
  machineType: string;
  machineNumber: string;
  jsonData: any;
  image?: File;
}): Promise<SupportHistoryItem> => {
  try {
    // 謨・囿螻･豁ｴDB縺ｫ菫晏ｭ倥ｒ隧ｦ陦・
    const faultHistoryResult = await saveFaultHistory({
      jsonData: data.jsonData,
      title: data.jsonData.title || `${data.machineType} - ${data.machineNumber}`,
      extractImages: true,
    });

    // 謨・囿螻･豁ｴDB縺九ｉ隧ｳ邏ｰ繧貞叙蠕励＠縺ｦSupportHistoryItem蠖｢蠑上〒霑斐☆
    const savedItem = await fetchFaultHistoryDetail(faultHistoryResult.id);
    return convertFaultHistoryToSupportHistory(savedItem);
  } catch (error) {
    console.warn('謨・囿螻･豁ｴDB縺ｸ縺ｮ菫晏ｭ倥↓螟ｱ謨励∝ｾ捺擂譁ｹ蠑上〒菫晏ｭ・', error);
    
    // 蠕捺擂縺ｮ譁ｹ蠑上〒譌｢蟄伜ｱ･豁ｴ縺ｫ菫晏ｭ・
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

// 螻･豁ｴ蜑企勁
export const deleteHistory = async (id: string): Promise<void> => {
  try {
    const result = await apiRequest<{ success: boolean; message?: string; error?: string }>(`/history/${id}`, {
      method: 'DELETE',
    });

    // apiRequest縺ｯ謌仙粥譎ゅ↓繝・・繧ｿ繧定ｿ斐＠縲√お繝ｩ繝ｼ譎ゅ↓縺ｯ萓句､悶ｒthrow縺吶ｋ
    // 繝ｬ繧ｹ繝昴Φ繧ｹ繝・・繧ｿ繧偵メ繧ｧ繝・け
    if (result && !result.success) {
      throw new Error(result.error || result.message || '螻･豁ｴ縺ｮ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
    }
  } catch (error) {
    // apiRequest縺梧里縺ｫ繧ｨ繝ｩ繝ｼ繧稚hrow縺励※縺・ｋ蝣ｴ蜷医√◎縺ｮ縺ｾ縺ｾ蜀阪せ繝ｭ繝ｼ
    console.error('螻･豁ｴ蜑企勁API繧ｨ繝ｩ繝ｼ:', error);
    throw error;
  }
};

// 蝓ｺ遉弱ョ繝ｼ繧ｿ蜿門ｾ・
export const fetchBaseData = async (): Promise<BaseDataResponse> => {
  return await apiRequest('/base-data');
};

// 蜃ｦ逅・ｸ医∩繝輔ぃ繧､繝ｫ荳隕ｧ蜿門ｾ・
export const fetchProcessedFiles = async (): Promise<any> => {
  return await apiRequest('/files/processed');
};

// 繝輔Ο繝ｼ荳隕ｧ蜿門ｾ・
export const fetchFlows = async (): Promise<FlowListResponse> => {
  return await apiRequest('/flows');
};

// 繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ蜿門ｾ・
export const fetchUsers = async (): Promise<User[]> => {
  return await apiRequest('/users');
};

// 繝ｦ繝ｼ繧ｶ繝ｼ菴懈・
export const createUser = async (
  userData: CreateUserRequest
): Promise<User> => {
  return await apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

// 螻･豁ｴ繧ｨ繧ｯ繧ｹ繝昴・繝域ｩ溯・

// 蛟句挨螻･豁ｴ繧ｨ繧ｯ繧ｹ繝昴・繝・
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

// 驕ｸ謚槫ｱ･豁ｴ荳諡ｬ繧ｨ繧ｯ繧ｹ繝昴・繝・
export const exportSelectedHistory = async (
  ids: string[],
  format: 'json' | 'csv' = 'json'
): Promise<Blob> => {
  return await apiRequest('/history/export-selected', {
    method: 'POST',
    body: JSON.stringify({ ids, format }),
  });
};

// 蜈ｨ螻･豁ｴ繧ｨ繧ｯ繧ｹ繝昴・繝・
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

// 繧ｨ繧ｯ繧ｹ繝昴・繝亥ｱ･豁ｴ蜿門ｾ・
export const fetchExportHistory = async (): Promise<ExportHistoryItem[]> => {
  return await apiRequest('/history/export-history');
};

// 鬮伜ｺｦ縺ｪ繝・く繧ｹ繝域､懃ｴ｢
export const advancedSearch = async (
  searchText: string,
  limit: number = 50
): Promise<any> => {
  return await apiRequest('/history/advanced-search', {
    method: 'POST',
    body: JSON.stringify({ searchText, limit }),
  });
};

// 繝ｬ繝昴・繝育函謌・
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

// JSON繝・・繧ｿ繧竪PT縺ｧ隕∫ｴ・
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
      throw new Error(response.error || '隕∫ｴ・・逕滓・縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
    }

    return response.summary;
  } catch (error) {
    console.error('GPT隕∫ｴ・お繝ｩ繝ｼ:', error);
    throw error;
  }
};