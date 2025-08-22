import Fuse from 'fuse.js';
import { apiRequest } from './queryClient';

// 讀懃ｴ｢邨先棡縺ｮ蝙句ｮ夂ｾｩ
export interface SearchResult {
  id: string;
  title: string;
  description: string;
  content: string;
  score?: number;
  highlights?: {
    key: string;
    indices: number[][];
    value: string;
  }[];
}

// 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ讀懃ｴ｢逕ｨ縺ｮ險ｭ螳・
const fuseOptions = {
  includeScore: true,
  keys: [
    { name: 'id', weight: 0.5 },
    { name: 'description', weight: 1.0 },
    { name: 'trigger', weight: 0.8 }
  ],
  threshold: 0.4,
  ignoreLocation: true,
  useExtendedSearch: true,
  minMatchCharLength: 1,
  distance: 1000,
  findAllMatches: true,
  isCaseSensitive: false,
  shouldSort: true,
  tokenize: true,
  matchAllTokens: false,
};

// 譌･譛ｬ隱槭ち繧､繝医Ν縺ｫ繝槭ャ繝斐Φ繧ｰ縺吶ｋ縺溘ａ縺ｮ繝・ぅ繧ｯ繧ｷ繝ｧ繝翫Μ
export const japaneseGuideTitles: { [key: string]: string } = {
  'no_electrical_power': '髮ｻ貅舌′蜈･繧峨↑縺・,
  'engine_wont_start': '繧ｨ繝ｳ繧ｸ繝ｳ縺悟ｧ句虚縺励↑縺・,
  'overheating': '繧ｪ繝ｼ繝舌・繝偵・繝・,
  'oil_pressure_warning': '繧ｪ繧､繝ｫ蝨ｧ蜉幄ｭｦ蜻・,
  'brake_failure': '繝悶Ξ繝ｼ繧ｭ謨・囿',
  'transmission_failure': '螟蛾滓ｩ滓腐髫・,
  'hydraulic_system_failure': '豐ｹ蝨ｧ繧ｷ繧ｹ繝・Β謨・囿',
  'fuel_system_problem': '辯・侭繧ｷ繧ｹ繝・Β蝠城｡・,
  'electrical_short': '髮ｻ豌怜屓霍ｯ繧ｷ繝ｧ繝ｼ繝・,
  'battery_dead': '繝舌ャ繝・Μ繝ｼ荳翫′繧・,
  // 縺薙％縺ｫ蠢・ｦ√↓蠢懊§縺ｦ霑ｽ蜉
};

/**
 * 謖・ｮ壹＆繧後◆ID縺ｮ繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝輔Ο繝ｼ繧貞叙蠕・
 * @param id 繝輔Ο繝ｼID
 * @returns 繝輔Ο繝ｼ諠・ｱ縺ｾ縺溘・undefined
 */
export const getTroubleshootingFlowById = async (id: string): Promise<SearchResult | undefined> => {
  try {
    // 繧ｭ繝｣繝・す繝･辟｡蜉ｹ蛹悶・縺溘ａ縺ｮ繧ｿ繧､繝繧ｹ繧ｿ繝ｳ繝励ｒ霑ｽ蜉
    const timestamp = Date.now();
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/${id}?_t=${timestamp}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

    if (response.ok) {
      const flow = await response.json();
      console.log(`剥 蜿門ｾ励＠縺溘ヵ繝ｭ繝ｼ繝・・繧ｿ:`, {
        id: flow.id,
        title: flow.title,
        stepsCount: flow.steps?.length || 0,
        source: 'troubleshooting-api'
      });

      return {
        id: flow.id,
        title: flow.title || japaneseGuideTitles[flow.id] || flow.id,
        description: flow.description || '',
        content: flow.content || JSON.stringify(flow.steps || [])
      };
    }

    console.warn(`笞・・繝輔Ο繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ: ${id}`);
    return undefined;
  } catch (error) {
    console.error('笶・繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝輔Ο繝ｼ讀懃ｴ｢繧ｨ繝ｩ繝ｼ:', error);
    return undefined;
  }
};

/**
 * 迚ｹ螳壹・繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝輔Ο繝ｼ繧呈､懃ｴ｢
 * @param id 繝輔Ο繝ｼID
 * @returns 讀懃ｴ｢邨先棡縺ｾ縺溘・譛ｪ螳夂ｾｩ
 */
export const searchTroubleshootingFlow = async (id: string): Promise<SearchResult | undefined> => {
  try {
    const response = await apiRequest('GET', `/api/troubleshooting/${id}`);
    if (response.ok) {
      const flow = await response.json();
      return {
        id: flow.id,
        title: japaneseGuideTitles[flow.id] || flow.id,
        description: flow.description,
        content: flow.content || ''
      };
    }
    return undefined;
  } catch (error) {
    console.error('繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝輔Ο繝ｼ讀懃ｴ｢繧ｨ繝ｩ繝ｼ:', error);
    return undefined;
  }
};

/**
 * 繝・く繧ｹ繝医↓蝓ｺ縺･縺・※繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝輔Ο繝ｼ繧呈､懃ｴ｢
 * @param query 讀懃ｴ｢繧ｯ繧ｨ繝ｪ
 * @returns 讀懃ｴ｢邨先棡縺ｮ驟榊・
 */
export const searchTroubleshootingFlows = async (query: string): Promise<SearchResult[]> => {
  if (!query || query.trim() === '') {
    // 繧ｯ繧ｨ繝ｪ縺檎ｩｺ縺ｮ蝣ｴ蜷医√☆縺ｹ縺ｦ縺ｮ繝輔Ο繝ｼ繧定ｿ斐☆
    try {
      const response = await apiRequest('GET', '/api/troubleshooting');
      if (response.ok) {
        const flows = await response.json();
        return flows.map((flow: any) => ({
          id: flow.id,
          title: japaneseGuideTitles[flow.id] || flow.id,
          description: flow.description,
          content: flow.content || ''
        }));
      }
      return [];
    } catch (error) {
      console.error('繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝輔Ο繝ｼ蜿門ｾ励お繝ｩ繝ｼ:', error);
      return [];
    }
  }

  try {
    // 繧ｯ繝ｩ繧､繧｢繝ｳ繝医し繧､繝峨〒讀懃ｴ｢繧定｡後≧蝣ｴ蜷・
    const response = await apiRequest('GET', '/api/troubleshooting');
    if (response.ok) {
      const flows = await response.json();

      // Fuse.js繧剃ｽｿ逕ｨ縺励※繧ｯ繝ｩ繧､繧｢繝ｳ繝医し繧､繝画､懃ｴ｢
      const fuse = new Fuse(flows, fuseOptions);
      const results = fuse.search(query);

      return results.map(result => {
        const item = result.item as any;
        return {
          id: item.id,
          title: japaneseGuideTitles[item.id] || item.id,
          description: item.description,
          content: item.content || '',
          score: result.score
        };
      });
    }

    // 繧ｵ繝ｼ繝舌・繧ｵ繧､繝峨〒讀懃ｴ｢繧定｡後≧蝣ｴ蜷・
    /*
    const searchResponse = await apiRequest('POST', '/api/troubleshooting/search', {
      query
    });

    if (searchResponse.ok) {
      const results = await searchResponse.json();
      return results.map((result: any) => ({
        id: result.id,
        title: japaneseGuideTitles[result.id] || result.id,
        description: result.description,
        content: result.content || '',
        score: result.score
      }));
    }
    */

    return [];
  } catch (error) {
    console.error('繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ讀懃ｴ｢繧ｨ繝ｩ繝ｼ:', error);
    return [];
  }
};
