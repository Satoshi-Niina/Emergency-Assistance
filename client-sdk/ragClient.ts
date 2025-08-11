/**
 * RAGシステム用クライアントSDK
 * 既存UIを変更せずにRAG APIを呼び出せる
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
   * 現在のRAG設定を取得
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
      console.error('RAG設定の取得に失敗:', error);
      throw error;
    }
  }

  /**
   * RAG設定を更新
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
      console.error('RAG設定の更新に失敗:', error);
      throw error;
    }
  }

  /**
   * ドキュメントを取込
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
      console.error('ドキュメント取込に失敗:', error);
      throw error;
    }
  }

  /**
   * ベクトル検索を実行
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
      console.error('検索に失敗:', error);
      throw error;
    }
  }

  /**
   * タグによる検索
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
      console.error('タグ検索に失敗:', error);
      throw error;
    }
  }

  /**
   * 取込状況を確認
   */
  async getIngestStatus(): Promise<{ documents: number; chunks: number; vectors: number; timestamp: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/ingest/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('取込状況の取得に失敗:', error);
      throw error;
    }
  }

  /**
   * 検索統計を取得
   */
  async getSearchStats(): Promise<{ documents: number; chunks: number; vectors: number; topTags: any[]; timestamp: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/search/stats`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('検索統計の取得に失敗:', error);
      throw error;
    }
  }

  /**
   * 設定の検証
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
      console.error('設定検証に失敗:', error);
      throw error;
    }
  }

  /**
   * 設定の差分確認
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
      console.error('設定差分確認に失敗:', error);
      throw error;
    }
  }

  /**
   * 設定をリセット
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
      console.error('設定リセットに失敗:', error);
      throw error;
    }
  }

  /**
   * 設定をエクスポート
   */
  async exportConfig(): Promise<RagConfig> {
    try {
      const response = await fetch(`${this.baseUrl}/config/rag/export`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('設定エクスポートに失敗:', error);
      throw error;
    }
  }
}

// デフォルトインスタンスをエクスポート
export const ragClient = new RagClient();

// 個別関数としてもエクスポート（既存コードとの互換性のため）
export const getRagConfig = () => ragClient.getRagConfig();
export const updateRagConfig = (config: Partial<RagConfig>) => ragClient.updateRagConfig(config);
export const ingest = (request: IngestRequest) => ragClient.ingest(request);
export const search = (query: string, options?: { limit?: number; threshold?: number }) => ragClient.search(query, options);
