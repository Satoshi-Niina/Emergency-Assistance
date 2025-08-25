
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

// 螻･豁ｴ縺ｮ菴懈・
export async function createHistoryItem(data: HistoryCreateData): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/history/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`螻･豁ｴ縺ｮ菴懈・縺ｫ螟ｱ謨励＠縺ｾ縺励◆: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('螻･豁ｴ菴懈・繧ｨ繝ｩ繝ｼ:', error);
    throw error;
  }
}

// 螻･豁ｴ縺ｮ讀懃ｴ｢
export async function searchHistoryItems(params: HistorySearchParams): Promise<any> {
  try {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const response = await fetch(`${API_BASE_URL}/api/history/list?${searchParams}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`螻･豁ｴ縺ｮ讀懃ｴ｢縺ｫ螟ｱ謨励＠縺ｾ縺励◆: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('螻･豁ｴ讀懃ｴ｢繧ｨ繝ｩ繝ｼ:', error);
    throw error;
  }
}

// 螻･豁ｴ隧ｳ邏ｰ縺ｮ蜿門ｾ・
export async function getHistoryItem(id: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/history/item/${id}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`螻･豁ｴ隧ｳ邏ｰ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('螻･豁ｴ隧ｳ邏ｰ蜿門ｾ励お繝ｩ繝ｼ:', error);
    throw error;
  }
}

// 邨ｱ險域ュ蝣ｱ縺ｮ蜿門ｾ・
export async function getHistoryStats(): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/history/stats`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`邨ｱ險域ュ蝣ｱ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('邨ｱ險域ュ蝣ｱ蜿門ｾ励お繝ｩ繝ｼ:', error);
    throw error;
  }
}

// 繝√Ε繝・ヨ騾∽ｿ｡譎ゅ・閾ｪ蜍募ｱ･豁ｴ菫晏ｭ・
export async function saveToHistory(data: HistoryCreateData): Promise<void> {
  try {
    // 讖溽ｨｮ繧・ｺ区･ｭ謇縺ｪ縺ｩ縺ｮ諠・ｱ繧定・蜍墓耳貂ｬ縺吶ｋ蜃ｦ逅・
    const enhancedData = {
      ...data,
      machineModel: extractMachineModel(data.description),
      office: extractOffice(data.description),
      category: extractCategory(data.description),
      keywords: extractKeywords(data.description)
    };

    await createHistoryItem(enhancedData);
    console.log('笨・螻･豁ｴ縺ｫ菫晏ｭ倥＠縺ｾ縺励◆:', enhancedData.title);
  } catch (error) {
    console.error('笶・螻･豁ｴ菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆:', error);
    // 螻･豁ｴ菫晏ｭ倥お繝ｩ繝ｼ縺ｯ荳ｻ讖溯・縺ｫ蠖ｱ髻ｿ縺励↑縺・ｈ縺・√お繝ｩ繝ｼ繧呈兜縺偵↑縺・
  }
}

// 繝・く繧ｹ繝医°繧画ｩ溽ｨｮ繧呈耳貂ｬ
function extractMachineModel(text: string): string | undefined {
  const machineModels = ['MT-100', 'MR-400', 'TC-250', 'SS-750'];
  
  for (const model of machineModels) {
    if (text.toLowerCase().includes(model.toLowerCase())) {
      return model;
    }
  }
  
  return undefined;
}

// 繝・く繧ｹ繝医°繧我ｺ区･ｭ謇繧呈耳貂ｬ
function extractOffice(text: string): string | undefined {
  const offices = ['譚ｱ莠ｬ莠区･ｭ謇', '螟ｧ髦ｪ莠区･ｭ謇', '蜷榊商螻倶ｺ区･ｭ謇', '遖丞ｲ｡莠区･ｭ謇'];
  
  for (const office of offices) {
    if (text.includes(office)) {
      return office;
    }
  }
  
  return undefined;
}

// 繝・く繧ｹ繝医°繧峨き繝・ざ繝ｪ繧呈耳貂ｬ
function extractCategory(text: string): string | undefined {
  const categories = [
    { name: '繧ｨ繝ｳ繧ｸ繝ｳ', keywords: ['繧ｨ繝ｳ繧ｸ繝ｳ', '蟋句虚', '蛛懈ｭ｢', '辯・侭'] },
    { name: '繝悶Ξ繝ｼ繧ｭ', keywords: ['繝悶Ξ繝ｼ繧ｭ', '蛻ｶ蜍・, '蛛懆ｻ・] },
    { name: '髮ｻ豌礼ｳｻ邨ｱ', keywords: ['髮ｻ豌・, '髮ｻ貅・, '繝舌ャ繝・Μ繝ｼ', '繝ｩ繧､繝・] },
    { name: '豐ｹ蝨ｧ邉ｻ邨ｱ', keywords: ['豐ｹ蝨ｧ', '繧ｪ繧､繝ｫ', '蝨ｧ蜉・] }
  ];
  
  for (const category of categories) {
    if (category.keywords.some(keyword => text.includes(keyword))) {
      return category.name;
    }
  }
  
  return undefined;
}

// 繝・く繧ｹ繝医°繧峨く繝ｼ繝ｯ繝ｼ繝峨ｒ謚ｽ蜃ｺ
function extractKeywords(text: string): string[] {
  const keywords: string[] = [];
  
  // 荳闊ｬ逧・↑繧ｭ繝ｼ繝ｯ繝ｼ繝峨ヱ繧ｿ繝ｼ繝ｳ
  const patterns = [
    /繧ｨ繝ｳ繧ｸ繝ｳ[蛛懈ｭ｢襍ｷ蜍募ｧ句虚]/g,
    /繝悶Ξ繝ｼ繧ｭ[荳崎憶謨・囿]/g,
    /MT-\d+|MR-\d+|TC-\d+|SS-\d+/g,
    /[譚ｱ莠ｬ螟ｧ髦ｪ蜷榊商螻狗ｦ丞ｲ｡]莠区･ｭ謇/g
  ];
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      keywords.push(...matches);
    }
  });
  
  return [...new Set(keywords)]; // 驥崎､・勁蜴ｻ
}



