import express from 'express';
import { db } from '../db/index.js';
import { supportFlows } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const router = express.Router();

// バリデーションスキーマ
const createFlowSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です'),
  jsonData: z.any().optional() // JSONBデータ
});

/**
 * GET /api/flows
 * 応急処置フロー一覧を取得
 */
router.get('/', async (req, res) => {
  try {
    console.log('🔄 応急処置フロー取得リクエスト');
    
    // support_flowsテーブルから全データを取得
    const flows = await db.select({
      id: supportFlows.id,
      title: supportFlows.title,
      jsonData: supportFlows.jsonData,
      createdAt: supportFlows.createdAt
    }).from(supportFlows)
    .orderBy(supportFlows.createdAt);

    console.log(`✅ 応急処置フロー取得完了: ${flows.length}件`);

    res.json({
      success: true,
      flows: flows,
      total: flows.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 応急処置フロー取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '応急処置フローの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/flows
 * 新規応急処置フローを作成
 */
router.post('/', async (req, res) => {
  try {
    console.log('🔄 新規応急処置フロー作成リクエスト');
    
    // バリデーション
    const validationResult = createFlowSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'バリデーションエラー',
        details: validationResult.error.errors
      });
    }

    const { title, jsonData } = validationResult.data;

    // 新規フローを作成
    const newFlow = await db.insert(supportFlows).values({
      title,
      jsonData: jsonData || {}
    }).returning();

    console.log('✅ 新規応急処置フロー作成完了:', newFlow[0].id);

    res.status(201).json({
      success: true,
      data: newFlow[0],
      message: '応急処置フローが正常に作成されました'
    });

  } catch (error) {
    console.error('❌ 新規応急処置フロー作成エラー:', error);
    res.status(500).json({
      success: false,
      error: '応急処置フローの作成に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/flows/:id
 * 特定の応急処置フローを取得
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔄 応急処置フロー詳細取得: ${id}`);

    const flow = await db.select({
      id: supportFlows.id,
      title: supportFlows.title,
      jsonData: supportFlows.jsonData,
      createdAt: supportFlows.createdAt
    }).from(supportFlows)
    .where(eq(supportFlows.id, id))
    .limit(1);

    if (flow.length === 0) {
      return res.status(404).json({
        success: false,
        error: '応急処置フローが見つかりません'
      });
    }

    console.log('✅ 応急処置フロー詳細取得完了');

    res.json({
      success: true,
      data: flow[0]
    });

  } catch (error) {
    console.error('❌ 応急処置フロー詳細取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '応急処置フローの詳細取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/flows/:id
 * 応急処置フローを更新
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔄 応急処置フロー更新: ${id}`);
    
    // バリデーション
    const validationResult = createFlowSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'バリデーションエラー',
        details: validationResult.error.errors
      });
    }

    const { title, jsonData } = validationResult.data;

    // フローを更新
    const updatedFlow = await db.update(supportFlows)
      .set({
        title,
        jsonData: jsonData || {}
      })
      .where(eq(supportFlows.id, id))
      .returning();

    if (updatedFlow.length === 0) {
      return res.status(404).json({
        success: false,
        error: '応急処置フローが見つかりません'
      });
    }

    console.log('✅ 応急処置フロー更新完了');

    res.json({
      success: true,
      data: updatedFlow[0],
      message: '応急処置フローが正常に更新されました'
    });

  } catch (error) {
    console.error('❌ 応急処置フロー更新エラー:', error);
    res.status(500).json({
      success: false,
      error: '応急処置フローの更新に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/flows/:id
 * 応急処置フローを削除
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔄 応急処置フロー削除: ${id}`);

    const deletedFlow = await db.delete(supportFlows)
      .where(eq(supportFlows.id, id))
      .returning();

    if (deletedFlow.length === 0) {
      return res.status(404).json({
        success: false,
        error: '応急処置フローが見つかりません'
      });
    }

    console.log('✅ 応急処置フロー削除完了');

    res.json({
      success: true,
      message: '応急処置フローが正常に削除されました',
      deletedId: id
    });

  } catch (error) {
    console.error('❌ 応急処置フロー削除エラー:', error);
    res.status(500).json({
      success: false,
      error: '応急処置フローの削除に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as flowsRouter }; 