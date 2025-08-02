
import express from 'express';
import { createObjectCsvWriter } from 'csv-writer';
import { HistoryService } from '../services/historyService';
import { z } from 'zod';
import { db } from '../db/index.js';
import { historyItems } from '../db/schema.js';

const router = express.Router();

// バリデーションスキーマ
const saveHistorySchema = z.object({
  sessionId: z.string().uuid('セッションIDはUUID形式である必要があります'),
  question: z.string().min(1, '質問は必須です'),
  answer: z.string().optional(),
  imageBase64: z.string().optional(),
  machineType: z.string().optional(),
  machineNumber: z.string().optional(),
  metadata: z.any().optional()
});

const createSessionSchema = z.object({
  title: z.string().optional(),
  machineType: z.string().optional(),
  machineNumber: z.string().optional(),
  metadata: z.any().optional()
});

/**
 * GET /api/history
 * 最新10件の履歴を取得
 */
router.get('/', async (req, res) => {
  try {
    console.log('📋 履歴一覧取得リクエスト');

    // Content-Typeを明示的に設定
    res.setHeader('Content-Type', 'application/json');

    // Drizzle ORMを使用して最新10件の履歴を取得
    const result = await db.select({
      id: historyItems.id,
      chat_id: historyItems.chatId,
      title: historyItems.title,
      description: historyItems.description,
      machine_model: historyItems.machineModel,
      office: historyItems.office,
      category: historyItems.category,
      emergency_guide_title: historyItems.emergencyGuideTitle,
      emergency_guide_content: historyItems.emergencyGuideContent,
      keywords: historyItems.keywords,
      metadata: historyItems.metadata,
      created_at: historyItems.createdAt,
      updated_at: historyItems.updatedAt
    }).from(historyItems)
    .orderBy(historyItems.createdAt)
    .limit(10);

    console.log(`✅ 履歴一覧取得完了: ${result.length}件`);

    res.json({
      success: true,
      data: result,
      total: result.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 履歴一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '履歴一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/history/save
 * チャット履歴を保存
 */
router.post('/save', async (req, res) => {
  try {
    console.log('📋 履歴保存リクエスト:', req.body);

    // バリデーション
    const validationResult = saveHistorySchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'バリデーションエラー',
        details: validationResult.error.errors
      });
    }

    const data = validationResult.data;

    // 履歴を保存
    const history = await HistoryService.createHistory(data);

    res.json({
      success: true,
      message: '履歴を保存しました',
      data: history
    });

  } catch (error) {
    console.error('❌ 履歴保存エラー:', error);
    res.status(500).json({
      error: '履歴保存に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/history/session
 * 新しいセッションを作成
 */
router.post('/session', async (req, res) => {
  try {
    console.log('📋 セッション作成リクエスト:', req.body);
    
    // バリデーション
    const validationResult = createSessionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'バリデーションエラー',
        details: validationResult.error.errors
      });
    }

    const data = validationResult.data;

    // セッションを作成
    const session = await HistoryService.createSession(data);

    res.json({
      success: true,
      message: 'セッションを作成しました',
      data: session
    });

  } catch (error) {
    console.error('❌ セッション作成エラー:', error);
    res.status(500).json({
      error: 'セッション作成に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/history/list
 * セッション一覧を取得
 */
router.get('/list', async (req, res) => {
  try {
    console.log('📋 セッション一覧取得リクエスト');

    const { machineType, machineNumber, status, limit, offset } = req.query;

    const params = {
      machineType: machineType as string,
      machineNumber: machineNumber as string,
      status: status as 'active' | 'completed' | 'archived',
      limit: limit ? parseInt(limit as string) : 20,
      offset: offset ? parseInt(offset as string) : 0
    };

    const result = await HistoryService.getSessionList(params);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ セッション一覧取得エラー:', error);
    res.status(500).json({
      error: 'セッション一覧取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/history/view/:sessionId
 * セッション詳細と履歴を取得
 */
router.get('/view/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`📋 セッション詳細取得リクエスト: ${sessionId}`);

    // セッション詳細を取得
    const session = await HistoryService.getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'セッションが見つかりません'
      });
    }

    // セッション履歴を取得
    const history = await HistoryService.getSessionHistory(sessionId);

    res.json({
      success: true,
      data: {
        session,
        history
      }
    });

  } catch (error) {
    console.error('❌ セッション詳細取得エラー:', error);
    res.status(500).json({
      error: 'セッション詳細取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/history/export/:sessionId
 * セッション履歴をCSVでエクスポート
 */
router.get('/export/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`📋 CSVエクスポートリクエスト: ${sessionId}`);

    // エクスポートデータを取得
    const exportData = await HistoryService.getExportData(sessionId);
    if (!exportData) {
      return res.status(404).json({
        error: 'セッションが見つかりません'
      });
    }

    const { session, history } = exportData;

    // CSVデータを生成
    const csvData = history.map((item, index) => ({
      'No.': index + 1,
      '質問': item.question,
      '回答': item.answer || '',
      '画像URL': item.imageUrl || '',
      '機種': item.machineType || session.machineType || '',
      '機械番号': item.machineNumber || session.machineNumber || '',
      '作成日時': new Date(item.createdAt).toLocaleString('ja-JP')
    }));

    // CSVヘッダーを追加
    const csvContent = [
      // セッション情報
      `セッションID,${session.id}`,
      `タイトル,${session.title || ''}`,
      `機種,${session.machineType || ''}`,
      `機械番号,${session.machineNumber || ''}`,
      `ステータス,${session.status}`,
      `作成日時,${new Date(session.createdAt).toLocaleString('ja-JP')}`,
      `更新日時,${new Date(session.updatedAt).toLocaleString('ja-JP')}`,
      '', // 空行
      // 履歴データ
      'No.,質問,回答,画像URL,機種,機械番号,作成日時',
      ...csvData.map(row => 
        `${row['No.']},"${row['質問']}","${row['回答']}","${row['画像URL']}","${row['機種']}","${row['機械番号']}","${row['作成日時']}"`
      )
    ].join('\n');

    // レスポンスヘッダーを設定
    const filename = `emergency_assistance_${sessionId}_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // CSVデータを送信
    res.send(csvContent);

  } catch (error) {
    console.error('❌ CSVエクスポートエラー:', error);
    res.status(500).json({
      error: 'CSVエクスポートに失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/history/:sessionId
 * セッションを削除
 */
router.delete('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`📋 セッション削除リクエスト: ${sessionId}`);

    const success = await HistoryService.deleteSession(sessionId);
    if (!success) {
      return res.status(404).json({
        error: 'セッションが見つかりません'
      });
    }

    res.json({
      success: true,
      message: 'セッションを削除しました'
    });

  } catch (error) {
    console.error('❌ セッション削除エラー:', error);
    res.status(500).json({
      error: 'セッション削除に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/history/:sessionId
 * セッションを更新
 */
router.put('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`📋 セッション更新リクエスト: ${sessionId}`, req.body);

    // バリデーション
    const validationResult = createSessionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'バリデーションエラー',
        details: validationResult.error.errors
      });
    }

    const data = validationResult.data;

    // セッションを更新
    const session = await HistoryService.updateSession(sessionId, data);
    if (!session) {
      return res.status(404).json({
        error: 'セッションが見つかりません'
      });
    }

    res.json({
      success: true,
      message: 'セッションを更新しました',
      data: session
    });

  } catch (error) {
    console.error('❌ セッション更新エラー:', error);
    res.status(500).json({
      error: 'セッション更新に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/history/statistics
 * 統計情報を取得
 */
router.get('/statistics', async (req, res) => {
  try {
    console.log('📋 統計情報取得リクエスト');

    const statistics = await HistoryService.getStatistics();

    res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    console.error('❌ 統計情報取得エラー:', error);
    res.status(500).json({
      error: '統計情報取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as historyRouter };
