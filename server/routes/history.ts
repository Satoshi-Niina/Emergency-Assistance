
import express from 'express';
import { createObjectCsvWriter } from 'csv-writer';
import { HistoryService } from '../services/historyService';
import { z } from 'zod';
import { db } from '../db/index.js';
import { historyItems } from '../db/schema.js';
import fs from 'fs';
import path from 'path';

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
 * 履歴一覧を取得
 */
router.get('/', async (req, res) => {
  try {
    console.log('📋 履歴一覧取得リクエスト:', req.query);

    // Content-Typeを明示的に設定
    res.setHeader('Content-Type', 'application/json');

    // フィルターパラメータを取得
    const { machineType, machineNumber, searchText, searchDate, limit = 20, offset = 0 } = req.query;

    // チャットエクスポートファイルのみを取得（データベースは使用しない）
    const exportsDir = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
    
    let chatExports: any[] = [];
    if (fs.existsSync(exportsDir)) {
      // 再帰的にJSONファイルを検索する関数
      const findJsonFiles = (dir: string, baseDir: string = exportsDir): any[] => {
        const files: any[] = [];
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stats = fs.statSync(itemPath);
          
          if (stats.isDirectory()) {
            // サブディレクトリを再帰的に検索
            files.push(...findJsonFiles(itemPath, baseDir));
          } else if (item.endsWith('.json')) {
            try {
              const content = fs.readFileSync(itemPath, 'utf8');
              const data = JSON.parse(content);
              
              // 相対パスを計算
              const relativePath = path.relative(baseDir, itemPath);
              
              files.push({
                id: `export_${relativePath.replace(/[\\/]/g, '_')}`,
                type: 'chat_export',
                fileName: relativePath,
                chatId: data.chatId,
                userId: data.userId,
                exportType: data.exportType,
                exportTimestamp: data.exportTimestamp,
                messageCount: data.chatData?.messages?.length || 0,
                machineInfo: data.chatData?.machineInfo || {
                  selectedMachineType: '',
                  selectedMachineNumber: '',
                  machineTypeName: '',
                  machineNumber: ''
                },
                savedImages: data.savedImages || [],
                fileSize: stats.size,
                lastModified: stats.mtime,
                createdAt: stats.mtime
              });
            } catch (error) {
              console.warn(`JSONファイルの読み込みエラー: ${itemPath}`, error);
            }
          }
        }
        
        return files;
      };
      
      chatExports = findJsonFiles(exportsDir)
        .sort((a, b) => new Date(b.exportTimestamp).getTime() - new Date(a.exportTimestamp).getTime());
    }

    // フィルタリングを適用
    let filteredExports = chatExports;
    
    if (machineType) {
      filteredExports = filteredExports.filter(item => 
        item.machineInfo?.machineTypeName?.toLowerCase().includes(machineType.toLowerCase())
      );
    }
    
    if (machineNumber) {
      filteredExports = filteredExports.filter(item => 
        item.machineInfo?.machineNumber?.toLowerCase().includes(machineNumber.toLowerCase())
      );
    }
    
    if (searchText) {
      filteredExports = filteredExports.filter(item => 
        item.fileName.toLowerCase().includes(searchText.toLowerCase()) ||
        item.exportType.toLowerCase().includes(searchText.toLowerCase()) ||
        item.machineInfo?.machineTypeName?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.machineInfo?.machineNumber?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // ページネーションを適用
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    const paginatedExports = filteredExports.slice(offsetNum, offsetNum + limitNum);

    console.log('📋 チャットエクスポート一覧:', {
      total: filteredExports.length,
      filtered: paginatedExports.length,
      limit: limitNum,
      offset: offsetNum
    });

    res.json({
      success: true,
      items: paginatedExports,
      total: filteredExports.length,
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
 * GET /api/history/machine-data
 * 機種・機械番号マスターデータを取得
 */
router.get('/machine-data', async (req, res) => {
  try {
    console.log('📋 機種・機械番号データ取得リクエスト');

    // Content-Typeを明示的に設定
    res.setHeader('Content-Type', 'application/json');

    // 一時的に空のデータを返す
    console.log('⚠️ 機種・機械番号データ取得を一時的に無効化 - 空のデータを返します');

    res.json({
      machineTypes: [],
      machines: []
    });

  } catch (error) {
    console.error('❌ 機種・機械番号データ取得エラー:', error);
    res.status(500).json({
      error: '機種・機械番号データの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
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
