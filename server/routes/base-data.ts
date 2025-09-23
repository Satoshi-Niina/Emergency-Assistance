import express from 'express';
import { db } from '../db/index.js';
import { baseDocuments } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = express.Router();

/**
 * GET /api/base-data
 * base_documentsテーブルから全データ取得
 */
router.get('/', async (_req, res) => {
  try {
    console.log('📄 基礎データ取得リクエスト');

    // Content-Typeを明示的に設定
    res.setHeader('Content-Type', 'application/json');

    // base_documentsテーブルから全データを取得
    const documents = await db
      .select({
        id: baseDocuments.id,
        title: baseDocuments.title,
        filePath: baseDocuments.filePath,
        createdAt: baseDocuments.createdAt,
      })
      .from(baseDocuments)
      .orderBy(baseDocuments.createdAt);

    console.log(`✅ 基礎データ取得完了: ${documents.length}件`);

    res.json({
      success: true,
      data: documents,
      total: documents.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ 基礎データ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '基礎データの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/base-data
 * 新規基礎データ（文書）を作成
 */
router.post('/', async (_req, res) => {
  try {
    console.log('📄 基礎データ作成リクエスト:', req.body);

    // Content-Typeを明示的に設定
    res.setHeader('Content-Type', 'application/json');

    const { title, filePath } = req.body;

    // バリデーション
    if (!title || !filePath) {
      return res.status(400).json({
        success: false,
        error: 'タイトルとファイルパスは必須です',
        required: ['title', 'filePath'],
        received: { title: !!title, filePath: !!filePath },
      });
    }

    // 新規文書を作成
    const newDocument = await db
      .insert(baseDocuments)
      .values({
        title,
        filePath,
      })
      .returning();

    console.log('✅ 基礎データ作成完了:', newDocument[0]);

    res.status(201).json({
      success: true,
      data: newDocument[0],
      message: '基礎データが正常に作成されました',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ 基礎データ作成エラー:', error);
    res.status(500).json({
      success: false,
      error: '基礎データの作成に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PUT /api/base-data/:id
 * 基礎データ（文書）を更新
 */
router.put('/:id', async (_req, res) => {
  try {
    const { id } = req.params;
    const { title, filePath } = req.body;

    console.log(`📄 基礎データ更新リクエスト: ID=${id}`, req.body);

    // Content-Typeを明示的に設定
    res.setHeader('Content-Type', 'application/json');

    // バリデーション
    if (!title || !filePath) {
      return res.status(400).json({
        success: false,
        error: 'タイトルとファイルパスは必須です',
        required: ['title', 'filePath'],
        received: { title: !!title, filePath: !!filePath },
      });
    }

    // 既存文書をチェック
    const existingDocument = await db
      .select()
      .from(baseDocuments)
      .where(eq(baseDocuments.id, id));
    if (existingDocument.length === 0) {
      return res.status(404).json({
        success: false,
        error: '更新対象の文書が見つかりません',
        id,
      });
    }

    // 文書を更新
    const updatedDocument = await db
      .update(baseDocuments)
      .set({ title, filePath })
      .where(eq(baseDocuments.id, id))
      .returning();

    console.log('✅ 基礎データ更新完了:', updatedDocument[0]);

    res.json({
      success: true,
      data: updatedDocument[0],
      message: '基礎データが正常に更新されました',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ 基礎データ更新エラー:', error);
    res.status(500).json({
      success: false,
      error: '基礎データの更新に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * DELETE /api/base-data/:id
 * 基礎データ（文書）を削除
 */
router.delete('/:id', async (_req, res) => {
  try {
    const { id } = req.params;

    console.log(`📄 基礎データ削除リクエスト: ID=${id}`);

    // Content-Typeを明示的に設定
    res.setHeader('Content-Type', 'application/json');

    // 既存文書をチェック
    const existingDocument = await db
      .select()
      .from(baseDocuments)
      .where(eq(baseDocuments.id, id));
    if (existingDocument.length === 0) {
      return res.status(404).json({
        success: false,
        error: '削除対象の文書が見つかりません',
        id,
      });
    }

    // 文書を削除
    await db.delete(baseDocuments).where(eq(baseDocuments.id, id));

    console.log('✅ 基礎データ削除完了:', id);

    res.json({
      success: true,
      message: '基礎データが正常に削除されました',
      id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ 基礎データ削除エラー:', error);
    res.status(500).json({
      success: false,
      error: '基礎データの削除に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/base-data/:id
 * 特定の基礎データ（文書）を取得
 */
router.get('/:id', async (_req, res) => {
  try {
    const { id } = req.params;
    console.log(`📄 基礎データ詳細取得: ${id}`);

    // Content-Typeを明示的に設定
    res.setHeader('Content-Type', 'application/json');

    const document = await db
      .select({
        id: baseDocuments.id,
        title: baseDocuments.title,
        filePath: baseDocuments.filePath,
        createdAt: baseDocuments.createdAt,
      })
      .from(baseDocuments)
      .where(eq(baseDocuments.id, id))
      .limit(1);

    if (document.length === 0) {
      return res.status(404).json({
        success: false,
        error: '文書が見つかりません',
        id,
      });
    }

    console.log('✅ 基礎データ詳細取得完了');

    res.json({
      success: true,
      data: document[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ 基礎データ詳細取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '基礎データの詳細取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// エラーハンドリングミドルウェア
router.use((err: any, _req: any, res: any, _next: any) => {
  console.error('基礎データエラー:', err);

  // Content-Typeを明示的に設定
  res.setHeader('Content-Type', 'application/json');

  res.status(500).json({
    success: false,
    error: '基礎データの処理中にエラーが発生しました',
    details: err.message || 'Unknown error',
    timestamp: new Date().toISOString(),
  });
});

// 404ハンドリング
router.use('*', (req: any, res: any) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({
    success: false,
    error: '基礎データのエンドポイントが見つかりません',
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

export { router as baseDataRouter };
