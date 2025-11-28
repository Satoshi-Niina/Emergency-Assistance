import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { pool } from '../services/db.js';
import { chunkText } from '../services/chunker.js';
import { embedTexts } from '../services/embedding.js';
import { loadRagConfig } from '../services/config-manager.js';
const router = Router();
// 入力スキーマの定義
const IngestRequestSchema = z.object({
    filename: z.string().min(1).max(255),
    text: z.string().min(1).max(1000000), // 最大1MB
    tags: z.array(z.string()).optional().default([]),
});
// レスポンススキーマの定義
const IngestResponseSchema = z.object({
    doc_id: z.string(),
    chunks: z.number(),
    message: z.string(),
    stats: z.object({
        totalChunks: z.number(),
        totalTokens: z.number(),
        processingTime: z.number(),
    }),
});
/**
 * ドキュメントの取込処理
 * POST /api/ingest
 */
router.post('/', async (req, res) => {
    const startTime = Date.now();
    try {
        // リクエストボディの検証
        const validationResult = IngestRequestSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                error: 'Invalid request body',
                details: validationResult.error.errors,
            });
        }
        const { filename, text, tags } = validationResult.data;
        // 設定を読み込み
        const config = await loadRagConfig();
        // テキストの長さ制限チェック
        if (text.length > config.maxTextLength) {
            return res.status(400).json({
                error: 'Text too long',
                maxLength: config.maxTextLength,
                actualLength: text.length,
            });
        }
        // 原文のハッシュを生成
        const textHash = crypto.createHash('sha1').update(text).digest('hex');
        const docId = textHash;
        // データベース接続
        const client = await pool.connect();
        try {
            // トランザクション開始
            await client.query('BEGIN');
            // 既存ドキュメントの確認
            const existingDoc = await client.query('SELECT doc_id, hash FROM documents WHERE doc_id = $1', [docId]);
            if (existingDoc.rows.length > 0) {
                const existingHash = existingDoc.rows[0].hash;
                // ハッシュが同じ場合は既存のドキュメント
                if (existingHash === textHash) {
                    // 既存のチャンク数を取得
                    const chunkCount = await client.query('SELECT COUNT(*) as count FROM chunks WHERE doc_id = $1', [docId]);
                    await client.query('COMMIT');
                    const response = {
                        doc_id: docId,
                        chunks: parseInt(chunkCount.rows[0].count),
                        message: 'Document already exists with same content',
                        stats: {
                            totalChunks: parseInt(chunkCount.rows[0].count),
                            totalTokens: 0,
                            processingTime: Date.now() - startTime,
                        },
                    };
                    return res.json(response);
                }
                // ハッシュが異なる場合はバージョンアップ
                await client.query('UPDATE documents SET version = version + 1, hash = $1 WHERE doc_id = $2', [textHash, docId]);
            }
            else {
                // 新規ドキュメントの挿入
                await client.query('INSERT INTO documents (doc_id, filename, hash) VALUES ($1, $2, $3)', [docId, filename, textHash]);
            }
            // 既存のチャンクを削除（新しい内容で再作成）
            await client.query('DELETE FROM chunks WHERE doc_id = $1', [docId]);
            // テキストをチャンク化
            const chunks = chunkText(text, {
                size: config.chunkSize,
                overlap: config.chunkOverlap,
            });
            if (chunks.length === 0) {
                throw new Error('No chunks generated from text');
            }
            // チャンクをデータベースに挿入
            const chunkIds = [];
            for (const chunk of chunks) {
                const result = await client.query('INSERT INTO chunks (doc_id, page, content, tags, chunk_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id', [docId, chunk.page, chunk.content, tags, chunk.hash]);
                chunkIds.push(result.rows[0].id);
            }
            // チャンクの内容を埋め込みベクトルに変換
            const chunkContents = chunks.map(chunk => chunk.content);
            const embeddings = await embedTexts(chunkContents, config.batchSize);
            // 埋め込みベクトルをデータベースに挿入
            for (let i = 0; i < chunkIds.length; i++) {
                if (embeddings[i] &&
                    embeddings[i].embedding.length === config.embedDim) {
                    await client.query('INSERT INTO kb_vectors (chunk_id, embedding) VALUES ($1, $2)', [chunkIds[i], embeddings[i].embedding]);
                }
                else {
                    console.warn(`Skipping embedding for chunk ${chunkIds[i]} due to invalid embedding`);
                }
            }
            // トランザクションをコミット
            await client.query('COMMIT');
            // 統計情報の計算
            const totalTokens = embeddings.reduce((sum, emb) => sum + emb.tokenCount, 0);
            const response = {
                doc_id: docId,
                chunks: chunks.length,
                message: 'Document ingested successfully',
                stats: {
                    totalChunks: chunks.length,
                    totalTokens,
                    processingTime: Date.now() - startTime,
                },
            };
            console.log(`✅ ドキュメント取込完了: ${filename} (${chunks.length} chunks, ${totalTokens} tokens)`);
            res.json(response);
        }
        catch (error) {
            // エラーが発生した場合はロールバック
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('❌ ドキュメント取込エラー:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        res.status(500).json({
            error: 'Document ingestion failed',
            message: errorMessage,
            processingTime: Date.now() - startTime,
        });
    }
});
/**
 * 取込状況の確認
 * GET /api/ingest/status
 */
router.get('/status', async (req, res) => {
    try {
        const client = await pool.connect();
        try {
            // 統計情報を取得
            const docCount = await client.query('SELECT COUNT(*) as count FROM documents');
            const chunkCount = await client.query('SELECT COUNT(*) as count FROM chunks');
            const vectorCount = await client.query('SELECT COUNT(*) as count FROM kb_vectors');
            res.json({
                documents: parseInt(docCount.rows[0].count),
                chunks: parseInt(chunkCount.rows[0].count),
                vectors: parseInt(vectorCount.rows[0].count),
                timestamp: new Date().toISOString(),
            });
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('❌ 取込状況確認エラー:', error);
        res.status(500).json({
            error: 'Failed to get ingestion status',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
export default router;
