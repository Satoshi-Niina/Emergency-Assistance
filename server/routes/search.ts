import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../services/db.js';
import { embedText } from '../services/embedding.js';
import { loadRagConfig } from '../services/config-manager.js';

const router = Router();

// 繧ｯ繧ｨ繝ｪ繝代Λ繝｡繝ｼ繧ｿ縺ｮ繧ｹ繧ｭ繝ｼ繝槫ｮ夂ｾｩ
const SearchQuerySchema = z.object({
  q: z.string().min(1).max(1000),
  limit: z.string().optional().transform(val => parseInt(val || '8')),
  threshold: z.string().optional().transform(val => parseFloat(val || '0.7'))
});

// 讀懃ｴ｢邨先棡縺ｮ繧ｹ繧ｭ繝ｼ繝槫ｮ夂ｾｩ
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
 * 繝吶け繝医Ν讀懃ｴ｢
 * GET /api/search?q=...
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // 繧ｯ繧ｨ繝ｪ繝代Λ繝｡繝ｼ繧ｿ縺ｮ讀懆ｨｼ
    const validationResult = SearchQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: validationResult.error.errors
      });
    }
    
    const { q: query, limit, threshold } = validationResult.data;
    
    // 險ｭ螳壹ｒ隱ｭ縺ｿ霎ｼ縺ｿ
    const config = await loadRagConfig();
    
    // 讀懃ｴ｢繧ｯ繧ｨ繝ｪ繧貞沂繧∬ｾｼ縺ｿ繝吶け繝医Ν縺ｫ螟画鋤
    let queryEmbedding: number[];
    try {
      const embeddingResult = await embedText(query);
      queryEmbedding = embeddingResult.embedding;
    } catch (error) {
      console.error('笶・繧ｯ繧ｨ繝ｪ縺ｮ蝓九ａ霎ｼ縺ｿ縺ｫ螟ｱ謨・', error);
      return res.status(500).json({
        error: 'Failed to process search query',
        message: '繧ｯ繧ｨ繝ｪ縺ｮ蜃ｦ逅・↓螟ｱ謨励＠縺ｾ縺励◆'
      });
    }
    
    // 繝吶け繝医Ν縺ｮ谺｡蜈・焚繧呈､懆ｨｼ
    if (queryEmbedding.length !== config.embedDim) {
      return res.status(500).json({
        error: 'Embedding dimension mismatch',
        expected: config.embedDim,
        actual: queryEmbedding.length
      });
    }
    
    // 繝・・繧ｿ繝吶・繧ｹ謗･邯・
    const client = await pool.connect();
    
    try {
      // 繝吶け繝医Ν鬘樔ｼｼ蠎ｦ讀懃ｴ｢繧貞ｮ溯｡・
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
      
      // 邨先棡繧呈紛蠖｢
      const results: SearchResult[] = searchResult.rows.map(row => ({
        id: row.id,
        doc_id: row.doc_id,
        score: parseFloat(row.score),
        content: row.content,
        filename: row.filename,
        tags: row.tags || [],
        page: row.page
      }));
      
      // 鬘樔ｼｼ蠎ｦ縺ｧ繧ｽ繝ｼ繝茨ｼ磯ｫ倥＞鬆・ｼ・
      results.sort((a, b) => b.score - a.score);
      
      // 蜀阪Λ繝ｳ繧ｯ蜃ｦ逅・ｼ井ｸ贋ｽ阪・邨先棡縺ｮ縺ｿ・・
      const topResults = results.slice(0, config.rerankTop);
      
      // 讀懃ｴ｢邨ｱ險・
      const stats = {
        query: query,
        totalResults: results.length,
        topResults: topResults.length,
        processingTime: Date.now() - Date.now(), // 螳滄圀縺ｮ蜃ｦ逅・凾髢薙ｒ險域ｸｬ縺吶ｋ蝣ｴ蜷医・驕ｩ蛻・↓螳溯｣・
        embeddingDimension: queryEmbedding.length,
        similarityThreshold: threshold || config.similarityThreshold
      };
      
      console.log(`剥 讀懃ｴ｢螳御ｺ・ "${query}" 竊・${results.length}莉ｶ (荳贋ｽ・{topResults.length}莉ｶ)`);
      
      res.json({
        results: topResults,
        stats,
        message: `Found ${results.length} relevant chunks`
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('笶・讀懃ｴ｢繧ｨ繝ｩ繝ｼ:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      error: 'Search failed',
      message: errorMessage
    });
  }
});

/**
 * 繧ｿ繧ｰ縺ｫ繧医ｋ讀懃ｴ｢
 * GET /api/search/tags?tags=engine,maintenance
 */
router.get('/tags', async (req: Request, res: Response) => {
  try {
    const { tags } = req.query;
    
    if (!tags || typeof tags !== 'string') {
      return res.status(400).json({
        error: 'Tags parameter is required',
        message: '繧ｿ繧ｰ繝代Λ繝｡繝ｼ繧ｿ縺悟ｿ・ｦ√〒縺・
      });
    }
    
    const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    
    if (tagArray.length === 0) {
      return res.status(400).json({
        error: 'No valid tags provided',
        message: '譛牙柑縺ｪ繧ｿ繧ｰ縺梧欠螳壹＆繧後※縺・∪縺帙ｓ'
      });
    }
    
    // 繝・・繧ｿ繝吶・繧ｹ謗･邯・
    const client = await pool.connect();
    
    try {
      // 繧ｿ繧ｰ縺ｫ繧医ｋ讀懃ｴ｢繧ｯ繧ｨ繝ｪ
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
    console.error('笶・繧ｿ繧ｰ讀懃ｴ｢繧ｨ繝ｩ繝ｼ:', error);
    
    res.status(500).json({
      error: 'Tag search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 讀懃ｴ｢邨ｱ險域ュ蝣ｱ
 * GET /api/search/stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    
    try {
      // 邨ｱ險域ュ蝣ｱ繧貞叙蠕・
      const totalDocs = await client.query('SELECT COUNT(*) as count FROM documents');
      const totalChunks = await client.query('SELECT COUNT(*) as count FROM chunks');
      const totalVectors = await client.query('SELECT COUNT(*) as count FROM kb_vectors');
      
      // 繧ｿ繧ｰ縺ｮ邨ｱ險・
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
    console.error('笶・讀懃ｴ｢邨ｱ險亥叙蠕励お繝ｩ繝ｼ:', error);
    
    res.status(500).json({
      error: 'Failed to get search statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export function registerSearchRoutes(app: any) {
  app.use('/api/search', router);
}

export default router; 