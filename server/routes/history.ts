import express from 'express';
import { HistoryService } from '../services/historyService';
import { z } from 'zod';
import { db } from '../db/index.js';
import { historyItems, machineTypes, machines } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { BackupManager } from '../lib/backup-manager';

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
router.get('/', async (_req, res) => {
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

    // チャットエクスポートファイルのみを取得（データベースは使用しない）
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

    console.log('📋 エクスポートディレクトリ:', exportsDir);
    console.log('📋 ディレクトリ存在:', fs.existsSync(exportsDir));

    let chatExports: any[] = [];
    if (fs.existsSync(exportsDir)) {
      // 再帰的にJSONファイルを検索する関数
      const findJsonFiles = (
        dir: string,
        baseDir: string = exportsDir
      ): any[] => {
        const files: any[] = [];
        const items = fs.readdirSync(dir);

        console.log('📋 ディレクトリ内容:', dir, items);

        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stats = fs.statSync(itemPath);

          if (stats.isDirectory()) {
            // サブディレクトリを再帰的に検索
            files.push(...findJsonFiles(itemPath, baseDir));
          } else if (item.endsWith('.json')) {
            try {
              console.log('📋 JSONファイル読み込み:', itemPath);
              const content = fs.readFileSync(itemPath, 'utf8');
              const data = JSON.parse(content);

              console.log('📋 ファイル内容サンプル:', {
                chatId: data.chatId,
                machineTypeName: data.chatData?.machineInfo?.machineTypeName,
                machineNumber: data.chatData?.machineInfo?.machineNumber,
                messageCount: data.chatData?.messages?.length,
                firstMessage: data.chatData?.messages?.[0]?.content?.substring(
                  0,
                  50
                ),
              });

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
                // 新しいフォーマットのデータを優先的に使用
                machineType:
                  data.machineType ||
                  data.chatData?.machineInfo?.machineTypeName ||
                  '',
                machineNumber:
                  data.machineNumber ||
                  data.chatData?.machineInfo?.machineNumber ||
                  '',
                machineInfo: data.chatData?.machineInfo || {
                  selectedMachineType: '',
                  selectedMachineNumber: '',
                  machineTypeName: data.machineType || '',
                  machineNumber: data.machineNumber || '',
                },
                // 新しいフォーマットのデータも含める
                title: data.title,
                problemDescription: data.problemDescription,
                extractedComponents: data.extractedComponents,
                extractedSymptoms: data.extractedSymptoms,
                possibleModels: data.possibleModels,
                conversationHistory: data.conversationHistory,
                metadata: data.metadata,
                chatData: data.chatData, // chatDataも含める
                savedImages: data.savedImages || [],
                fileSize: stats.size,
                lastModified: stats.mtime,
                createdAt: stats.mtime,
              });
            } catch (error) {
              console.warn(`JSONファイルの読み込みエラー: ${itemPath}`, error);
            }
          }
        }

        return files;
      };

      chatExports = findJsonFiles(exportsDir).sort(
        (a, b) =>
          new Date(b.exportTimestamp).getTime() -
          new Date(a.exportTimestamp).getTime()
      );

      console.log('📋 読み込み完了:', chatExports.length, '件');

      // 機種・機械番号データの確認
      chatExports.forEach((item, index) => {
        console.log(`📋 アイテム ${index + 1}:`, {
          fileName: item.fileName,
          machineType: item.machineType,
          machineNumber: item.machineNumber,
          machineInfo: item.machineInfo,
        });
      });
    }

    // フィルタリングを適用
    let filteredExports = chatExports;

    console.log('📋 フィルタリング前の件数:', filteredExports.length);

    if (machineType && typeof machineType === 'string') {
      console.log('📋 機種フィルター適用:', machineType);
      filteredExports = filteredExports.filter(item => {
        // 新しいフォーマットと従来のフォーマットの両方に対応
        const itemMachineType =
          item.machineType ||
          item.originalChatData?.machineInfo?.machineTypeName ||
          item.machineInfo?.machineTypeName ||
          '';
        console.log(
          `📋 機種フィルター対象: ${item.fileName} -> ${itemMachineType}`
        );
        return itemMachineType
          .toLowerCase()
          .includes(machineType.toLowerCase());
      });
      console.log('📋 機種フィルター後の件数:', filteredExports.length);
    }

    if (machineNumber && typeof machineNumber === 'string') {
      console.log('📋 機械番号フィルター適用:', machineNumber);
      filteredExports = filteredExports.filter(item => {
        // 新しいフォーマットと従来のフォーマットの両方に対応
        const itemMachineNumber =
          item.machineNumber ||
          item.originalChatData?.machineInfo?.machineNumber ||
          item.machineInfo?.machineNumber ||
          '';
        console.log(
          `📋 機械番号フィルター対象: ${item.fileName} -> ${itemMachineNumber}`
        );
        return itemMachineNumber
          .toLowerCase()
          .includes(machineNumber.toLowerCase());
      });
      console.log('📋 機械番号フィルター後の件数:', filteredExports.length);
    }

    if (searchText && typeof searchText === 'string') {
      console.log('📋 テキスト検索適用:', searchText);
      filteredExports = filteredExports.filter(item => {
        // 新しいフォーマットと従来のフォーマットの両方に対応
        const searchableText = [
          item.fileName,
          item.exportType,
          item.title || item.question || '',
          item.problemDescription || item.answer || '',
          item.machineType ||
            item.originalChatData?.machineInfo?.machineTypeName ||
            item.machineInfo?.machineTypeName ||
            '',
          item.machineNumber ||
            item.originalChatData?.machineInfo?.machineNumber ||
            item.machineInfo?.machineNumber ||
            '',
          // 新しいフォーマットの抽出情報も検索対象に含める
          ...(item.extractedComponents || []),
          ...(item.extractedSymptoms || []),
          ...(item.possibleModels || []),
          // 従来のメッセージ内容も検索対象に含める
          ...(item.chatData?.messages?.map((msg: any) => msg.content) || []),
          // 新しいフォーマットの会話履歴も検索対象に含める
          ...(item.conversationHistory?.map((msg: any) => msg.content) || []),
        ]
          .join(' ')
          .toLowerCase();

        console.log('📋 検索対象アイテム:', {
          fileName: item.fileName,
          title: item.title || item.question,
          problemDescription: item.problemDescription || item.answer,
          machineType:
            item.machineType ||
            item.originalChatData?.machineInfo?.machineTypeName ||
            item.machineInfo?.machineTypeName,
          machineNumber:
            item.machineNumber ||
            item.originalChatData?.machineInfo?.machineNumber ||
            item.machineInfo?.machineNumber,
          extractedComponents: item.extractedComponents,
          extractedSymptoms: item.extractedSymptoms,
        });

        console.log('📋 検索対象テキスト:', searchableText);
        console.log('📋 検索キーワード:', (searchText as string).toLowerCase());

        const match = searchableText.includes(
          (searchText as string).toLowerCase()
        );
        console.log('📋 マッチ結果:', match);

        return match;
      });
      console.log('📋 テキスト検索後の件数:', filteredExports.length);
    }

    if (searchDate) {
      console.log('📋 日付フィルター適用:', searchDate);
      const searchDateObj = new Date(searchDate as string);
      const nextDay = new Date(searchDateObj);
      nextDay.setDate(nextDay.getDate() + 1);

      filteredExports = filteredExports.filter(item => {
        const itemDate = new Date(item.exportTimestamp);
        const match = itemDate >= searchDateObj && itemDate < nextDay;
        console.log('📋 日付マッチ:', item.exportTimestamp, '→', match);
        return match;
      });
      console.log('📋 日付フィルター後の件数:', filteredExports.length);
    }

    // ページネーションを適用
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    const paginatedExports = filteredExports.slice(
      offsetNum,
      offsetNum + limitNum
    );

    console.log('📋 チャットエクスポート一覧:', {
      total: filteredExports.length,
      filtered: paginatedExports.length,
      limit: limitNum,
      offset: offsetNum,
    });

    res.json({
      success: true,
      items: paginatedExports,
      total: filteredExports.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ 履歴一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '履歴一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
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
router.delete('/:sessionId', async (_req, res) => {
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
 * 履歴アイテムの更新（JSONファイルに差分で上書き保存）
 */
router.put('/update-item/:id', async (_req, res) => {
  try {
    const { id } = req.params;
    const { updatedData, updatedBy = 'user' } = req.body;

    console.log('📝 履歴アイテム更新リクエスト:', {
      id,
      updatedDataType: typeof updatedData,
      updatedDataKeys: updatedData ? Object.keys(updatedData) : [],
      updatedBy,
    });

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

    // 元のJSONファイルを検索
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
        console.log('🔄 代替パスを使用:', alternativePath);
      }
    }

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
        exportsDir,
        filesFound: files.length,
        jsonFiles: files.filter(f => f.endsWith('.json')).length,
      });

      return res.status(404).json({
        error: '対象の履歴ファイルが見つかりません',
        id: id,
        searchedDirectory: exportsDir,
        availableFiles: files.filter(f => f.endsWith('.json')),
      });
    }

    // 差分を適用して更新（深いマージ）
    const mergeData = (original: any, updates: any): any => {
      const result = { ...original };

      for (const [key, value] of Object.entries(updates)) {
        if (
          value !== null &&
          typeof value === 'object' &&
          !Array.isArray(value)
        ) {
          // オブジェクトの場合は再帰的にマージ
          result[key] = mergeData(result[key] || {}, value);
        } else {
          // プリミティブ値や配列は直接代入
          result[key] = value;
        }
      }

      return result;
    };

    const updatedJsonData = mergeData(originalData, {
      ...updatedData,
      lastModified: new Date().toISOString(),
      // 更新履歴を追加
      updateHistory: [
        ...(originalData.updateHistory || []),
        {
          timestamp: new Date().toISOString(),
          updatedFields: Object.keys(updatedData),
          updatedBy: updatedBy,
        },
      ],
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

    if (!fs.existsSync(exportsDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(exportsDir);
    const exportFiles = files
      .filter(file => file.endsWith('.json'))
      .filter(file => !file.includes('.backup.')) // バックアップファイルを除外
      .filter(file => !file.startsWith('test-backup-')) // テストファイルを除外
      .map(file => {
        const filePath = path.join(exportsDir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);
          return {
            fileName: file,
            filePath: filePath,
            chatId: data.chatId || data.id || 'unknown',
            title: data.title || data.problemDescription || 'タイトルなし',
            createdAt:
              data.createdAt ||
              data.exportTimestamp ||
              new Date().toISOString(),
            lastModified: fs.statSync(filePath).mtime.toISOString(),
            size: fs.statSync(filePath).size,
          };
        } catch (error) {
          console.warn(`ファイル読み込みエラー: ${filePath}`, error);
          return null;
        }
      })
      .filter(item => item !== null);

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

export { router as historyRouter };
