import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { pool } from '../services/db.js';
import { chunkText } from '../services/chunker.js';
import { embedTexts } from '../services/embedding.js';
import { loadRagConfig } from '../services/config-manager.js';

const router = Router();

// 蜈･蜉帙せ繧ｭ繝ｼ繝槭・螳夂ｾｩ
const IngestRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  text: z.string().min(1).max(1000000), // 譛螟ｧ1MB
  tags: z.array(z.string()).optional().default([])
});

// 繝ｬ繧ｹ繝昴Φ繧ｹ繧ｹ繧ｭ繝ｼ繝槭・螳夂ｾｩ
const IngestResponseSchema = z.object({
  doc_id: z.string(),
  chunks: z.number(),
  message: z.string(),
  stats: z.object({
    totalChunks: z.number(),
    totalTokens: z.number(),
    processingTime: z.number()
  })
});

type IngestRequest = z.infer<typeof IngestRequestSchema>;
type IngestResponse = z.infer<typeof IngestResponseSchema>;

/**
 * 繝峨く繝･繝｡繝ｳ繝医・蜿冶ｾｼ蜃ｦ逅・
 * POST /api/ingest
 */
router.post('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // 繝ｪ繧ｯ繧ｨ繧ｹ繝医・繝・ぅ縺ｮ讀懆ｨｼ
    const validationResult = IngestRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.errors
      });
    }
    
    const { filename, text, tags } = validationResult.data;
    
    // 險ｭ螳壹ｒ隱ｭ縺ｿ霎ｼ縺ｿ
    const config = await loadRagConfig();
    
    // 繝・く繧ｹ繝医・髟ｷ縺募宛髯舌メ繧ｧ繝・け
    if (text.length > config.maxTextLength) {
      return res.status(400).json({
        error: 'Text too long',
        maxLength: config.maxTextLength,
        actualLength: text.length
      });
    }
    
    // 蜴滓枚縺ｮ繝上ャ繧ｷ繝･繧堤函謌・
    const textHash = crypto.createHash('sha1').update(text).digest('hex');
    const docId = textHash;
    
    // 繝・・繧ｿ繝吶・繧ｹ謗･邯・
    const client = await pool.connect();
    
    try {
      // 繝医Λ繝ｳ繧ｶ繧ｯ繧ｷ繝ｧ繝ｳ髢句ｧ・
      await client.query('BEGIN');
      
      // 譌｢蟄倥ラ繧ｭ繝･繝｡繝ｳ繝医・遒ｺ隱・
      const existingDoc = await client.query(
        'SELECT doc_id, hash FROM documents WHERE doc_id = $1',
        [docId]
      );
      
      if (existingDoc.rows.length > 0) {
        const existingHash = existingDoc.rows[0].hash;
        
        // 繝上ャ繧ｷ繝･縺悟酔縺伜ｴ蜷医・譌｢蟄倥・繝峨く繝･繝｡繝ｳ繝・
        if (existingHash === textHash) {
          // 譌｢蟄倥・繝√Ε繝ｳ繧ｯ謨ｰ繧貞叙蠕・
          const chunkCount = await client.query(
            'SELECT COUNT(*) as count FROM chunks WHERE doc_id = $1',
            [docId]
          );
          
          await client.query('COMMIT');
          
          const response: IngestResponse = {
            doc_id: docId,
            chunks: parseInt(chunkCount.rows[0].count),
            message: 'Document already exists with same content',
            stats: {
              totalChunks: parseInt(chunkCount.rows[0].count),
              totalTokens: 0,
              processingTime: Date.now() - startTime
            }
          };
          
          return res.json(response);
        }
        
        // 繝上ャ繧ｷ繝･縺檎焚縺ｪ繧句ｴ蜷医・繝舌・繧ｸ繝ｧ繝ｳ繧｢繝・・
        await client.query(
          'UPDATE documents SET version = version + 1, hash = $1 WHERE doc_id = $2',
          [textHash, docId]
        );
      } else {
        // 譁ｰ隕上ラ繧ｭ繝･繝｡繝ｳ繝医・謖ｿ蜈･
        await client.query(
          'INSERT INTO documents (doc_id, filename, hash) VALUES ($1, $2, $3)',
          [docId, filename, textHash]
        );
      }
      
      // 譌｢蟄倥・繝√Ε繝ｳ繧ｯ繧貞炎髯､・域眠縺励＞蜀・ｮｹ縺ｧ蜀堺ｽ懈・・・
      await client.query('DELETE FROM chunks WHERE doc_id = $1', [docId]);
      
      // 繝・く繧ｹ繝医ｒ繝√Ε繝ｳ繧ｯ蛹・
      const chunks = chunkText(text, {
        size: config.chunkSize,
        overlap: config.chunkOverlap
      });
      
      if (chunks.length === 0) {
        throw new Error('No chunks generated from text');
      }
      
      // 繝√Ε繝ｳ繧ｯ繧偵ョ繝ｼ繧ｿ繝吶・繧ｹ縺ｫ謖ｿ蜈･
      const chunkIds: number[] = [];
      for (const chunk of chunks) {
        const result = await client.query(
          'INSERT INTO chunks (doc_id, page, content, tags, chunk_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [docId, chunk.page, chunk.content, tags, chunk.hash]
        );
        chunkIds.push(result.rows[0].id);
      }
      
      // 繝√Ε繝ｳ繧ｯ縺ｮ蜀・ｮｹ繧貞沂繧∬ｾｼ縺ｿ繝吶け繝医Ν縺ｫ螟画鋤
      const chunkContents = chunks.map(chunk => chunk.content);
      const embeddings = await embedTexts(chunkContents, config.batchSize);
      
      // 蝓九ａ霎ｼ縺ｿ繝吶け繝医Ν繧偵ョ繝ｼ繧ｿ繝吶・繧ｹ縺ｫ謖ｿ蜈･
      for (let i = 0; i < chunkIds.length; i++) {
        if (embeddings[i] && embeddings[i].embedding.length === config.embedDim) {
          await client.query(
            'INSERT INTO kb_vectors (chunk_id, embedding) VALUES ($1, $2)',
            [chunkIds[i], embeddings[i].embedding]
          );
        } else {
          console.warn(`Skipping embedding for chunk ${chunkIds[i]} due to invalid embedding`);
        }
      }
      
      // 繝医Λ繝ｳ繧ｶ繧ｯ繧ｷ繝ｧ繝ｳ繧偵さ繝溘ャ繝・
      await client.query('COMMIT');
      
      // 邨ｱ險域ュ蝣ｱ縺ｮ險育ｮ・
      const totalTokens = embeddings.reduce((sum, emb) => sum + emb.tokenCount, 0);
      
      const response: IngestResponse = {
        doc_id: docId,
        chunks: chunks.length,
        message: 'Document ingested successfully',
        stats: {
          totalChunks: chunks.length,
          totalTokens,
          processingTime: Date.now() - startTime
        }
      };
      
      console.log(`笨・繝峨く繝･繝｡繝ｳ繝亥叙霎ｼ螳御ｺ・ ${filename} (${chunks.length} chunks, ${totalTokens} tokens)`);
      res.json(response);
      
    } catch (error) {
      // 繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺溷ｴ蜷医・繝ｭ繝ｼ繝ｫ繝舌ャ繧ｯ
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('笶・繝峨く繝･繝｡繝ｳ繝亥叙霎ｼ繧ｨ繝ｩ繝ｼ:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      error: 'Document ingestion failed',
      message: errorMessage,
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * 蜿冶ｾｼ迥ｶ豕√・遒ｺ隱・
 * GET /api/ingest/status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    
    try {
      // 邨ｱ險域ュ蝣ｱ繧貞叙蠕・
      const docCount = await client.query('SELECT COUNT(*) as count FROM documents');
      const chunkCount = await client.query('SELECT COUNT(*) as count FROM chunks');
      const vectorCount = await client.query('SELECT COUNT(*) as count FROM kb_vectors');
      
      res.json({
        documents: parseInt(docCount.rows[0].count),
        chunks: parseInt(chunkCount.rows[0].count),
        vectors: parseInt(vectorCount.rows[0].count),
        timestamp: new Date().toISOString()
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('笶・蜿冶ｾｼ迥ｶ豕∫｢ｺ隱阪お繝ｩ繝ｼ:', error);
    res.status(500).json({
      error: 'Failed to get ingestion status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
