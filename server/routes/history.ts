import express from 'express';
import { HistoryService } from '../services/historyService';
import { z } from 'zod';
import { db } from '../db/index.js';
import { historyItems, machineTypes, machines } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BackupManager } from '../lib/backup-manager';
import { faultHistoryService } from '../services/fault-history-service.js';
import { summarizeText } from '../lib/openai.js';
import sharp from 'sharp';
import { upload } from '../utils/image-uploader.js';
import { azureStorage } from '../lib/azure-storage.js';

// ESM用__dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// バックアップマネージャーの設定
const backupManager = new BackupManager({
  maxBackups: parseInt(process.env.BACKUP_MAX_FILES || '3'),
  backupBaseDir: process.env.BACKUP_FOLDER_NAME || 'backups',
  disabled: process.env.BACKUP_ENABLED === 'false',
});

// バリデーションスキーマ
const saveHistorySchema = z.object({
  sessionId: z.string().uuid('セッションIDはUUID形式である必要があります'),
  question: z.string().min(1, '質問は必須です'),
  answer: z.string().optional(),
  imageBase64: z.string().optional(),
  machineType: z.string().optional(),
  machineNumber: z.string().optional(),
  metadata: z.any().optional(),
});

const createSessionSchema = z.object({
  title: z.string().optional(),
  machineType: z.string().optional(),
  machineNumber: z.string().optional(),
  metadata: z.any().optional(),
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
    const {
      machineType,
      machineNumber,
      searchText,
      searchDate,
      limit = 20,
      offset = 0,
    } = req.query;

    // DBから故障履歴を取得（実際にはファイルモード）
    console.log('📊 故障履歴を取得中...');
    const dbResult = await faultHistoryService.getFaultHistoryList({
      machineType: machineType as string,
      machineNumber: machineNumber as string,
      keyword: searchText as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    console.log('📊 取得結果:', {
      items: dbResult.items.length,
      total: dbResult.total,
      firstItem: dbResult.items[0] ? {
        id: dbResult.items[0].id,
        title: dbResult.items[0].title,
        machineType: dbResult.items[0].machineType,
      } : null,
    });

    // DBのデータを履歴表示フォーマットに変換
    const convertedItems = dbResult.items.map((dbItem: any) => {
      let jsonData;
      try {
        jsonData = typeof dbItem.jsonData === 'string'
          ? JSON.parse(dbItem.jsonData)
          : dbItem.jsonData;
      } catch (error) {
        console.warn('JSON解析エラー:', error);
        jsonData = {};
      }

      return {
        id: dbItem.id,
        type: 'fault_history',
        fileName: `${dbItem.title}_${dbItem.id}.json`,
        chatId: jsonData.chatId || dbItem.id,
        userId: jsonData.userId || '',
        exportType: jsonData.exportType || 'db_stored',
        exportTimestamp: dbItem.createdAt || new Date().toISOString(),
        messageCount: jsonData.metadata?.total_messages || 0,
        machineType: dbItem.machineType || '',
        machineNumber: dbItem.machineNumber || '',
        machineInfo: {
          selectedMachineType: '',
          selectedMachineNumber: '',
          machineTypeName: dbItem.machineType || '',
          machineNumber: dbItem.machineNumber || '',
        },
        title: dbItem.title || '',
        problemDescription: dbItem.description || '',
        extractedComponents: dbItem.keywords || [],
        extractedSymptoms: [],
        possibleModels: [],
        conversationHistory: jsonData.conversationHistory || jsonData.conversation_history || [],
        metadata: jsonData.metadata || {},
        savedImages: jsonData.savedImages || [],
        images: dbItem.images || jsonData.savedImages || [],
        fileSize: 0,
        lastModified: dbItem.updatedAt || dbItem.createdAt,
        createdAt: dbItem.createdAt,
        jsonData: {
          ...jsonData,
          title: dbItem.title,
          problemDescription: dbItem.description,
          machineType: dbItem.machineType,
          machineNumber: dbItem.machineNumber,
        },
      };
    });

    console.log('📊 変換完了:', convertedItems.length, '件');

    // レスポンス返却（successとdataを含む形式）
    return res.json({
      success: true,
      data: convertedItems,
      total: convertedItems.length,
    });

  } catch (error) {
    console.error('❌ 履歴取得エラー:', error);
    return res.status(500).json({
      error: 'history_fetch_error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});




/**
 * GET /api/history/search-filters
 * 履歴検索用のフィルターデータ（保存されたJSONファイルから動的に取得）
 */
router.get('/search-filters', async (_req, res) => {
  try {
    console.log('📋 履歴検索フィルターデータ取得リクエスト');

    let exportsDir = path.join(process.cwd(), 'knowledge-base', 'exports');

    if (!fs.existsSync(exportsDir)) {
      const alternativePath = path.join(
        process.cwd(),
        '..',
        'knowledge-base',
        'exports'
      );
      if (fs.existsSync(alternativePath)) {
        exportsDir = alternativePath;
      }
    }

    const machineTypes = new Set<string>();
    const machineNumbers = new Set<string>();

    if (fs.existsSync(exportsDir)) {
      const files = fs.readdirSync(exportsDir);

      for (const file of files) {
        if (file.endsWith('.json') && !file.includes('.backup.')) {
          try {
            const filePath = path.join(exportsDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);

            // 機種を収集
            const machineType =
              data.machineType ||
              data.chatData?.machineInfo?.machineTypeName ||
              '';
            if (machineType && machineType.trim()) {
              machineTypes.add(machineType.trim());
            }

            // 機械番号を収集
            const machineNumber =
              data.machineNumber ||
              data.chatData?.machineInfo?.machineNumber ||
              '';
            if (machineNumber && machineNumber.trim()) {
              machineNumbers.add(machineNumber.trim());
            }
          } catch (error) {
            console.warn(`JSONファイル読み込みエラー: ${file}`, error);
          }
        }
      }
    }

    const result = {
      success: true,
      machineTypes: Array.from(machineTypes).sort(),
      machineNumbers: Array.from(machineNumbers).sort(),
    };

    console.log('📋 履歴検索フィルターデータ:', {
      machineTypesCount: result.machineTypes.length,
      machineNumbersCount: result.machineNumbers.length,
    });

    res.json(result);
  } catch (error) {
    console.error('❌ 履歴検索フィルターデータ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '履歴検索フィルターデータの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/history/machine-data
 * 機種・機械番号マスターデータを取得（PostgreSQLから）
 */
router.get('/machine-data', async (_req, res) => {
  try {
    console.log('📋 機種・機械番号データ取得リクエスト（PostgreSQLから）');

    // Content-Typeを明示的に設定
    res.setHeader('Content-Type', 'application/json');

    // PostgreSQLのmachineTypesテーブルから機種一覧を取得
    const machineTypesData = await db
      .select({
        id: machineTypes.id,
        machineTypeName: machineTypes.machineTypeName,
      })
      .from(machineTypes);

    console.log(
      '📋 PostgreSQLから取得した機種データ:',
      machineTypesData.length,
      '件'
    );

    // PostgreSQLのmachinesテーブルから機械番号一覧を取得（機種名も含む）
    const machinesData = await db
      .select({
        id: machines.id,
        machineNumber: machines.machineNumber,
        machineTypeId: machines.machineTypeId,
        machineTypeName: machineTypes.machineTypeName,
      })
      .from(machines)
      .leftJoin(machineTypes, eq(machines.machineTypeId, machineTypes.id));

    console.log(
      '📋 PostgreSQLから取得した機械データ:',
      machinesData.length,
      '件'
    );

    const result = {
      machineTypes: machineTypesData,
      machines: machinesData,
    };

    console.log('📋 機種・機械番号データ取得結果:', {
      machineTypes: machineTypesData.length,
      machines: machinesData.length,
      sampleMachineTypes: machineTypesData.slice(0, 3),
      sampleMachines: machinesData.slice(0, 3),
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('❌ 機種・機械番号データ取得エラー:', error);
    res.status(500).json({
      error: '機種・機械番号データの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/history/save
 * チャット履歴を保存
 */
router.post('/save', async (_req, res) => {
  try {
    console.log('📋 履歴保存リクエスト:', req.body);

    // バリデーション
    const validationResult = saveHistorySchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'バリデーションエラー',
        details: validationResult.error.errors,
      });
    }

    const data = validationResult.data;

    // 履歴を保存
    const history = await HistoryService.createHistory(data);

    res.json({
      success: true,
      message: '履歴を保存しました',
      data: history,
    });
  } catch (error) {
    console.error('❌ 履歴保存エラー:', error);
    res.status(500).json({
      error: '履歴保存に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/history/update-item/:chatId
 * 履歴アイテムを更新（DB + JSONファイル）
 */
router.put('/update-item/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { updatedData, updatedBy } = req.body;

    console.log('📋 履歴アイテム更新リクエスト:', {
      chatId,
      updatedBy,
      hasUpdatedData: !!updatedData,
      savedImagesCount: updatedData?.savedImages?.length || 0,
    });

    // まずDBを更新
    try {
      const existingRecord = await db
        .select()
        .from(faultHistory)
        .where(eq(faultHistory.id, chatId))
        .limit(1);

      if (existingRecord.length > 0) {
        // 既存のjsonDataを取得
        const currentJsonData = typeof existingRecord[0].jsonData === 'string'
          ? JSON.parse(existingRecord[0].jsonData)
          : existingRecord[0].jsonData || {};

        // 新しいjsonDataを構築（savedImagesを含む）
        const newJsonData = {
          ...currentJsonData,
          ...updatedData,
          savedImages: updatedData.savedImages || currentJsonData.savedImages || [],
          images: updatedData.images || updatedData.savedImages || currentJsonData.images || [],
          lastModified: new Date().toISOString(),
          updatedBy: updatedBy || 'user',
        };

        // DBを更新
        await db
          .update(faultHistory)
          .set({
            title: updatedData.title || existingRecord[0].title,
            description: updatedData.problemDescription || existingRecord[0].description,
            machineType: updatedData.machineType || existingRecord[0].machineType,
            machineNumber: updatedData.machineNumber || existingRecord[0].machineNumber,
            jsonData: JSON.stringify(newJsonData),
            updatedAt: new Date(),
          })
          .where(eq(faultHistory.id, chatId));

        console.log('✅ DB更新完了:', {
          chatId,
          savedImagesCount: newJsonData.savedImages.length,
        });

        // レスポンスにはDB更新後のデータを返す
        return res.json({
          success: true,
          message: '履歴アイテムを更新しました',
          updatedData: newJsonData,
          data: {
            chatId,
            updatedAt: new Date().toISOString(),
          },
        });
      }
    } catch (dbError) {
      console.warn('⚠️ DB更新スキップ（レコードが見つからない可能性）:', dbError);
    }

    // JSONファイルの更新（後方互換性のため）
    const exportsDir = process.env.LOCAL_EXPORT_DIR ||
      path.join(process.cwd(), 'knowledge-base', 'exports');

    console.log('📂 エクスポートディレクトリ:', exportsDir);

    if (!fs.existsSync(exportsDir)) {
      return res.status(404).json({
        error: 'エクスポートディレクトリが見つかりません',
      });
    }

    const files = fs.readdirSync(exportsDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    // chatIdを含むJSONファイルを検索
    const targetFile = jsonFiles.find(file => file.includes(chatId));

    if (!targetFile) {
      return res.status(404).json({
        error: '対象のJSONファイルが見つかりません',
        availableFiles: jsonFiles.slice(0, 5),
      });
    }

    const filePath = path.join(exportsDir, targetFile);

    // 既存のJSONファイルを読み込み
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContent);

    // 差分データで更新
    const updatedJsonData = {
      ...jsonData,
      ...updatedData,
      lastUpdated: new Date().toISOString(),
      updatedBy: updatedBy || 'user',
    };

    // 更新されたJSONファイルを保存（UTF-8 BOMなし）
    fs.writeFileSync(filePath, JSON.stringify(updatedJsonData, null, 2), { encoding: 'utf8' });

    console.log('✅ JSONファイル更新完了:', {
      chatId,
      fileName: targetFile,
      updatedFields: Object.keys(updatedData || {}),
    });

    res.json({
      success: true,
      message: '履歴アイテムを更新しました',
      updatedData: updatedJsonData,
      data: {
        chatId,
        fileName: targetFile,
        updatedAt: updatedJsonData.lastUpdated,
      },
    });
  } catch (error) {
    console.error('❌ 履歴アイテム更新エラー:', error);
    res.status(500).json({
      error: '履歴アイテムの更新に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/history/file
 * 特定のファイルを取得
 */
router.get('/file', async (req, res) => {
  try {
    const { name } = req.query;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        error: 'ファイル名が指定されていません',
      });
    }

    console.log('📋 ファイル取得リクエスト:', name);

    // knowledge-base/exports フォルダ内のJSONファイルを検索
    const exportsDir = process.env.LOCAL_EXPORT_DIR ||
      path.join(process.cwd(), 'knowledge-base', 'exports');

    console.log('📂 エクスポートディレクトリ:', exportsDir);

    if (!fs.existsSync(exportsDir)) {
      return res.status(404).json({
        error: 'エクスポートディレクトリが見つかりません',
      });
    }

    const filePath = path.join(exportsDir, name);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'ファイルが見つかりません',
        fileName: name,
      });
    }

    // JSONファイルを読み込み
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContent);

    console.log('✅ ファイル取得成功:', {
      fileName: name,
      fileSize: fileContent.length,
      hasData: !!jsonData,
    });

    res.json({
      success: true,
      data: jsonData,
      fileName: name,
      fileSize: fileContent.length,
    });
  } catch (error) {
    console.error('❌ ファイル取得エラー:', error);
    res.status(500).json({
      error: 'ファイルの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/history/session
 * 新しいセッションを作成
 */
router.post('/session', async (_req, res) => {
  try {
    console.log('📋 セッション作成リクエスト:', req.body);

    // バリデーション
    const validationResult = createSessionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'バリデーションエラー',
        details: validationResult.error.errors,
      });
    }

    const data = validationResult.data;

    // セッションを作成
    const session = await HistoryService.createSession(data);

    res.json({
      success: true,
      message: 'セッションを作成しました',
      data: session,
    });
  } catch (error) {
    console.error('❌ セッション作成エラー:', error);
    res.status(500).json({
      error: 'セッション作成に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/history/list
 * セッション一覧を取得
 */
router.get('/list', async (_req, res) => {
  try {
    console.log('📋 セッション一覧取得リクエスト');

    const { machineType, machineNumber, status, limit, offset } = req.query;

    const params = {
      machineType: machineType as string,
      machineNumber: machineNumber as string,
      status: status as 'active' | 'completed' | 'archived',
      limit: limit ? parseInt(limit as string) : 20,
      offset: offset ? parseInt(offset as string) : 0,
    };

    const result = await HistoryService.getSessionList(params);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('❌ セッション一覧取得エラー:', error);
    res.status(500).json({
      error: 'セッション一覧取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/history/view/:sessionId
 * セッション詳細と履歴を取得
 */
router.get('/view/:sessionId', async (_req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`📋 セッション詳細取得リクエスト: ${sessionId}`);

    // セッション詳細を取得
    const session = await HistoryService.getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'セッションが見つかりません',
      });
    }

    // セッション履歴を取得
    const history = await HistoryService.getSessionHistory(sessionId);

    res.json({
      success: true,
      data: {
        session,
        history,
      },
    });
  } catch (error) {
    console.error('❌ セッション詳細取得エラー:', error);
    res.status(500).json({
      error: 'セッション詳細取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/history/export-history
 * エクスポート履歴一覧を取得
 */
router.get('/export-history', async (_req, res) => {
  try {
    console.log('📋 エクスポート履歴取得リクエスト');

    // エクスポートディレクトリから履歴を取得
    let exportsDir = path.join(process.cwd(), 'knowledge-base', 'exports');

    // サーバーディレクトリから起動されている場合の代替パス
    if (!fs.existsSync(exportsDir)) {
      const alternativePath = path.join(
        process.cwd(),
        '..',
        'knowledge-base',
        'exports'
      );
      if (fs.existsSync(alternativePath)) {
        exportsDir = alternativePath;
      }
    }

    let exportHistory: any[] = [];
    if (fs.existsSync(exportsDir)) {
      const files = fs.readdirSync(exportsDir);

      exportHistory = files
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(exportsDir, file);
          const stats = fs.statSync(filePath);

          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);

            return {
              id: `export_${file.replace('.json', '')}`,
              filename: file,
              format: 'json' as const,
              exportedAt: data.exportTimestamp || stats.mtime.toISOString(),
              fileSize: stats.size,
              recordCount: data.chatData?.messages?.length || 0,
            };
          } catch (error) {
            console.warn(
              `エクスポートファイルの読み込みエラー: ${filePath}`,
              error
            );
            return {
              id: `export_${file.replace('.json', '')}`,
              filename: file,
              format: 'json' as const,
              exportedAt: stats.mtime.toISOString(),
              fileSize: stats.size,
              recordCount: 0,
            };
          }
        })
        .sort(
          (a, b) =>
            new Date(b.exportedAt).getTime() - new Date(a.exportedAt).getTime()
        );
    }

    console.log(`📋 エクスポート履歴取得完了: ${exportHistory.length}件`);

    res.json(exportHistory);
  } catch (error) {
    console.error('❌ エクスポート履歴取得エラー:', error);
    res.status(500).json({
      error: 'エクスポート履歴の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/history/export-selected
 * 選択された履歴を一括エクスポート
 */
router.post('/export-selected', async (_req, res) => {
  try {
    const { ids, format = 'json' } = req.body;
    console.log(
      `📋 選択履歴エクスポートリクエスト: ${ids?.length || 0}件, 形式: ${format}`
    );

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: 'エクスポートする履歴IDが指定されていません',
      });
    }

    // 選択された履歴を取得
    const selectedHistory = await Promise.all(
      ids.map(async id => {
        try {
          const response = await fetch(
            `${req.protocol}://${req.get('host')}/api/history/${id}`
          );
          if (response.ok) {
            return await response.json();
          }
        } catch (error) {
          console.warn(`履歴取得エラー (ID: ${id}):`, error);
        }
        return null;
      })
    );

    const validHistory = selectedHistory.filter(item => item !== null);

    if (validHistory.length === 0) {
      return res.status(404).json({
        error: '有効な履歴が見つかりません',
      });
    }

    let exportData: string;
    let contentType: string;
    let filename: string;

    if (format === 'csv') {
      // CSV形式でエクスポート
      const csvData = validHistory.map((item, index) => ({
        'No.': index + 1,
        機種: item.machineType || '',
        機械番号: item.machineNumber || '',
        作成日時: new Date(item.createdAt).toLocaleString('ja-JP'),
        JSONデータ: JSON.stringify(item.jsonData),
      }));

      const csvContent = [
        'No.,機種,機械番号,作成日時,JSONデータ',
        ...csvData.map(
          row =>
            `${row['No.']},"${row['機種']}","${row['機械番号']}","${row['作成日時']}","${row['JSONデータ']}"`
        ),
      ].join('\n');

      exportData = csvContent;
      contentType = 'text/csv; charset=utf-8';
      filename = `selected_history_${new Date().toISOString().slice(0, 10)}.csv`;
    } else {
      // JSON形式でエクスポート
      exportData = JSON.stringify(validHistory, null, 2);
      contentType = 'application/json';
      filename = `selected_history_${new Date().toISOString().slice(0, 10)}.json`;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exportData);
  } catch (error) {
    console.error('❌ 選択履歴エクスポートエラー:', error);
    res.status(500).json({
      error: '選択履歴のエクスポートに失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/history/export-all
 * 全履歴をエクスポート
 */
router.get('/export-all', async (_req, res) => {
  try {
    const { format = 'json', machineType, machineNumber } = req.query;
    console.log(`📋 全履歴エクスポートリクエスト: 形式: ${format}`);

    // フィルター条件を適用して履歴を取得
    let exportsDir = path.join(process.cwd(), 'knowledge-base', 'exports');

    // サーバーディレクトリから起動されている場合の代替パス
    if (!fs.existsSync(exportsDir)) {
      const alternativePath = path.join(
        process.cwd(),
        '..',
        'knowledge-base',
        'exports'
      );
      if (fs.existsSync(alternativePath)) {
        exportsDir = alternativePath;
      }
    }

    let allHistory: any[] = [];
    if (fs.existsSync(exportsDir)) {
      const files = fs.readdirSync(exportsDir);

      allHistory = files
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(exportsDir, file);
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(content);
          } catch (error) {
            console.warn(`ファイル読み込みエラー: ${filePath}`, error);
            return null;
          }
        })
        .filter(item => item !== null);
    }

    // フィルター適用
    if (machineType) {
      allHistory = allHistory.filter(
        item =>
          item.chatData?.machineInfo?.machineTypeName?.includes(machineType) ||
          item.chatData?.machineInfo?.selectedMachineType?.includes(machineType)
      );
    }

    if (machineNumber) {
      allHistory = allHistory.filter(
        item =>
          item.chatData?.machineInfo?.machineNumber?.includes(machineNumber) ||
          item.chatData?.machineInfo?.selectedMachineNumber?.includes(
            machineNumber
          )
      );
    }

    let exportData: string;
    let contentType: string;
    let filename: string;

    if (format === 'csv') {
      // CSV形式でエクスポート
      const csvData = allHistory.map((item, index) => ({
        'No.': index + 1,
        チャットID: item.chatId || '',
        ユーザーID: item.userId || '',
        機種: item.chatData?.machineInfo?.machineTypeName || '',
        機械番号: item.chatData?.machineInfo?.machineNumber || '',
        エクスポート日時: new Date(item.exportTimestamp).toLocaleString(
          'ja-JP'
        ),
        メッセージ数: item.chatData?.messages?.length || 0,
      }));

      const csvContent = [
        'No.,チャットID,ユーザーID,機種,機械番号,エクスポート日時,メッセージ数',
        ...csvData.map(
          row =>
            `${row['No.']},"${row['チャットID']}","${row['ユーザーID']}","${row['機種']}","${row['機械番号']}","${row['エクスポート日時']}","${row['メッセージ数']}"`
        ),
      ].join('\n');

      exportData = csvContent;
      contentType = 'text/csv; charset=utf-8';
      filename = `all_history_${new Date().toISOString().slice(0, 10)}.csv`;
    } else {
      // JSON形式でエクスポート
      exportData = JSON.stringify(allHistory, null, 2);
      contentType = 'application/json';
      filename = `all_history_${new Date().toISOString().slice(0, 10)}.json`;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exportData);
  } catch (error) {
    console.error('❌ 全履歴エクスポートエラー:', error);
    res.status(500).json({
      error: '全履歴のエクスポートに失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/history/advanced-search
 * 高度なテキスト検索
 */
router.post('/advanced-search', async (_req, res) => {
  try {
    const { searchText, limit = 50 } = req.body;
    console.log(`📋 高度な検索リクエスト: "${searchText}", 制限: ${limit}`);

    if (!searchText) {
      return res.status(400).json({
        error: '検索テキストが必要です',
      });
    }

    // エクスポートディレクトリから履歴を検索
    let exportsDir = path.join(process.cwd(), 'knowledge-base', 'exports');

    // サーバーディレクトリから起動されている場合の代替パス
    if (!fs.existsSync(exportsDir)) {
      const alternativePath = path.join(
        process.cwd(),
        '..',
        'knowledge-base',
        'exports'
      );
      if (fs.existsSync(alternativePath)) {
        exportsDir = alternativePath;
      }
    }

    let searchResults: any[] = [];
    if (fs.existsSync(exportsDir)) {
      const files = fs.readdirSync(exportsDir);

      searchResults = files
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(exportsDir, file);
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);

            // 検索テキストでマッチング
            const searchLower = searchText.toLowerCase();
            const contentStr = JSON.stringify(data).toLowerCase();

            if (contentStr.includes(searchLower)) {
              return {
                id: `export_${file.replace('.json', '')}`,
                filename: file,
                chatId: data.chatId,
                userId: data.userId,
                machineInfo: data.chatData?.machineInfo || {},
                exportTimestamp: data.exportTimestamp,
                messageCount: data.chatData?.messages?.length || 0,
                matchScore: contentStr.split(searchLower).length - 1, // マッチ回数
              };
            }
            return null;
          } catch (error) {
            console.warn(`検索ファイル読み込みエラー: ${filePath}`, error);
            return null;
          }
        })
        .filter(item => item !== null)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);
    }

    console.log(`📋 高度な検索完了: ${searchResults.length}件`);

    res.json({
      items: searchResults,
      total: searchResults.length,
      searchText,
      searchTerms: searchText.split(/\s+/).filter(term => term.length > 0),
    });
  } catch (error) {
    console.error('❌ 高度な検索エラー:', error);
    res.status(500).json({
      error: '高度な検索に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/history/generate-report
 * レポート生成
 */
router.post('/generate-report', async (_req, res) => {
  try {
    const { searchFilters, reportTitle, reportDescription } = req.body;
    console.log('📋 レポート生成リクエスト:', { searchFilters, reportTitle });

    // フィルター条件を適用して履歴を取得
    let exportsDir = path.join(process.cwd(), 'knowledge-base', 'exports');

    // サーバーディレクトリから起動されている場合の代替パス
    if (!fs.existsSync(exportsDir)) {
      const alternativePath = path.join(
        process.cwd(),
        '..',
        'knowledge-base',
        'exports'
      );
      if (fs.existsSync(alternativePath)) {
        exportsDir = alternativePath;
      }
    }

    let reportData: any[] = [];
    if (fs.existsSync(exportsDir)) {
      const files = fs.readdirSync(exportsDir);

      reportData = files
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(exportsDir, file);
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(content);
          } catch (error) {
            console.warn(`レポートファイル読み込みエラー: ${filePath}`, error);
            return null;
          }
        })
        .filter(item => item !== null);

      // フィルター適用
      if (searchFilters) {
        if (searchFilters.machineType) {
          reportData = reportData.filter(
            item =>
              item.machineType?.includes(searchFilters.machineType) ||
              item.originalChatData?.machineInfo?.machineTypeName?.includes(
                searchFilters.machineType
              ) ||
              item.chatData?.machineInfo?.machineTypeName?.includes(
                searchFilters.machineType
              ) ||
              item.chatData?.machineInfo?.selectedMachineType?.includes(
                searchFilters.machineType
              )
          );
        }

        if (searchFilters.machineNumber) {
          reportData = reportData.filter(
            item =>
              item.machineNumber?.includes(searchFilters.machineNumber) ||
              item.originalChatData?.machineInfo?.machineNumber?.includes(
                searchFilters.machineNumber
              ) ||
              item.chatData?.machineInfo?.machineNumber?.includes(
                searchFilters.machineNumber
              ) ||
              item.chatData?.machineInfo?.selectedMachineNumber?.includes(
                searchFilters.machineNumber
              )
          );
        }

        if (searchFilters.searchText) {
          const searchLower = searchFilters.searchText.toLowerCase();
          reportData = reportData.filter(item =>
            JSON.stringify(item).toLowerCase().includes(searchLower)
          );
        }
      }
    }

    // レポートデータを生成
    const report = {
      title: reportTitle || '履歴レポート',
      description: reportDescription || '',
      generatedAt: new Date().toISOString(),
      totalCount: reportData.length,
      items: reportData.map(item => ({
        chatId: item.chatId,
        userId: item.userId,
        machineType:
          item.machineType ||
          item.originalChatData?.machineInfo?.machineTypeName ||
          item.chatData?.machineInfo?.machineTypeName ||
          '',
        machineNumber:
          item.machineNumber ||
          item.originalChatData?.machineInfo?.machineNumber ||
          item.chatData?.machineInfo?.machineNumber ||
          '',
        exportTimestamp: item.exportTimestamp,
        messageCount: item.chatData?.messages?.length || 0,
      })),
    };

    // JSON形式でレポートを返す
    const reportJson = JSON.stringify(report, null, 2);
    const filename = `report_${new Date().toISOString().slice(0, 10)}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(reportJson);
  } catch (error) {
    console.error('❌ レポート生成エラー:', error);
    res.status(500).json({
      error: 'レポート生成に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/history/export/:sessionId
 * セッション履歴をCSVでエクスポート
 */
router.get('/export/:sessionId', async (_req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`📋 CSVエクスポートリクエスト: ${sessionId}`);

    // エクスポートデータを取得
    const exportData = await HistoryService.getExportData(sessionId);
    if (!exportData) {
      return res.status(404).json({
        error: 'セッションが見つかりません',
      });
    }

    const { session, history } = exportData;

    // CSVデータを生成
    const csvData = history.map((item, index) => ({
      'No.': index + 1,
      質問: item.question,
      回答: item.answer || '',
      画像URL: item.imageUrl || '',
      機種: item.machineType || session.machineType || '',
      機械番号: item.machineNumber || session.machineNumber || '',
      作成日時: new Date(item.createdAt).toLocaleString('ja-JP'),
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
      ...csvData.map(
        row =>
          `${row['No.']},"${row['質問']}","${row['回答']}","${row['画像URL']}","${row['機種']}","${row['機械番号']}","${row['作成日時']}"`
      ),
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
      details: error instanceof Error ? error.message : 'Unknown error',
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
        error: 'セッションが見つかりません',
      });
    }

    res.json({
      success: true,
      message: 'セッションを削除しました',
    });
  } catch (error) {
    console.error('❌ セッション削除エラー:', error);
    res.status(500).json({
      error: 'セッション削除に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/history/:sessionId
 * セッションを更新
 */
router.put('/:sessionId', async (_req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`📋 セッション更新リクエスト: ${sessionId}`, req.body);

    // バリデーション
    const validationResult = createSessionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'バリデーションエラー',
        details: validationResult.error.errors,
      });
    }

    const data = validationResult.data;

    // セッションを更新
    const session = await HistoryService.updateSession(sessionId, data);
    if (!session) {
      return res.status(404).json({
        error: 'セッションが見つかりません',
      });
    }

    res.json({
      success: true,
      message: 'セッションを更新しました',
      data: session,
    });
  } catch (error) {
    console.error('❌ セッション更新エラー:', error);
    res.status(500).json({
      error: 'セッション更新に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/history/update-item
 * 履歴アイテムの更新（データベースまたはJSONファイルに保存）
 * ローカル環境: ファイルシステムに保存
 * 本番環境: DATABASE_URLがあればデータベースに保存
 */
router.put('/update-item/:id', async (_req, res) => {
  try {
    const { id } = req.params;
    const { updatedData, updatedBy = 'user' } = req.body;

    console.log('📝 履歴アイテム更新リクエスト（統一サーバー）:', {
      id,
      updatedDataType: typeof updatedData,
      updatedDataKeys: updatedData ? Object.keys(updatedData) : [],
      updatedBy,
    });

    // 標準はファイルシステムのみ（DBはバックアップ用）

    // IDを正規化（export_プレフィックス除去など）
    let normalizedId = id;
    if (id.startsWith('export_')) {
      normalizedId = id.replace('export_', '');
      // ファイル名の場合は拡張子も除去
      if (normalizedId.endsWith('.json')) {
        normalizedId = normalizedId.replace('.json', '');
      }
      // ファイル名からchatIdを抽出（_で区切られた2番目の部分）
      const parts = normalizedId.split('_');
      if (parts.length >= 2 && parts[1].match(/^[a-f0-9-]+$/)) {
        normalizedId = parts[1];
      }
    }

    console.log('📝 正規化されたID:', normalizedId, '元のID:', id);

    // ファイルシステムから検索
    const exportsDir = process.env.LOCAL_EXPORT_DIR ||
      path.join(process.cwd(), 'knowledge-base', 'exports');

    console.log('📂 エクスポートディレクトリ:', exportsDir);

    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(exportsDir)) {
      console.log('📁 exportsディレクトリを作成:', exportsDir);
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const files = fs.readdirSync(exportsDir);
    console.log(
      '📂 検索対象ファイル一覧:',
      files.filter(f => f.endsWith('.json'))
    );

    let targetFile = null;
    let originalData = null;

    // IDに基づいてファイルを検索
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(exportsDir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);

          // IDが一致するかチェック（chatId、id、またはファイル名から）
          const matches = [
            data.chatId === id,
            data.id === id,
            data.chatId === normalizedId,
            data.id === normalizedId,
            file.includes(id),
            file.includes(normalizedId),
            data.chat_id === id,
            data.chat_id === normalizedId,
            // ファイル名から抽出したIDと比較
            file.split('_').some(part => part === id),
            file.split('_').some(part => part === normalizedId),
            // 短縮IDと比較
            id.length > 8 &&
            (data.chatId?.startsWith(id.substring(0, 8)) ||
              data.id?.startsWith(id.substring(0, 8))),
            normalizedId.length > 8 &&
            (data.chatId?.startsWith(normalizedId.substring(0, 8)) ||
              data.id?.startsWith(normalizedId.substring(0, 8))),
          ];

          if (matches.some(Boolean)) {
            targetFile = filePath;
            originalData = data;
            console.log('✅ 対象ファイル発見:', file);
            console.log(
              '🔍 マッチした条件:',
              matches.map((m, i) => (m ? i : null)).filter(x => x !== null)
            );
            break;
          }
        } catch (error) {
          console.warn(`ファイル読み込みエラー: ${filePath}`, error);
        }
      }
    }

    if (!targetFile || !originalData) {
      console.log('❌ 対象ファイルが見つかりません:', {
        id,
        normalizedId,
        exportsDir,
        filesFound: files.length,
      });

      // ファイル名の詳細をログ出力
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      console.log('📂 検索対象ファイル数:', jsonFiles.length);
      for (const file of jsonFiles) {
        const filePath = path.join(exportsDir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);
          console.log(`📄 ${file}: chatId=${data.chatId}, id=${data.id}`);
        } catch (err) {
          console.warn(`⚠️ ${file}: 読み込みエラー`);
        }
      }

      return res.status(404).json({
        error: '対象の履歴ファイルが見つかりません',
        id: id,
        normalizedId,
        searchedDirectory: exportsDir,
        availableFiles: jsonFiles,
        note: 'ローカル環境ではファイルシステムのみ対応しています。本番環境ではデータベースを使用します。',
      });
    }

    // 差分を適用して更新（既存データを保持し、変更されたフィールドのみ更新）
    const mergeData = (original: any, updates: any): any => {
      const result = { ...original };

      for (const [key, value] of Object.entries(updates)) {
        // undefinedの値はスキップ（既存の値を保持）
        if (value === undefined) {
          continue;
        }

        if (
          value !== null &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          !(value instanceof Date)
        ) {
          // オブジェクトの場合は再帰的にマージ（既存の値を保持）
          if (original[key] && typeof original[key] === 'object' && !Array.isArray(original[key])) {
            result[key] = mergeData(original[key], value);
          } else {
            // 既存のオブジェクトがない場合は、新しい値を設定（既存データがあればマージ）
            result[key] = { ...(original[key] || {}), ...value };
          }
        } else {
          // プリミティブ値や配列、Dateは直接代入（更新される）
          result[key] = value;
        }
      }

      return result;
    };

    // 既存のデータを保持しながら、更新データをマージ
    const updatedJsonData = mergeData(originalData, {
      ...updatedData,
      lastModified: new Date().toISOString(),
    });

    // 更新履歴を追加（既存のupdateHistoryは保持）
    if (!updatedJsonData.updateHistory || !Array.isArray(updatedJsonData.updateHistory)) {
      updatedJsonData.updateHistory = [];
    }

    // 新しい更新履歴を追加（既存の履歴は保持）
    updatedJsonData.updateHistory.push({
      timestamp: new Date().toISOString(),
      updatedFields: Object.keys(updatedData).filter(key => updatedData[key] !== undefined),
      updatedBy: updatedBy,
    });

    // バックアップを作成（BackupManagerを使用）
    console.log('🔄 バックアップ作成開始:', {
      targetFile,
      exists: fs.existsSync(targetFile),
      fileSize: fs.existsSync(targetFile)
        ? fs.statSync(targetFile).size
        : 'N/A',
    });
    const backupPath = await backupManager.createBackup(targetFile);
    console.log('💾 バックアップ作成完了:', {
      backupPath: backupPath || 'バックアップが無効化されています',
      success: !!backupPath,
    });

    // ファイルに上書き保存
    fs.writeFileSync(
      targetFile,
      JSON.stringify(updatedJsonData, null, 2),
      'utf8'
    );

    console.log('✅ 履歴ファイル更新完了:', targetFile);
    console.log('📊 更新されたフィールド:', Object.keys(updatedData));

    res.json({
      success: true,
      message: '履歴ファイルが更新されました',
      updatedFile: path.basename(targetFile),
      updatedData: updatedJsonData,
      backupFile: backupPath ? path.basename(backupPath) : null,
      backupPath: backupPath,
    });
  } catch (error) {
    console.error('❌ 履歴アイテム更新エラー:', error);
    res.status(500).json({
      error: '履歴アイテムの更新に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
});

/**
 * GET /api/history/export-files
 * エクスポートファイル一覧取得
 */
router.get('/export-files', async (_req, res) => {
  try {
    console.log('📂 エクスポートファイル一覧取得リクエスト受信');
    const cwd = process.cwd();
    console.log('📁 現在の作業ディレクトリ:', cwd);

    // 複数のパス候補を試す
    const possiblePaths = [
      // 環境変数が設定されている場合
      process.env.KNOWLEDGE_EXPORTS_DIR,
      // カレントディレクトリから
      path.join(cwd, 'knowledge-base', 'exports'),
      // サーバーディレクトリから起動されている場合
      path.join(cwd, '..', 'knowledge-base', 'exports'),
      // __dirnameから（server/routes/からの相対パス）
      path.join(__dirname, '..', '..', 'knowledge-base', 'exports'),
      // serverディレクトリから起動されている場合の代替パス
      path.join(__dirname, '..', 'knowledge-base', 'exports'),
    ].filter(Boolean) as string[]; // undefined/nullを除外

    console.log('🔍 パス候補:', possiblePaths);

    let exportsDir: string | null = null;
    for (const testPath of possiblePaths) {
      if (!testPath) continue;
      const normalizedPath = path.resolve(testPath);
      console.log(`📂 試行パス: ${normalizedPath}, 存在: ${fs.existsSync(normalizedPath)}`);
      if (fs.existsSync(normalizedPath)) {
        const stats = fs.statSync(normalizedPath);
        if (stats.isDirectory()) {
          exportsDir = normalizedPath;
          console.log('✅ 有効なディレクトリを発見:', exportsDir);
          break;
        } else {
          console.warn(`⚠️ パスは存在するがディレクトリではありません: ${normalizedPath}`);
        }
      }
    }

    if (!exportsDir) {
      console.error('❌ エクスポートディレクトリが見つかりません。試行したパス:', possiblePaths);
      return res.json([]);
    }

    console.log('✅ エクスポートディレクトリ確認:', exportsDir);

    // ファイル一覧を取得（日本語ファイル名対応）
    const files = fs.readdirSync(exportsDir);
    console.log('📋 ディレクトリ内の全ファイル:', files);
    console.log('📋 ファイル数:', files.length);

    // 各ファイル名を確認（デバッグ用）
    files.forEach((file, index) => {
      console.log(`📄 ファイル[${index}]:`, file, '型:', typeof file, '長さ:', file.length);
    });

    const jsonFiles = files.filter(file => {
      const isJson = file.endsWith('.json');
      if (!isJson) {
        console.log('⚠️ JSON以外のファイルをスキップ:', file);
      }
      return isJson;
    });
    console.log('📋 JSONファイル数:', jsonFiles.length, 'ファイル:', jsonFiles);

    // 各ファイルを確認
    const exportFiles = jsonFiles
      .filter(file => {
        const excludeBackup = file.includes('.backup.');
        const excludeTest = file.startsWith('test-backup-');
        if (excludeBackup || excludeTest) {
          console.log('⚠️ 除外ファイル:', file, { excludeBackup, excludeTest });
        }
        return !excludeBackup && !excludeTest;
      })
      .map(file => {
        const filePath = path.join(exportsDir, file);
        console.log('🔍 ファイル処理中:', filePath);

        try {
          // ファイルの存在確認
          if (!fs.existsSync(filePath)) {
            console.warn('❌ ファイルが見つかりません:', filePath);
            return null;
          }

          const stats = fs.statSync(filePath);
          if (!stats.isFile()) {
            console.warn('❌ ファイルではありません:', filePath);
            return null;
          }

          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);

          // 機種と機械番号を抽出（複数の形式に対応）
          const machineType =
            data.machineType ||
            data.chatData?.machineInfo?.machineTypeName ||
            data.machineInfo?.machineTypeName ||
            '';
          const machineNumber =
            data.machineNumber ||
            data.chatData?.machineInfo?.machineNumber ||
            data.machineInfo?.machineNumber ||
            '';

          const fileInfo = {
            fileName: file,
            filePath: filePath,
            chatId: data.chatId || data.id || 'unknown',
            title: data.title || data.problemDescription || 'タイトルなし',
            machineType: machineType,
            machineNumber: machineNumber,
            createdAt:
              data.createdAt ||
              data.exportTimestamp ||
              new Date().toISOString(),
            exportTimestamp: data.exportTimestamp || data.createdAt || new Date().toISOString(),
            lastModified: stats.mtime.toISOString(),
            size: stats.size,
            content: data, // 完全なJSONデータも含める
          };
          console.log('✅ ファイル読み込み成功:', file, 'タイトル:', fileInfo.title, '機種:', machineType, '機械番号:', machineNumber);
          return fileInfo;
        } catch (error) {
          console.error(`❌ ファイル読み込みエラー: ${filePath}`, error);
          if (error instanceof Error) {
            console.error('エラー詳細:', error.message, error.stack);
          }
          return null;
        }
      })
      .filter(item => item !== null);

    console.log('📦 最終エクスポートファイル数:', exportFiles.length);
    console.log('📋 返却ファイル一覧:', exportFiles.map(f => f.fileName));

    res.json(exportFiles);
  } catch (error) {
    console.error('❌ エクスポートファイル一覧取得エラー:', error);
    res.status(500).json({
      error: 'エクスポートファイル一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/history/exports/search
 * knowledge-base/exports内のJSONファイルからキーワード検索
 */
router.get('/exports/search', async (req, res) => {
  try {
    const { keyword } = req.query;

    console.log('🔍 検索リクエスト受信:', { keyword, type: typeof keyword });

    if (!keyword || typeof keyword !== 'string') {
      console.log('⚠️ キーワードが無効:', { keyword });
      return res.json({
        success: true,
        data: [],
        total: 0,
        message: 'キーワードが指定されていません',
      });
    }

    const EXPORTS_DIR = process.env.KNOWLEDGE_EXPORTS_DIR || path.join(process.cwd(), 'knowledge-base/exports');

    // サーバーディレクトリから起動されている場合の代替パス
    let exportsDir = EXPORTS_DIR;
    if (!fs.existsSync(exportsDir)) {
      const alternativePath = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
      if (fs.existsSync(alternativePath)) {
        exportsDir = alternativePath;
      }
    }

    if (!fs.existsSync(exportsDir)) {
      return res.json({
        success: true,
        data: [],
        total: 0,
        message: 'exportsディレクトリが見つかりません',
      });
    }

    const files = fs.readdirSync(exportsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    // 検索語を正規化（小文字化）
    const keywordLower = keyword.toLowerCase().trim();
    const searchTerms = keywordLower.split(/\s+/).filter(term => term.length > 0);

    if (searchTerms.length === 0) {
      return res.json({
        success: true,
        data: [],
        total: 0,
        message: 'キーワードが無効です',
      });
    }

    console.log('🔍 検索開始:', { keyword, keywordLower, searchTerms, totalFiles: jsonFiles.length });

    const results = [];

    for (const fileName of jsonFiles) {
      try {
        const filePath = path.join(exportsDir, fileName);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);

        // JSON全体を文字列化して検索対象にする（最も包括的な検索）
        // これにより、JSON内のすべてのフィールドが検索対象になる
        const fullText = JSON.stringify(jsonData).toLowerCase();

        // すべての検索語が含まれているか確認
        const matches = searchTerms.every(term => fullText.includes(term));

        // デバッグログ：最初のファイルとマッチしたファイルを記録
        if (matches || fileName === jsonFiles[0]) {
          console.log('🔍 ファイル検索結果:', {
            fileName,
            matches,
            title: jsonData.title,
            hasKeyword: fullText.includes(searchTerms[0]),
            searchTerm: searchTerms[0],
            textSample: fullText.substring(0, 200),
          });
        }

        if (matches) {
          // SupportHistoryItem形式に変換
          const item = {
            id: jsonData.chatId || fileName.replace('.json', ''),
            type: 'export',
            fileName: fileName,
            chatId: jsonData.chatId || '',
            userId: jsonData.userId || '',
            exportType: jsonData.exportType || 'manual_send',
            exportTimestamp: jsonData.exportTimestamp || new Date().toISOString(),
            messageCount: jsonData.chatData?.messages?.length || 0,
            machineType: jsonData.machineType || jsonData.chatData?.machineInfo?.machineTypeName || '',
            machineNumber: jsonData.machineNumber || jsonData.chatData?.machineInfo?.machineNumber || '',
            machineInfo: jsonData.chatData?.machineInfo || {},
            title: jsonData.title || '',
            problemDescription: jsonData.problemDescription || '',
            extractedComponents: [],
            extractedSymptoms: [],
            possibleModels: [],
            conversationHistory: [],
            metadata: {},
            savedImages: jsonData.savedImages || [],
            fileSize: 0,
            lastModified: jsonData.lastModified || jsonData.exportTimestamp || new Date().toISOString(),
            createdAt: jsonData.exportTimestamp || new Date().toISOString(),
            jsonData: jsonData,
          };
          results.push(item);
        }
      } catch (error) {
        console.warn(`ファイル読み込みエラー: ${fileName}`, error);
      }
    }

    console.log('🔍 検索完了:', {
      keyword,
      totalFiles: jsonFiles.length,
      resultsCount: results.length,
      results: results.map(r => ({ fileName: r.fileName, title: r.title }))
    });

    res.json({
      success: true,
      data: results,
      total: results.length,
      keyword: keyword,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ エクスポート検索エラー:', error);
    res.status(500).json({
      success: false,
      error: 'エクスポート検索に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/history/exports/filter-data
 * knowledge-base/exports内のJSONファイルから機種・機械番号のリストを取得
 */
router.get('/exports/filter-data', async (req, res) => {
  try {
    const EXPORTS_DIR = process.env.KNOWLEDGE_EXPORTS_DIR || path.join(process.cwd(), 'knowledge-base/exports');

    // サーバーディレクトリから起動されている場合の代替パス
    let exportsDir = EXPORTS_DIR;
    if (!fs.existsSync(exportsDir)) {
      const alternativePath = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
      if (fs.existsSync(alternativePath)) {
        exportsDir = alternativePath;
      }
    }

    if (!fs.existsSync(exportsDir)) {
      return res.json({
        success: true,
        machineTypes: [],
        machineNumbers: [],
        message: 'exportsディレクトリが見つかりません',
      });
    }

    const files = fs.readdirSync(exportsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const machineTypeSet = new Set<string>();
    const machineNumberSet = new Set<string>();

    for (const fileName of jsonFiles) {
      try {
        const filePath = path.join(exportsDir, fileName);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);

        // 機種を抽出
        const machineType = jsonData.machineType || jsonData.chatData?.machineInfo?.machineTypeName || '';
        if (machineType && machineType.trim()) {
          machineTypeSet.add(machineType.trim());
        }

        // 機械番号を抽出
        const machineNumber = jsonData.machineNumber || jsonData.chatData?.machineInfo?.machineNumber || '';
        if (machineNumber && machineNumber.trim()) {
          machineNumberSet.add(machineNumber.trim());
        }
      } catch (error) {
        console.warn(`ファイル読み込みエラー: ${fileName}`, error);
      }
    }

    const machineTypes = Array.from(machineTypeSet).sort();
    const machineNumbers = Array.from(machineNumberSet).sort();

    res.json({
      success: true,
      machineTypes: machineTypes,
      machineNumbers: machineNumbers,
      total: jsonFiles.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ フィルターデータ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'フィルターデータの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/history/statistics
 * 統計情報を取得
 */
router.get('/statistics', async (_req, res) => {
  try {
    console.log('📋 統計情報取得リクエスト');

    const statistics = await HistoryService.getStatistics();

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error('❌ 統計情報取得エラー:', error);
    res.status(500).json({
      error: '統計情報取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/history/backups/:fileName
 * 指定ファイルのバックアップ一覧取得
 */
router.get('/backups/:fileName', async (_req, res) => {
  try {
    const { fileName } = req.params;
    const exportsDir = path.join(process.cwd(), 'knowledge-base', 'exports');
    const targetFile = path.join(exportsDir, fileName);

    if (!fs.existsSync(targetFile)) {
      return res.status(404).json({ error: 'ファイルが見つかりません' });
    }

    const backups = backupManager.listBackups(targetFile);
    res.json(backups);
  } catch (error) {
    console.error('バックアップ一覧取得エラー:', error);
    res.status(500).json({ error: 'バックアップ一覧の取得に失敗しました' });
  }
});

/**
 * POST /api/history/backups/restore
 * バックアップから復元
 */
router.post('/backups/restore', async (_req, res) => {
  try {
    const { backupPath, targetFileName } = req.body;
    const exportsDir = path.join(process.cwd(), 'knowledge-base', 'exports');
    const targetFile = path.join(exportsDir, targetFileName);

    backupManager.restoreFromBackup(backupPath, targetFile);

    res.json({
      success: true,
      message: 'バックアップから復元しました',
      restoredFile: targetFileName,
    });
  } catch (error) {
    console.error('バックアップ復元エラー:', error);
    res.status(500).json({
      error: 'バックアップからの復元に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/history/backup-config
 * バックアップ設定取得
 */
router.get('/backup-config', (_req, res) => {
  try {
    const config = backupManager.getConfig();
    res.json(config);
  } catch (error) {
    console.error('バックアップ設定取得エラー:', error);
    res.status(500).json({ error: 'バックアップ設定の取得に失敗しました' });
  }
});

/**
 * PUT /api/history/backup-config
 * バックアップ設定更新
 */
router.put('/backup-config', (_req, res) => {
  try {
    const newConfig = req.body;
    backupManager.updateConfig(newConfig);

    res.json({
      success: true,
      message: 'バックアップ設定を更新しました',
      config: backupManager.getConfig(),
    });
  } catch (error) {
    console.error('バックアップ設定更新エラー:', error);
    res.status(500).json({
      error: 'バックアップ設定の更新に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/history/import-export
 * exportsフォルダのJSONファイルと関連画像をdocumentsフォルダにインポート
 */
router.post('/import-export', async (req, res) => {
  try {
    const { fileName } = req.body;

    if (!fileName) {
      return res.status(400).json({
        success: false,
        error: 'ファイル名が指定されていません',
      });
    }

    // exportsディレクトリのパス
    let exportsDir = path.join(process.cwd(), 'knowledge-base', 'exports');
    if (!fs.existsSync(exportsDir)) {
      const alternativePath = path.join(
        process.cwd(),
        '..',
        'knowledge-base',
        'exports'
      );
      if (fs.existsSync(alternativePath)) {
        exportsDir = alternativePath;
      }
    }

    const jsonFilePath = path.join(exportsDir, fileName);
    if (!fs.existsSync(jsonFilePath)) {
      return res.status(404).json({
        success: false,
        error: `ファイルが見つかりません: ${fileName}`,
      });
    }

    // JSONファイルを読み込む
    const jsonContent = fs.readFileSync(jsonFilePath, 'utf8');
    const jsonData = JSON.parse(jsonContent);

    // documentsディレクトリのパス
    let documentsDir = path.join(process.cwd(), 'knowledge-base', 'documents');
    if (!fs.existsSync(documentsDir)) {
      const alternativePath = path.join(
        process.cwd(),
        '..',
        'knowledge-base',
        'documents'
      );
      if (fs.existsSync(alternativePath)) {
        documentsDir = alternativePath;
      }
    }

    // documentsディレクトリが存在しない場合は作成
    if (!fs.existsSync(documentsDir)) {
      fs.mkdirSync(documentsDir, { recursive: true });
    }

    // JSONから画像URLを抽出
    const imageUrls: string[] = [];

    // chatData.messagesから画像を抽出
    if (jsonData.chatData?.messages) {
      for (const message of jsonData.chatData.messages) {
        // media配列から画像を抽出
        if (message.media && Array.isArray(message.media)) {
          for (const media of message.media) {
            if (media.type === 'image' && media.url) {
              imageUrls.push(media.url);
            }
          }
        }
        // contentがbase64画像の場合
        if (message.content && typeof message.content === 'string' && message.content.startsWith('data:image/')) {
          // base64画像は既に処理済みの可能性があるので、savedImagesを確認
          // ここではsavedImagesから処理するのでスキップ
        }
      }
    }

    // savedImagesから画像を抽出
    if (jsonData.savedImages && Array.isArray(jsonData.savedImages)) {
      for (const img of jsonData.savedImages) {
        if (img.url || img.path || img.fileName) {
          // url、path、fileNameのいずれかを使用
          let imgUrl: string;
          if (img.url) {
            imgUrl = img.url;
          } else if (img.path) {
            imgUrl = img.path;
          } else {
            imgUrl = `/api/images/chat-exports/${img.fileName}`;
          }
          if (!imageUrls.includes(imgUrl)) {
            imageUrls.push(imgUrl);
          }
        }
      }
    }

    // 画像ファイルを保存するディレクトリ
    const imagesDir = path.join(documentsDir, 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const savedImagePaths: string[] = [];

    // 画像をダウンロードして保存
    for (const imageUrl of imageUrls) {
      try {
        // URLパスから実際のファイルパスを取得
        let actualImagePath: string | null = null;

        // /api/images/chat-exports/xxx.png 形式の場合
        if (imageUrl.startsWith('/api/images/chat-exports/')) {
          const imageFileName = path.basename(imageUrl);
          const chatExportsDir = path.join(
            process.cwd(),
            'knowledge-base',
            'images',
            'chat-exports'
          );
          let testPath = path.join(chatExportsDir, imageFileName);

          // 代替パスを確認
          if (!fs.existsSync(testPath)) {
            const altPath = path.join(
              process.cwd(),
              '..',
              'knowledge-base',
              'images',
              'chat-exports',
              imageFileName
            );
            if (fs.existsSync(altPath)) {
              testPath = altPath;
            } else {
              console.warn(`画像ファイルが見つかりません: ${imageFileName}`);
              continue;
            }
          }
          actualImagePath = testPath;
        }
        // 直接ファイルパスの場合（knowledge-base/images/chat-exports/...）
        else if (imageUrl.includes('knowledge-base') && imageUrl.includes('chat-exports')) {
          // パス文字列から直接ファイルパスを構築
          let testPath = imageUrl;
          // 相対パスの場合、絶対パスに変換
          if (!path.isAbsolute(testPath)) {
            // knowledge-base/images/chat-exports/file.jpg 形式
            testPath = path.join(process.cwd(), testPath);
          }
          // __dirnameからのパスの可能性も確認
          if (!fs.existsSync(testPath)) {
            const altPath = path.join(
              process.cwd(),
              '..',
              imageUrl.replace(/^.*knowledge-base[/\\]/, 'knowledge-base/')
            );
            if (fs.existsSync(altPath)) {
              testPath = altPath;
            } else {
              console.warn(`画像ファイルが見つかりません: ${imageUrl}`);
              continue;
            }
          }
          actualImagePath = testPath;
        }
        // ファイル名のみの場合
        else if (!imageUrl.includes('/') && !imageUrl.includes('\\')) {
          // ファイル名のみの場合は、chat-exportsディレクトリから検索
          const possibleDirs = [
            path.join(process.cwd(), 'knowledge-base', 'images', 'chat-exports'),
            path.join(process.cwd(), '..', 'knowledge-base', 'images', 'chat-exports'),
          ];

          for (const dir of possibleDirs) {
            const testPath = path.join(dir, imageUrl);
            if (fs.existsSync(testPath)) {
              actualImagePath = testPath;
              break;
            }
          }

          if (!actualImagePath) {
            console.warn(`画像ファイルが見つかりません: ${imageUrl}`);
            continue;
          }
        }

        // 実際のファイルパスが見つかった場合、documents/imagesにコピー
        if (actualImagePath && fs.existsSync(actualImagePath)) {
          const imageFileName = path.basename(actualImagePath);
          // タイムスタンプとランダム文字列を追加してユニークなファイル名を生成
          const destFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${imageFileName}`;
          const destImagePath = path.join(imagesDir, destFileName);
          fs.copyFileSync(actualImagePath, destImagePath);
          savedImagePaths.push(`images/${destFileName}`);
          console.log(`画像を保存しました: ${imageFileName} -> ${destFileName}`);
        } else {
          console.warn(`画像ファイルのパスを解決できませんでした: ${imageUrl}`);
        }
      } catch (imageError) {
        console.warn(`画像の保存に失敗しました: ${imageUrl}`, imageError);
      }
    }

    // JSONファイルをdocumentsフォルダに保存（元データをそのまま）
    const destJsonFileName = `${Date.now()}_${fileName}`;
    const destJsonPath = path.join(documentsDir, destJsonFileName);
    fs.writeFileSync(destJsonPath, jsonContent, 'utf8');

    console.log(`JSONファイルを保存しました: ${destJsonFileName}`);
    console.log(`画像ファイル数: ${savedImagePaths.length}`);

    res.json({
      success: true,
      message: 'インポートが完了しました',
      jsonFile: destJsonFileName,
      imageCount: savedImagePaths.length,
      images: savedImagePaths,
    });
  } catch (error) {
    console.error('❌ エクスポートファイルインポートエラー:', error);
    res.status(500).json({
      success: false,
      error: 'インポートに失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/history/summarize
 * JSONデータをGPTで要約する
 */
router.post('/summarize', async (req, res) => {
  try {
    const { jsonData } = req.body;

    if (!jsonData || typeof jsonData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'JSONデータが必要です',
      });
    }

    console.log('📝 GPT要約リクエスト受信');

    // JSONデータから要約用のテキストを構築
    const summaryParts: string[] = [];

    // 1. 事象タイトル
    if (jsonData.title) {
      summaryParts.push(`事象: ${jsonData.title}`);
    }

    // 2. 発生事象の詳細
    if (jsonData.problemDescription) {
      summaryParts.push(`問題説明: ${jsonData.problemDescription}`);
    }

    // 3. 会話履歴からテキストメッセージを抽出
    if (Array.isArray(jsonData.conversationHistory)) {
      const conversationTexts: string[] = [];
      jsonData.conversationHistory.forEach((msg: any) => {
        if (msg && typeof msg === 'object' && typeof msg.content === 'string') {
          // 画像データは除外
          if (!msg.content.startsWith('data:image/')) {
            conversationTexts.push(msg.content);
          }
        }
      });
      if (conversationTexts.length > 0) {
        summaryParts.push(`会話内容: ${conversationTexts.join(' ')}`);
      }
    }

    // 3-1. chatData.messagesからユーザーメッセージを抽出（最優先 - isAiResponseがfalseのもののみ）
    const chatData = jsonData?.chatData || jsonData;
    if (Array.isArray(chatData.messages)) {
      const userMessages: string[] = [];
      chatData.messages.forEach((msg: any) => {
        if (msg && typeof msg === 'object' && msg.isAiResponse === false && typeof msg.content === 'string') {
          // 画像データとURLは除外
          if (!msg.content.startsWith('data:image/') && !msg.content.startsWith('/api/images/')) {
            userMessages.push(msg.content);
          }
        }
      });
      if (userMessages.length > 0) {
        // ユーザーメッセージを最優先で追加
        summaryParts.unshift(`会話内容: ${userMessages.join(' ')}`);
      }
    }

    // 4. 影響コンポーネント
    if (Array.isArray(jsonData.extractedComponents) && jsonData.extractedComponents.length > 0) {
      summaryParts.push(`影響コンポーネント: ${jsonData.extractedComponents.join(', ')}`);
    }

    // 5. 症状
    if (Array.isArray(jsonData.extractedSymptoms) && jsonData.extractedSymptoms.length > 0) {
      summaryParts.push(`症状: ${jsonData.extractedSymptoms.join(', ')}`);
    }

    // 6. 処置内容
    if (jsonData.answer) {
      summaryParts.push(`処置内容: ${jsonData.answer}`);
    }

    // 要約用のテキストを作成
    const textToSummarize = summaryParts.join('\n\n');

    if (!textToSummarize || textToSummarize.trim() === '') {
      return res.status(400).json({
        success: false,
        error: '要約する内容がありません',
      });
    }

    // GPTで要約を生成
    const summary = await summarizeText(textToSummarize);

    console.log('✅ GPT要約生成完了:', summary.substring(0, 100) + '...');

    res.json({
      success: true,
      summary: summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ GPT要約エラー:', error);
    res.status(500).json({
      success: false,
      error: '要約の生成に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/history/upload-image
 * 編集画面から画像をアップロード
 * ローカル: ファイルシステムに保存（120pxにリサイズ）
 * 本番: Azure BLOB Storageに保存（STORAGE_MODE=hybrid時）
 */
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    console.log('🖼️ 履歴編集画面からの画像アップロードリクエスト受信:', {
      hasFile: !!req.file,
      fileSize: req.file?.size,
      fileName: req.file?.originalname,
      mimetype: req.file?.mimetype,
    });

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '画像ファイルが提供されていません',
      });
    }

    // ファイル形式チェック
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (!allowedMimes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: '対応していないファイル形式です',
      });
    }

    // ファイルサイズチェック（10MB）
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'ファイルサイズは10MB以下にしてください',
      });
    }

    // 保存先ディレクトリのパス（環境変数を優先）
    const imagesDir = process.env.FAULT_HISTORY_IMAGES_DIR ||
      path.join(process.cwd(), 'knowledge-base', 'images', 'chat-exports');

    console.log('📂 画像保存ディレクトリ:', imagesDir);

    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
      console.log('📁 画像保存ディレクトリを作成しました:', imagesDir);
    }

    // ファイル名を生成（タイムスタンプ + ランダム文字列）
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = path.extname(req.file.originalname) || '.jpg';
    const fileName = `history_${timestamp}_${randomStr}${extension}`;
    const filePath = path.join(imagesDir, fileName);

    // 画像を120pxにリサイズして保存
    try {
      const resizedBuffer = await sharp(req.file.buffer)
        .resize(120, 120, {
          fit: 'inside', // アスペクト比を維持しながら、120x120以内に収める
          withoutEnlargement: true, // 拡大しない
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      const isProduction = process.env.NODE_ENV === 'production';
      const imageUrl = `/api/images/chat-exports/${fileName}`;

      if (isProduction && process.env.AZURE_STORAGE_CONNECTION_STRING) {
        // 本番環境: Azure Storageに直接アップロード
        try {
          const tempPath = path.join(require('os').tmpdir(), fileName);
          fs.writeFileSync(tempPath, resizedBuffer);
          
          const blobName = `images/chat-exports/${fileName}`;
          await azureStorage.uploadFile(tempPath, blobName);
          fs.unlinkSync(tempPath); // 一時ファイル削除
          console.log('✅ Azure Storageに直接アップロード:', blobName);
        } catch (uploadError) {
          console.error('⚠️ Azure Storageアップロードエラー:', uploadError);
          throw uploadError;
        }
      } else {
        // 開発環境: ローカルファイルシステムに保存
        fs.writeFileSync(filePath, resizedBuffer);
        console.log('✅ 画像ファイルを保存しました（開発環境・120pxにリサイズ）:', filePath);
      }

      res.json({
        success: true,
        imageUrl,
        fileName,
        url: imageUrl,
      });
    } catch (resizeError) {
      console.error('❌ 画像リサイズエラー:', resizeError);
      const isProduction = process.env.NODE_ENV === 'production';
      const imageUrl = `/api/images/chat-exports/${fileName}`;

      if (isProduction && process.env.AZURE_STORAGE_CONNECTION_STRING) {
        // 本番環境: リサイズ失敗時も元の画像をAzure Storageにアップロード
        try {
          const tempPath = path.join(require('os').tmpdir(), fileName);
          fs.writeFileSync(tempPath, req.file.buffer);
          
          const blobName = `images/chat-exports/${fileName}`;
          await azureStorage.uploadFile(tempPath, blobName);
          fs.unlinkSync(tempPath);
          console.log('⚠️ リサイズ失敗、元の画像をAzure Storageにアップロード:', blobName);
        } catch (uploadError) {
          console.error('⚠️ Azure Storageアップロードエラー:', uploadError);
          throw uploadError;
        }
      } else {
        // 開発環境: 元の画像をローカルに保存
        fs.writeFileSync(filePath, req.file.buffer);
        console.log('⚠️ リサイズ失敗、元の画像を保存（開発環境）:', filePath);
      }

      res.json({
        success: true,
        imageUrl,
        fileName,
        url: imageUrl,
        warning: 'リサイズに失敗しましたが、元の画像を保存しました',
      });
    }
  } catch (error) {
    console.error('❌ 画像アップロードエラー:', error);
    console.error('エラースタック:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('エラー詳細:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      hasFile: !!req.file,
      fileSize: req.file?.size,
      fileName: req.file?.originalname,
      imagesDir: process.env.FAULT_HISTORY_IMAGES_DIR || path.join(process.cwd(), 'knowledge-base', 'images', 'chat-exports')
    });

    res.status(500).json({
      success: false,
      error: '画像のアップロードに失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.name : 'Unknown',
      timestamp: new Date().toISOString()
    });
  }
});

export { router as historyRouter };
