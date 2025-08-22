import Fuse from 'fuse.js';
import { apiRequest } from './queryClient';

// 検索結果の型定義
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

// トラブルシューチE��ング検索用の設宁E
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

// 日本語タイトルにマッピングするためのチE��クショナリ
export const japaneseGuideTitles: { [key: string]: string } = {
  'no_electrical_power': '電源が入らなぁE,
  'engine_wont_start': 'エンジンが始動しなぁE,
  'overheating': 'オーバ�Eヒ�EチE,
  'oil_pressure_warning': 'オイル圧力警呁E,
  'brake_failure': 'ブレーキ敁E��',
  'transmission_failure': '変速機故隁E,
  'hydraulic_system_failure': '油圧シスチE��敁E��',
  'fuel_system_problem': '燁E��シスチE��問顁E,
  'electrical_short': '電気回路ショーチE,
  'battery_dead': 'バッチE��ー上がめE,
  // ここに忁E��に応じて追加
};

/**
 * 持E��されたIDのトラブルシューチE��ングフローを取征E
 * @param id フローID
 * @returns フロー惁E��また�Eundefined
 */
export const getTroubleshootingFlowById = async (id: string): Promise<SearchResult | undefined> => {
  try {
    // キャチE��ュ無効化�Eためのタイムスタンプを追加
    const timestamp = Date.now();
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/${id}?_t=${timestamp}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

    if (response.ok) {
      const flow = await response.json();
      console.log(`🔍 取得したフローチE�Eタ:`, {
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

    console.warn(`⚠�E�Eフローが見つかりません: ${id}`);
    return undefined;
  } catch (error) {
    console.error('❁EトラブルシューチE��ングフロー検索エラー:', error);
    return undefined;
  }
};

/**
 * 特定�EトラブルシューチE��ングフローを検索
 * @param id フローID
 * @returns 検索結果また�E未定義
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
    console.error('トラブルシューチE��ングフロー検索エラー:', error);
    return undefined;
  }
};

/**
 * チE��ストに基づぁE��トラブルシューチE��ングフローを検索
 * @param query 検索クエリ
 * @returns 検索結果の配�E
 */
export const searchTroubleshootingFlows = async (query: string): Promise<SearchResult[]> => {
  if (!query || query.trim() === '') {
    // クエリが空の場合、すべてのフローを返す
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
      console.error('トラブルシューチE��ングフロー取得エラー:', error);
      return [];
    }
  }

  try {
    // クライアントサイドで検索を行う場吁E
    const response = await apiRequest('GET', '/api/troubleshooting');
    if (response.ok) {
      const flows = await response.json();

      // Fuse.jsを使用してクライアントサイド検索
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

    // サーバ�Eサイドで検索を行う場吁E
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
    console.error('トラブルシューチE��ング検索エラー:', error);
    return [];
  }
};
