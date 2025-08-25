/**
 * RAG繧ｷ繧ｹ繝・Β逕ｨ繧ｯ繝ｩ繧､繧｢繝ｳ繝・DK
 * 譌｢蟄篭I繧貞､画峩縺帙★縺ｫRAG API繧貞他縺ｳ蜃ｺ縺帙ｋ
 */

export interface RagConfig {
  embedDim: number;
  chunkSize: number;
  chunkOverlap: number;
  retrieveK: number;
  rerankTop: number;
  rerankMin: number;
  maxTextLength: number;
  batchSize: number;
  similarityThreshold: number;
}

export interface IngestRequest {
  filename: string;
  text: string;
  tags?: string[];
}

export interface IngestResponse {
  doc_id: string;
  chunks: number;
  message: string;
  stats: {
    totalChunks: number;
    totalTokens: number;
    processingTime: number;
  };
}

export interface SearchResult {
  id: number;
  doc_id: string;
  score: number;
  content: string;
  filename: string;
  tags: string[];
  page: number;
}

export interface SearchResponse {
  results: SearchResult[];
  stats: {
    query: string;
    totalResults: number;
    topResults: number;
    processingTime: number;
    embeddingDimension: number;
    similarityThreshold: number;
  };
  message: string;
}

export class RagClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * 迴ｾ蝨ｨ縺ｮRAG險ｭ螳壹ｒ蜿門ｾ・
   */
  async getRagConfig(): Promise<RagConfig> {
    try {
      const response = await fetch(`${this.baseUrl}/config/rag`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.config;
    } catch (error) {
      console.error('RAG險ｭ螳壹・蜿門ｾ励↓螟ｱ謨・', error);
      throw error;
    }
  }

  /**
   * RAG險ｭ螳壹ｒ譖ｴ譁ｰ
   */
  async updateRagConfig(partialConfig: Partial<RagConfig>): Promise<RagConfig> {
    try {
      const response = await fetch(`${this.baseUrl}/config/rag`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(partialConfig),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.config;
    } catch (error) {
      console.error('RAG險ｭ螳壹・譖ｴ譁ｰ縺ｫ螟ｱ謨・', error);
      throw error;
    }
  }

  /**
   * 繝峨く繝･繝｡繝ｳ繝医ｒ蜿冶ｾｼ
   */
  async ingest(request: IngestRequest): Promise<IngestResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('繝峨く繝･繝｡繝ｳ繝亥叙霎ｼ縺ｫ螟ｱ謨・', error);
      throw error;
    }
  }

  /**
   * 繝吶け繝医Ν讀懃ｴ｢繧貞ｮ溯｡・
   */
  async search(query: string, options?: { limit?: number; threshold?: number }): Promise<SearchResponse> {
    try {
      const params = new URLSearchParams({ q: query });
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.threshold) params.append('threshold', options.threshold.toString());

      const response = await fetch(`${this.baseUrl}/search?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('讀懃ｴ｢縺ｫ螟ｱ謨・', error);
      throw error;
    }
  }

  /**
   * 繧ｿ繧ｰ縺ｫ繧医ｋ讀懃ｴ｢
   */
  async searchByTags(tags: string[]): Promise<{ results: SearchResult[]; tags: string[]; count: number; message: string }> {
    try {
      const params = new URLSearchParams({ tags: tags.join(',') });
      const response = await fetch(`${this.baseUrl}/search/tags?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('繧ｿ繧ｰ讀懃ｴ｢縺ｫ螟ｱ謨・', error);
      throw error;
    }
  }

  /**
   * 蜿冶ｾｼ迥ｶ豕√ｒ遒ｺ隱・
   */
  async getIngestStatus(): Promise<{ documents: number; chunks: number; vectors: number; timestamp: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/ingest/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('蜿冶ｾｼ迥ｶ豕√・蜿門ｾ励↓螟ｱ謨・', error);
      throw error;
    }
  }

  /**
   * 讀懃ｴ｢邨ｱ險医ｒ蜿門ｾ・
   */
  async getSearchStats(): Promise<{ documents: number; chunks: number; vectors: number; topTags: any[]; timestamp: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/search/stats`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('讀懃ｴ｢邨ｱ險医・蜿門ｾ励↓螟ｱ謨・', error);
      throw error;
    }
  }

  /**
   * 險ｭ螳壹・讀懆ｨｼ
   */
  async validateConfig(config: Partial<RagConfig>): Promise<{ valid: boolean; message: string; config?: RagConfig }> {
    try {
      const response = await fetch(`${this.baseUrl}/config/rag/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('險ｭ螳壽､懆ｨｼ縺ｫ螟ｱ謨・', error);
      throw error;
    }
  }

  /**
   * 險ｭ螳壹・蟾ｮ蛻・｢ｺ隱・
   */
  async getConfigDiff(config: Partial<RagConfig>): Promise<{ changes: string[]; hasChanges: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/config/rag/diff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('險ｭ螳壼ｷｮ蛻・｢ｺ隱阪↓螟ｱ謨・', error);
      throw error;
    }
  }

  /**
   * 險ｭ螳壹ｒ繝ｪ繧ｻ繝・ヨ
   */
  async resetConfig(): Promise<{ message: string; config: RagConfig; changes: string[]; timestamp: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/config/rag/reset`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('險ｭ螳壹Μ繧ｻ繝・ヨ縺ｫ螟ｱ謨・', error);
      throw error;
    }
  }

  /**
   * 險ｭ螳壹ｒ繧ｨ繧ｯ繧ｹ繝昴・繝・
   */
  async exportConfig(): Promise<RagConfig> {
    try {
      const response = await fetch(`${this.baseUrl}/config/rag/export`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('險ｭ螳壹お繧ｯ繧ｹ繝昴・繝医↓螟ｱ謨・', error);
      throw error;
    }
  }
}

// 繝・ヵ繧ｩ繝ｫ繝医う繝ｳ繧ｹ繧ｿ繝ｳ繧ｹ繧偵お繧ｯ繧ｹ繝昴・繝・
export const ragClient = new RagClient();

// 蛟句挨髢｢謨ｰ縺ｨ縺励※繧ゅお繧ｯ繧ｹ繝昴・繝茨ｼ域里蟄倥さ繝ｼ繝峨→縺ｮ莠呈鋤諤ｧ縺ｮ縺溘ａ・・
export const getRagConfig = () => ragClient.getRagConfig();
export const updateRagConfig = (config: Partial<RagConfig>) => ragClient.updateRagConfig(config);
export const ingest = (request: IngestRequest) => ragClient.ingest(request);
export const search = (query: string, options?: { limit?: number; threshold?: number }) => ragClient.search(query, options);


