
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
    
    console.log('📋 エクスポートディレクトリ:', exportsDir);
    console.log('📋 ディレクトリ存在:', fs.existsSync(exportsDir));
    
    let chatExports: any[] = [];
    if (fs.existsSync(exportsDir)) {
      // 再帰的にJSONファイルを検索する関数
      const findJsonFiles = (dir: string, baseDir: string = exportsDir): any[] => {
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
                firstMessage: data.chatData?.messages?.[0]?.content?.substring(0, 50)
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
                machineType: data.machineType || data.chatData?.machineInfo?.machineTypeName || '',
                machineNumber: data.machineNumber || data.chatData?.machineInfo?.machineNumber || '',
                machineInfo: data.chatData?.machineInfo || {
                  selectedMachineType: '',
                  selectedMachineNumber: '',
                  machineTypeName: data.machineType || '',
                  machineNumber: data.machineNumber || ''
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
      
      console.log('📋 読み込み完了:', chatExports.length, '件');
      
      // 機種・機械番号データの確認
      chatExports.forEach((item, index) => {
        console.log(`📋 アイテム ${index + 1}:`, {
          fileName: item.fileName,
          machineType: item.machineType,
          machineNumber: item.machineNumber,
          machineInfo: item.machineInfo
        });
      });
    }

    // フィルタリングを適用
    let filteredExports = chatExports;
    
    console.log('📋 フィルタリング前の件数:', filteredExports.length);
    
    if (machineType) {
      console.log('📋 機種フィルター適用:', machineType);
      filteredExports = filteredExports.filter(item => {
        // 新しいフォーマットと従来のフォーマットの両方に対応
        const itemMachineType = item.machineType || item.originalChatData?.machineInfo?.machineTypeName || item.machineInfo?.machineTypeName || '';
        console.log(`📋 機種フィルター対象: ${item.fileName} -> ${itemMachineType}`);
        return itemMachineType.toLowerCase().includes(machineType.toLowerCase());
      });
      console.log('📋 機種フィルター後の件数:', filteredExports.length);
    }
    
    if (machineNumber) {
      console.log('📋 機械番号フィルター適用:', machineNumber);
      filteredExports = filteredExports.filter(item => {
        // 新しいフォーマットと従来のフォーマットの両方に対応
        const itemMachineNumber = item.machineNumber || item.originalChatData?.machineInfo?.machineNumber || item.machineInfo?.machineNumber || '';
        console.log(`📋 機械番号フィルター対象: ${item.fileName} -> ${itemMachineNumber}`);
        return itemMachineNumber.toLowerCase().includes(machineNumber.toLowerCase());
      });
      console.log('📋 機械番号フィルター後の件数:', filteredExports.length);
    }
    
    if (searchText) {
      console.log('📋 テキスト検索適用:', searchText);
      filteredExports = filteredExports.filter(item => {
        // 新しいフォーマットと従来のフォーマットの両方に対応
        const searchableText = [
          item.fileName,
          item.exportType,
          item.title || item.question || '',
          item.problemDescription || item.answer || '',
          item.machineType || item.originalChatData?.machineInfo?.machineTypeName || item.machineInfo?.machineTypeName || '',
          item.machineNumber || item.originalChatData?.machineInfo?.machineNumber || item.machineInfo?.machineNumber || '',
          // 新しいフォーマットの抽出情報も検索対象に含める
          ...(item.extractedComponents || []),
          ...(item.extractedSymptoms || []),
          ...(item.possibleModels || []),
          // 従来のメッセージ内容も検索対象に含める
          ...(item.chatData?.messages?.map((msg: any) => msg.content) || []),
          // 新しいフォーマットの会話履歴も検索対象に含める
          ...(item.conversationHistory?.map((msg: any) => msg.content) || [])
        ].join(' ').toLowerCase();
        
        console.log('📋 検索対象アイテム:', {
          fileName: item.fileName,
          title: item.title || item.question,
          problemDescription: item.problemDescription || item.answer,
          machineType: item.machineType || item.originalChatData?.machineInfo?.machineTypeName || item.machineInfo?.machineTypeName,
          machineNumber: item.machineNumber || item.originalChatData?.machineInfo?.machineNumber || item.machineInfo?.machineNumber,
          extractedComponents: item.extractedComponents,
          extractedSymptoms: item.extractedSymptoms
        });
        
        console.log('📋 検索対象テキスト:', searchableText);
        console.log('📋 検索キーワード:', searchText.toLowerCase());
        
        const match = searchableText.includes(searchText.toLowerCase());
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

    // knowledge-base/exportsのJSONファイルから機種・機械番号データを取得
    const exportsDir = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
    
    if (!fs.existsSync(exportsDir)) {
      console.log('📋 エクスポートディレクトリが存在しません:', exportsDir);
      return res.json({
        machineTypes: [],
        machines: []
      });
    }

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
              fileName: relativePath,
              filePath: itemPath,
              data: data
            });
          } catch (error) {
            console.warn(`JSONファイルの読み込みエラー: ${itemPath}`, error);
          }
        }
      }
      
      return files;
    };

    const jsonFiles = findJsonFiles(exportsDir);
    console.log('📋 検索されたJSONファイル数:', jsonFiles.length);

    // 機種一覧を構築（重複除去）
    const machineTypeSet = new Set<string>();
    const machineTypes: Array<{ id: string; machineTypeName: string }> = [];
    
    // 機械番号一覧を構築（重複除去）
    const machineSet = new Set<string>();
    const machines: Array<{ id: string; machineNumber: string; machineTypeName: string }> = [];
    
    jsonFiles.forEach((file, index) => {
      const data = file.data;
      
      console.log(`📋 ファイル ${file.fileName} のデータ構造:`, {
        hasMachineType: !!data?.machineType,
        machineType: data?.machineType,
        hasMachineNumber: !!data?.machineNumber,
        machineNumber: data?.machineNumber,
        hasChatData: !!data?.chatData,
        hasMachineInfo: !!data?.chatData?.machineInfo
      });
      
      // 新しいフォーマットと従来フォーマットの両方に対応
      let machineTypeName = '';
      let machineNumber = '';
      
      // 新しいフォーマットから取得
      if (data?.machineType) {
        machineTypeName = data.machineType;
        console.log(`📋 新しいフォーマットから機種取得: ${machineTypeName}`);
      } else if (data?.originalChatData?.machineInfo?.machineTypeName) {
        machineTypeName = data.originalChatData.machineInfo.machineTypeName;
        console.log(`📋 originalChatDataから機種取得: ${machineTypeName}`);
      } else if (data?.chatData?.machineInfo?.machineTypeName) {
        machineTypeName = data.chatData.machineInfo.machineTypeName;
        console.log(`📋 従来フォーマットから機種取得: ${machineTypeName}`);
      }
      
      if (data?.machineNumber) {
        machineNumber = data.machineNumber;
        console.log(`📋 新しいフォーマットから機械番号取得: ${machineNumber}`);
      } else if (data?.originalChatData?.machineInfo?.machineNumber) {
        machineNumber = data.originalChatData.machineInfo.machineNumber;
        console.log(`📋 originalChatDataから機械番号取得: ${machineNumber}`);
      } else if (data?.chatData?.machineInfo?.machineNumber) {
        machineNumber = data.chatData.machineInfo.machineNumber;
        console.log(`📋 従来フォーマットから機械番号取得: ${machineNumber}`);
      }
      
      // 機種データを追加
      if (machineTypeName && !machineTypeSet.has(machineTypeName)) {
        machineTypeSet.add(machineTypeName);
        machineTypes.push({
          id: `type_${index}`,
          machineTypeName: machineTypeName
        });
        console.log(`📋 機種データ追加: ${machineTypeName}`);
      }
      
      // 機械番号データを追加
      if (machineNumber && machineTypeName) {
        const key = `${machineNumber}_${machineTypeName}`;
        if (!machineSet.has(key)) {
          machineSet.add(key);
          machines.push({
            id: `machine_${index}`,
            machineNumber: machineNumber,
            machineTypeName: machineTypeName
          });
          console.log(`📋 機械番号データ追加: ${machineNumber} (${machineTypeName})`);
        }
      }
    });

    const result = {
      machineTypes,
      machines
    };

    console.log('📋 機種・機械番号データ取得結果:', {
      machineTypes: machineTypes.length,
      machines: machines.length,
      sampleMachineTypes: machineTypes.slice(0, 3),
      sampleMachines: machines.slice(0, 3)
    });

    res.json({
      success: true,
      ...result
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
 * GET /api/history/export-history
 * エクスポート履歴一覧を取得
 */
router.get('/export-history', async (req, res) => {
  try {
    console.log('📋 エクスポート履歴取得リクエスト');

    // エクスポートディレクトリから履歴を取得
    const exportsDir = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
    
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
              recordCount: data.chatData?.messages?.length || 0
            };
          } catch (error) {
            console.warn(`エクスポートファイルの読み込みエラー: ${filePath}`, error);
            return {
              id: `export_${file.replace('.json', '')}`,
              filename: file,
              format: 'json' as const,
              exportedAt: stats.mtime.toISOString(),
              fileSize: stats.size,
              recordCount: 0
            };
          }
        })
        .sort((a, b) => new Date(b.exportedAt).getTime() - new Date(a.exportedAt).getTime());
    }

    console.log(`📋 エクスポート履歴取得完了: ${exportHistory.length}件`);

    res.json(exportHistory);

  } catch (error) {
    console.error('❌ エクスポート履歴取得エラー:', error);
    res.status(500).json({
      error: 'エクスポート履歴の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/history/export-selected
 * 選択された履歴を一括エクスポート
 */
router.post('/export-selected', async (req, res) => {
  try {
    const { ids, format = 'json' } = req.body;
    console.log(`📋 選択履歴エクスポートリクエスト: ${ids?.length || 0}件, 形式: ${format}`);

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: 'エクスポートする履歴IDが指定されていません'
      });
    }

    // 選択された履歴を取得
    const selectedHistory = await Promise.all(
      ids.map(async (id) => {
        try {
          const response = await fetch(`${req.protocol}://${req.get('host')}/api/history/${id}`);
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
        error: '有効な履歴が見つかりません'
      });
    }

    let exportData: string;
    let contentType: string;
    let filename: string;

    if (format === 'csv') {
      // CSV形式でエクスポート
      const csvData = validHistory.map((item, index) => ({
        'No.': index + 1,
        '機種': item.machineType || '',
        '機械番号': item.machineNumber || '',
        '作成日時': new Date(item.createdAt).toLocaleString('ja-JP'),
        'JSONデータ': JSON.stringify(item.jsonData)
      }));

      const csvContent = [
        'No.,機種,機械番号,作成日時,JSONデータ',
        ...csvData.map(row => 
          `${row['No.']},"${row['機種']}","${row['機械番号']}","${row['作成日時']}","${row['JSONデータ']}"`
        )
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
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/history/export-all
 * 全履歴をエクスポート
 */
router.get('/export-all', async (req, res) => {
  try {
    const { format = 'json', machineType, machineNumber } = req.query;
    console.log(`📋 全履歴エクスポートリクエスト: 形式: ${format}`);

    // フィルター条件を適用して履歴を取得
    const exportsDir = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
    
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
      allHistory = allHistory.filter(item => 
        item.chatData?.machineInfo?.machineTypeName?.includes(machineType) ||
        item.chatData?.machineInfo?.selectedMachineType?.includes(machineType)
      );
    }

    if (machineNumber) {
      allHistory = allHistory.filter(item => 
        item.chatData?.machineInfo?.machineNumber?.includes(machineNumber) ||
        item.chatData?.machineInfo?.selectedMachineNumber?.includes(machineNumber)
      );
    }

    let exportData: string;
    let contentType: string;
    let filename: string;

    if (format === 'csv') {
      // CSV形式でエクスポート
      const csvData = allHistory.map((item, index) => ({
        'No.': index + 1,
        'チャットID': item.chatId || '',
        'ユーザーID': item.userId || '',
        '機種': item.chatData?.machineInfo?.machineTypeName || '',
        '機械番号': item.chatData?.machineInfo?.machineNumber || '',
        'エクスポート日時': new Date(item.exportTimestamp).toLocaleString('ja-JP'),
        'メッセージ数': item.chatData?.messages?.length || 0
      }));

      const csvContent = [
        'No.,チャットID,ユーザーID,機種,機械番号,エクスポート日時,メッセージ数',
        ...csvData.map(row => 
          `${row['No.']},"${row['チャットID']}","${row['ユーザーID']}","${row['機種']}","${row['機械番号']}","${row['エクスポート日時']}","${row['メッセージ数']}"`
        )
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
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/history/advanced-search
 * 高度なテキスト検索
 */
router.post('/advanced-search', async (req, res) => {
  try {
    const { searchText, limit = 50 } = req.body;
    console.log(`📋 高度な検索リクエスト: "${searchText}", 制限: ${limit}`);

    if (!searchText) {
      return res.status(400).json({
        error: '検索テキストが必要です'
      });
    }

    // エクスポートディレクトリから履歴を検索
    const exportsDir = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
    
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
                matchScore: contentStr.split(searchLower).length - 1 // マッチ回数
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
      searchTerms: searchText.split(/\s+/).filter(term => term.length > 0)
    });

  } catch (error) {
    console.error('❌ 高度な検索エラー:', error);
    res.status(500).json({
      error: '高度な検索に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/history/generate-report
 * レポート生成
 */
router.post('/generate-report', async (req, res) => {
  try {
    const { searchFilters, reportTitle, reportDescription } = req.body;
    console.log('📋 レポート生成リクエスト:', { searchFilters, reportTitle });

    // フィルター条件を適用して履歴を取得
    const exportsDir = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
    
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
          reportData = reportData.filter(item => 
            item.machineType?.includes(searchFilters.machineType) ||
            item.originalChatData?.machineInfo?.machineTypeName?.includes(searchFilters.machineType) ||
            item.chatData?.machineInfo?.machineTypeName?.includes(searchFilters.machineType) ||
            item.chatData?.machineInfo?.selectedMachineType?.includes(searchFilters.machineType)
          );
        }

        if (searchFilters.machineNumber) {
          reportData = reportData.filter(item => 
            item.machineNumber?.includes(searchFilters.machineNumber) ||
            item.originalChatData?.machineInfo?.machineNumber?.includes(searchFilters.machineNumber) ||
            item.chatData?.machineInfo?.machineNumber?.includes(searchFilters.machineNumber) ||
            item.chatData?.machineInfo?.selectedMachineNumber?.includes(searchFilters.machineNumber)
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
        machineType: item.machineType || item.originalChatData?.machineInfo?.machineTypeName || item.chatData?.machineInfo?.machineTypeName || '',
        machineNumber: item.machineNumber || item.originalChatData?.machineInfo?.machineNumber || item.chatData?.machineInfo?.machineNumber || '',
        exportTimestamp: item.exportTimestamp,
        messageCount: item.chatData?.messages?.length || 0
      }))
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
