import OpenAI from 'openai';
import { searchKnowledgeBase } from './knowledge-base.js';
import { SearchService } from '../services/search.js';

export interface HybridSearchResult {
  query: string;
  results: any[];
  searchTypes: {
    keyword: number;
    semantic: number;
    knowledge: number;
  };
  timestamp: Date;
}

export interface VectorizedChunk {
  id: string;
  text: string;
  embedding: number[];
  metadata: any;
  vectorizedAt: Date;
}

export class HybridSearchService {
  private openai: OpenAI;
  private searchService: SearchService;
  
  constructor() {
    this.openai = new OpenAI();
    this.searchService = new SearchService();
  }
  
  async hybridSearch(query: string): Promise<HybridSearchResult> {
    try {
      console.log('🔍 ハイブリッド検索開始:', query);
      
      // 1. キーワードベース検索（Fuse.js）
      const keywordResults = await this.searchService.searchDocuments(query, 5);
      console.log('📊 キーワード検索結果:', keywordResults.length);
      
      // 2. セマンティック検索（OpenAI Embeddings）
      const semanticResults = await this.searchService.semanticSearch(query, 5);
      console.log('📊 セマンティック検索結果:', semanticResults.length);
      
      // 3. ナレッジベース検索（既存実装）
      const knowledgeResults = await searchKnowledgeBase(query);
      console.log('📊 ナレッジベース検索結果:', knowledgeResults.length);
      
      // 4. 結果の統合と重み付け
      const combinedResults = this.combineResults(
        keywordResults,
        semanticResults, 
        knowledgeResults
      );
      
      // 5. 最終的なランキング
      const rankedResults = this.rankResults(combinedResults, query);
      
      const result: HybridSearchResult = {
        query,
        results: rankedResults,
        searchTypes: {
          keyword: keywordResults.length,
          semantic: semanticResults.length,
          knowledge: knowledgeResults.length
        },
        timestamp: new Date()
      };
      
      console.log('✅ ハイブリッド検索完了:', result);
      return result;
      
    } catch (error) {
      console.error('❌ ハイブリッド検索エラー:', error);
      return {
        query,
        results: [],
        searchTypes: { keyword: 0, semantic: 0, knowledge: 0 },
        timestamp: new Date()
      };
    }
  }
  
  private combineResults(keywordResults: any[], semanticResults: any[], knowledgeResults: any[]): any[] {
    const combined = new Map();
    
    // キーワード検索結果を追加
    keywordResults.forEach((result, index) => {
      const key = result.id || `keyword_${index}`;
      combined.set(key, {
        ...result,
        searchType: 'keyword',
        score: result.score || 0,
        finalScore: (result.score || 0) * 1.0
      });
    });
    
    // セマンティック検索結果を追加
    semanticResults.forEach((result, index) => {
      const key = result.id || `semantic_${index}`;
      if (combined.has(key)) {
        const existing = combined.get(key);
        existing.searchType = 'hybrid';
        existing.semanticScore = result.similarity;
        existing.finalScore = (existing.score + result.similarity) / 2;
      } else {
        combined.set(key, {
          ...result,
          searchType: 'semantic',
          score: result.similarity,
          finalScore: result.similarity * 1.2
        });
      }
    });
    
    // ナレッジベース検索結果を追加
    knowledgeResults.forEach((result, index) => {
      const key = result.metadata?.documentId || `knowledge_${index}`;
      if (combined.has(key)) {
        const existing = combined.get(key);
        existing.searchType = 'hybrid';
        existing.knowledgeScore = result.similarity;
        existing.finalScore = (existing.finalScore + result.similarity) / 2;
      } else {
        combined.set(key, {
          ...result,
          searchType: 'knowledge',
          score: result.similarity,
          finalScore: result.similarity * 1.1
        });
      }
    });
    
    return Array.from(combined.values());
  }
  
  private rankResults(results: any[], query: string): any[] {
    return results
      .map(result => ({
        ...result,
        finalScore: this.calculateFinalScore(result, query)
      }))
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, 10);
  }
  
  private calculateFinalScore(result: any, query: string): number {
    let score = result.finalScore || result.score || 0;
    
    // 検索タイプによる重み付け
    switch (result.searchType) {
      case 'hybrid':
        score *= 1.5; // ハイブリッド結果は高評価
        break;
      case 'semantic':
        score *= 1.2; // セマンティック検索は中評価
        break;
      case 'keyword':
        score *= 1.0; // キーワード検索は基本評価
        break;
    }
    
    // 重要度ボーナス
    if (result.metadata?.isImportant) {
      score *= 1.3;
    }
    
    // 専門用語マッチングボーナス
    const technicalTerms = [
      'エンジン', '保守', '整備', '故障', '修理', '点検', '安全', '作業',
      '車両', '機械', '装置', 'システム', '運転', '操作', '確認', '対応',
      'トラブル', '問題', '異常', '警告', '停止', '始動', '運転', '走行'
    ];
    
    const queryWords = query.toLowerCase().split(/\s+/);
    const matchedTerms = queryWords.filter(word => 
      technicalTerms.some(term => term.includes(word) || word.includes(term))
    );
    score += matchedTerms.length * 0.1;
    
    return Math.min(1.0, score);
  }
  
  async createEmbeddings(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('❌ ベクトル化エラー:', error);
      return [];
    }
  }
  
  async processChunks(chunks: any[]): Promise<VectorizedChunk[]> {
    const vectorizedChunks = [];
    for (const chunk of chunks) {
      const embedding = await this.createEmbeddings(chunk.text);
      if (embedding.length > 0) {
        vectorizedChunks.push({
          ...chunk,
          embedding,
          vectorizedAt: new Date()
        });
      }
    }
    return vectorizedChunks;
  }
}
