import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../services/db';
import { embedText } from '../services/embedding';
import { loadRagConfig } from '../services/config-manager';

const router = Router();

// クエリパラメータのスキーマ定義
const SearchQuerySchema = z.object({
  q: z.string().min(1).max(1000),
  limit: z.string().optional().transform(val => parseInt(val || '8')),
  threshold: z.string().optional().transform(val => parseFloat(val || '0.7'))
});

// 検索結果のスキーマ定義
const SearchResultSchema = z.object({
  id: z.number(),
  doc_id: z.string(),
  score: z.number(),
  content: z.string(),
  filename: z.string(),
  tags: z.array(z.string()).nullable(),
  page: z.number()
});

type SearchQuery = z.infer<typeof SearchQuerySchema>;
type SearchResult = z.infer<typeof SearchResultSchema>;

/**
 * ベクトル検索
 * GET /api/search?q=...
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // クエリパラメータの検証
    const validationResult = SearchQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: validationResult.error.errors
      });
    }
    
    const { q: query, limit, threshold } = validationResult.data;
    
    // 設定を読み込み
    const config = await loadRagConfig();
    
    // 検索クエリを埋め込みベクトルに変換
    let queryEmbedding: number[];
    try {
      const embeddingResult = await embedText(query);
      queryEmbedding = embeddingResult.embedding;
    } catch (error) {
      console.error('❌ クエリの埋め込みに失敗:', error);
      return res.status(500).json({
        error: 'Failed to process search query',
        message: 'クエリの処理に失敗しました'
      });
    }
    
    // ベクトルの次元数を検証
    if (queryEmbedding.length !== config.embedDim) {
      return res.status(500).json({
        error: 'Embedding dimension mismatch',
        expected: config.embedDim,
        actual: queryEmbedding.length
      });
    }
    
    // データベース接続
    const client = await pool.connect();
    
    try {
      // ベクトル類似度検索を実行
      const searchQuery = `
        SELECT 
          c.id,
          c.doc_id,
          c.content,
          c.tags,
          c.page,
          d.filename,
          1 - (kv.embedding <=> $1) as score
        FROM chunks c
        JOIN documents d ON c.doc_id = d.doc_id
        JOIN kb_vectors kv ON c.id = kv.chunk_id
        WHERE 1 - (kv.embedding <=> $1) >= $2
        ORDER BY kv.embedding <=> $1
        LIMIT $3
      `;
      
      const searchResult = await client.query(searchQuery, [
        queryEmbedding,
        threshold || config.similarityThreshold,
        limit || config.retrieveK
      ]);
      
      // 結果を整形
      const results: SearchResult[] = searchResult.rows.map(row => ({
        id: row.id,
        doc_id: row.doc_id,
        score: parseFloat(row.score),
        content: row.content,
        filename: row.filename,
        tags: row.tags || [],
        page: row.page
      }));
      
      // 類似度でソート（高い順）
      results.sort((a, b) => b.score - a.score);
      
      // 再ランク処理（上位の結果のみ）
      const topResults = results.slice(0, config.rerankTop);
      
      // 検索統計
      const stats = {
        query: query,
        totalResults: results.length,
        topResults: topResults.length,
        processingTime: Date.now() - Date.now(), // 実際の処理時間を計測する場合は適切に実装
        embeddingDimension: queryEmbedding.length,
        similarityThreshold: threshold || config.similarityThreshold
      };
      
      console.log(`🔍 検索完了: "${query}" → ${results.length}件 (上位${topResults.length}件)`);
      
      res.json({
        results: topResults,
        stats,
        message: `Found ${results.length} relevant chunks`
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 検索エラー:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      error: 'Search failed',
      message: errorMessage
    });
  }
});

/**
 * タグによる検索
 * GET /api/search/tags?tags=engine,maintenance
 */
router.get('/tags', async (req: Request, res: Response) => {
  try {
    const { tags } = req.query;
    
    if (!tags || typeof tags !== 'string') {
      return res.status(400).json({
        error: 'Tags parameter is required',
        message: 'タグパラメータが必要です'
      });
    }
    
    const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    
    if (tagArray.length === 0) {
      return res.status(400).json({
        error: 'No valid tags provided',
        message: '有効なタグが指定されていません'
      });
    }
    
    // データベース接続
    const client = await pool.connect();
    
    try {
      // タグによる検索クエリ
      const searchQuery = `
        SELECT 
          c.id,
          c.doc_id,
          c.content,
          c.tags,
          c.page,
          d.filename
        FROM chunks c
        JOIN documents d ON c.doc_id = d.doc_id
        WHERE c.tags && $1
        ORDER BY c.created_at DESC
        LIMIT 20
      `;
      
      const searchResult = await client.query(searchQuery, [tagArray]);
      
      const results = searchResult.rows.map(row => ({
        id: row.id,
        doc_id: row.doc_id,
        content: row.content,
        tags: row.tags || [],
        page: row.page,
        filename: row.filename
      }));
      
      res.json({
        results,
        tags: tagArray,
        count: results.length,
        message: `Found ${results.length} chunks with tags: ${tagArray.join(', ')}`
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ タグ検索エラー:', error);
    
    res.status(500).json({
      error: 'Tag search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 検索統計情報
 * GET /api/search/stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    
    try {
      // 統計情報を取得
      const totalDocs = await client.query('SELECT COUNT(*) as count FROM documents');
      const totalChunks = await client.query('SELECT COUNT(*) as count FROM chunks');
      const totalVectors = await client.query('SELECT COUNT(*) as count FROM kb_vectors');
      
      // タグの統計
      const tagStats = await client.query(`
        SELECT 
          unnest(tags) as tag,
          COUNT(*) as count
        FROM chunks
        WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
        GROUP BY tag
        ORDER BY count DESC
        LIMIT 10
      `);
      
      res.json({
        documents: parseInt(totalDocs.rows[0].count),
        chunks: parseInt(totalChunks.rows[0].count),
        vectors: parseInt(totalVectors.rows[0].count),
        topTags: tagStats.rows,
        timestamp: new Date().toISOString()
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 検索統計取得エラー:', error);
    
    res.status(500).json({
      error: 'Failed to get search statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 