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
      console.log('剥 繝上う繝悶Μ繝・ラ讀懃ｴ｢髢句ｧ・', query);
      
      // 1. 繧ｭ繝ｼ繝ｯ繝ｼ繝峨・繝ｼ繧ｹ讀懃ｴ｢・・use.js・・
      const keywordResults = await this.searchService.searchDocuments(query, 5);
      console.log('投 繧ｭ繝ｼ繝ｯ繝ｼ繝画､懃ｴ｢邨先棡:', keywordResults.length);
      
      // 2. 繧ｻ繝槭Φ繝・ぅ繝・け讀懃ｴ｢・・penAI Embeddings・・
      const semanticResults = await this.searchService.semanticSearch(query, 5);
      console.log('投 繧ｻ繝槭Φ繝・ぅ繝・け讀懃ｴ｢邨先棡:', semanticResults.length);
      
      // 3. 繝翫Ξ繝・ず繝吶・繧ｹ讀懃ｴ｢・域里蟄伜ｮ溯｣・ｼ・
      const knowledgeResults = await searchKnowledgeBase(query);
      console.log('投 繝翫Ξ繝・ず繝吶・繧ｹ讀懃ｴ｢邨先棡:', knowledgeResults.length);
      
      // 4. 邨先棡縺ｮ邨ｱ蜷医→驥阪∩莉倥￠
      const combinedResults = this.combineResults(
        keywordResults,
        semanticResults, 
        knowledgeResults
      );
      
      // 5. 譛邨ら噪縺ｪ繝ｩ繝ｳ繧ｭ繝ｳ繧ｰ
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
      
      console.log('笨・繝上う繝悶Μ繝・ラ讀懃ｴ｢螳御ｺ・', result);
      return result;
      
    } catch (error) {
      console.error('笶・繝上う繝悶Μ繝・ラ讀懃ｴ｢繧ｨ繝ｩ繝ｼ:', error);
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
    
    // 繧ｭ繝ｼ繝ｯ繝ｼ繝画､懃ｴ｢邨先棡繧定ｿｽ蜉
    keywordResults.forEach((result, index) => {
      const key = result.id || `keyword_${index}`;
      combined.set(key, {
        ...result,
        searchType: 'keyword',
        score: result.score || 0,
        finalScore: (result.score || 0) * 1.0
      });
    });
    
    // 繧ｻ繝槭Φ繝・ぅ繝・け讀懃ｴ｢邨先棡繧定ｿｽ蜉
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
    
    // 繝翫Ξ繝・ず繝吶・繧ｹ讀懃ｴ｢邨先棡繧定ｿｽ蜉
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
    
    // 讀懃ｴ｢繧ｿ繧､繝励↓繧医ｋ驥阪∩莉倥￠
    switch (result.searchType) {
      case 'hybrid':
        score *= 1.5; // 繝上う繝悶Μ繝・ラ邨先棡縺ｯ鬮倩ｩ穂ｾ｡
        break;
      case 'semantic':
        score *= 1.2; // 繧ｻ繝槭Φ繝・ぅ繝・け讀懃ｴ｢縺ｯ荳ｭ隧穂ｾ｡
        break;
      case 'keyword':
        score *= 1.0; // 繧ｭ繝ｼ繝ｯ繝ｼ繝画､懃ｴ｢縺ｯ蝓ｺ譛ｬ隧穂ｾ｡
        break;
    }
    
    // 驥崎ｦ∝ｺｦ繝懊・繝翫せ
    if (result.metadata?.isImportant) {
      score *= 1.3;
    }
    
    // 蟆る摩逕ｨ隱槭・繝・メ繝ｳ繧ｰ繝懊・繝翫せ
    const technicalTerms = [
      '繧ｨ繝ｳ繧ｸ繝ｳ', '菫晏ｮ・, '謨ｴ蛯・, '謨・囿', '菫ｮ逅・, '轤ｹ讀・, '螳牙・', '菴懈･ｭ',
      '霆贋ｸ｡', '讖滓｢ｰ', '陬・ｽｮ', '繧ｷ繧ｹ繝・Β', '驕玖ｻ｢', '謫堺ｽ・, '遒ｺ隱・, '蟇ｾ蠢・,
      '繝医Λ繝悶Ν', '蝠城｡・, '逡ｰ蟶ｸ', '隴ｦ蜻・, '蛛懈ｭ｢', '蟋句虚', '驕玖ｻ｢', '襍ｰ陦・
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
      console.error('笶・繝吶け繝医Ν蛹悶お繝ｩ繝ｼ:', error);
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
