import express from 'express';
import { db } from '../db/index.js';
import { supportHistory, machineTypes, machines } from '../db/schema.js';
import { eq, like, and, gte, lte, desc, ilike, or } from 'drizzle-orm';
import { z } from 'zod';
import { upload } from '../lib/multer-config.js';
import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import Fuse from 'fuse.js';

const router = express.Router();

// 履歴データから機種・機械番号一覧取得
router.get('/machine-data', async (req, res) => {
  try {
    console.log('🔍 機種・機械番号データ取得開始');
    
    // 履歴データから機種一覧を取得（データベースカラムとJSONデータの両方から）
    const machineTypesResult = await db
      .select({
        machineType: supportHistory.machineType,
        jsonData: supportHistory.jsonData
      })
      .from(supportHistory)
      .orderBy(supportHistory.createdAt);

    console.log('🔍 機種データ取得結果（DB）:', machineTypesResult.length, '件');

    // 履歴データから機械番号一覧を取得（データベースカラムとJSONデータの両方から）
    const machinesResult = await db
      .select({
        machineNumber: supportHistory.machineNumber,
        machineType: supportHistory.machineType,
        jsonData: supportHistory.jsonData
      })
      .from(supportHistory)
      .orderBy(supportHistory.createdAt);

    console.log('🔍 機械番号データ取得結果（DB）:', machinesResult.length, '件');

    // 機種一覧を構築（重複除去）
    const machineTypeSet = new Set<string>();
    const machineTypes: Array<{ id: string; machineTypeName: string }> = [];

    // データベースカラムから機種を取得
    machineTypesResult.forEach((item, index) => {
      if (item.machineType && !machineTypeSet.has(item.machineType)) {
        machineTypeSet.add(item.machineType);
        machineTypes.push({
          id: `type_db_${index}`,
          machineTypeName: item.machineType
        });
      }
    });

    // JSONデータから機種を取得
    machineTypesResult.forEach((item, index) => {
      try {
        const jsonData = typeof item.jsonData === 'string' ? JSON.parse(item.jsonData) : item.jsonData;
        if (jsonData.machineTypeName && !machineTypeSet.has(jsonData.machineTypeName)) {
          machineTypeSet.add(jsonData.machineTypeName);
          machineTypes.push({
            id: `type_json_${index}`,
            machineTypeName: jsonData.machineTypeName
          });
        }
      } catch (error) {
        // JSON解析エラーは無視
        console.log('🔍 JSON解析エラー（機種）:', error);
      }
    });

    // 機械番号一覧を構築（重複除去）
    const machineSet = new Set<string>();
    const machines: Array<{ id: string; machineNumber: string; machineTypeName: string }> = [];

    // データベースカラムから機械番号を取得
    machinesResult.forEach((item, index) => {
      const key = `${item.machineNumber}_${item.machineType}`;
      if (item.machineNumber && !machineSet.has(key)) {
        machineSet.add(key);
        machines.push({
          id: `machine_db_${index}`,
          machineNumber: item.machineNumber,
          machineTypeName: item.machineType
        });
      }
    });

    // JSONデータから機械番号を取得
    machinesResult.forEach((item, index) => {
      try {
        const jsonData = typeof item.jsonData === 'string' ? JSON.parse(item.jsonData) : item.jsonData;
        if (jsonData.machineNumber && jsonData.machineTypeName) {
          const key = `${jsonData.machineNumber}_${jsonData.machineTypeName}`;
          if (!machineSet.has(key)) {
            machineSet.add(key);
            machines.push({
              id: `machine_json_${index}`,
              machineNumber: jsonData.machineNumber,
              machineTypeName: jsonData.machineTypeName
            });
          }
        }
      } catch (error) {
        // JSON解析エラーは無視
        console.log('🔍 JSON解析エラー（機械番号）:', error);
      }
    });

    const result = {
      machineTypes,
      machines
    };

    console.log('🔍 最終結果:', {
      machineTypes: machineTypes.length,
      machines: machines.length,
      sampleMachineTypes: machineTypes.slice(0, 3),
      sampleMachines: machines.slice(0, 3)
    });

    res.json(result);

  } catch (error) {
    console.error('履歴データからの機種・機械番号データ取得エラー:', error);
    res.status(500).json({ error: '機種・機械番号データの取得に失敗しました' });
  }
});

// 履歴検索用スキーマ
const historyQuerySchema = z.object({
  machineType: z.string().optional(),
  machineNumber: z.string().optional(),
  searchText: z.string().optional(), // テキスト検索用
  searchDate: z.string().optional(), // 日付検索用
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0)
});

// 履歴一覧取得
router.get('/', async (req, res) => {
  try {
    const query = historyQuerySchema.parse(req.query);
    
    // 基本クエリ構築
    let whereConditions = [];
    
    // 機種フィルタ（データベースカラムとJSONデータの両方を検索）
    if (query.machineType) {
      whereConditions.push(
        or(
          ilike(supportHistory.machineType, `%${query.machineType}%`),
          ilike(supportHistory.jsonData, `%${query.machineType}%`)
        )
      );
    }
    
    // 機械番号フィルタ（データベースカラムとJSONデータの両方を検索）
    if (query.machineNumber) {
      whereConditions.push(
        or(
          ilike(supportHistory.machineNumber, `%${query.machineNumber}%`),
          ilike(supportHistory.jsonData, `%${query.machineNumber}%`)
        )
      );
    }
    
    // テキスト検索（JSONデータ内の任意のテキスト検索）
    if (query.searchText) {
      // 複数の検索条件を組み合わせてより詳細な検索を実行
      const searchTerms = query.searchText.split(/\s+/).filter(term => term.length > 0);
      
      if (searchTerms.length > 0) {
        const searchConditions = searchTerms.map(term => 
          ilike(supportHistory.jsonData, `%${term}%`)
        );
        whereConditions.push(and(...searchConditions));
      } else {
        whereConditions.push(ilike(supportHistory.jsonData, `%${query.searchText}%`));
      }
    }
    
    // 日付検索
    if (query.searchDate) {
      const searchDate = new Date(query.searchDate);
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      whereConditions.push(
        and(
          gte(supportHistory.createdAt, searchDate),
          lte(supportHistory.createdAt, nextDay)
        )
      );
    }
    
    // データベースから履歴を取得
    const results = await db
      .select({
        id: supportHistory.id,
        machineType: supportHistory.machineType,
        machineNumber: supportHistory.machineNumber,
        jsonData: supportHistory.jsonData,
        imagePath: supportHistory.imagePath,
        createdAt: supportHistory.createdAt
      })
      .from(supportHistory)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(supportHistory.createdAt))
      .limit(query.limit)
      .offset(query.offset);

    // 総件数を取得
    const totalCount = await db
      .select({ count: supportHistory.id })
      .from(supportHistory)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    res.json({
      items: results,
      total: totalCount.length,
      hasMore: results.length === query.limit
    });

  } catch (error) {
    console.error('履歴取得エラー:', error);
    res.status(500).json({ error: '履歴の取得に失敗しました' });
  }
});

// 履歴詳細取得
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const historyItem = await db
      .select()
      .from(supportHistory)
      .where(eq(supportHistory.id, id))
      .limit(1);
    
    if (historyItem.length === 0) {
      return res.status(404).json({ error: '履歴が見つかりません' });
    }

    res.json(historyItem[0]);

  } catch (error) {
    console.error('履歴詳細取得エラー:', error);
    res.status(500).json({ error: '履歴詳細の取得に失敗しました' });
  }
});

// 履歴作成（画像アップロード対応）
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const createSchema = z.object({
      machineType: z.string(),
      machineNumber: z.string(),
      jsonData: z.any() // JSONBデータ
    });

    const data = createSchema.parse(req.body);
    
    let imagePath = null;
    
    // 画像がアップロードされた場合の処理
    if (req.file) {
      const fileName = `support_history_${Date.now()}_${req.file.originalname}`;
      const uploadDir = path.join(process.cwd(), 'public', 'images', 'support-history');
      
      // ディレクトリが存在しない場合は作成
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const filePath = path.join(uploadDir, fileName);
      
      // ファイルを移動
      fs.renameSync(req.file.path, filePath);
      imagePath = `/images/support-history/${fileName}`;
    }

    // データベースに保存
    const newHistoryItem = await db
      .insert(supportHistory)
      .values({
        machineType: data.machineType,
        machineNumber: data.machineNumber,
        jsonData: data.jsonData,
        imagePath: imagePath
      })
      .returning();

    res.status(201).json(newHistoryItem[0]);

  } catch (error) {
    console.error('履歴作成エラー:', error);
    res.status(500).json({ error: '履歴の作成に失敗しました' });
  }
});

// 履歴削除
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 履歴項目を取得
    const historyItem = await db
      .select()
      .from(supportHistory)
      .where(eq(supportHistory.id, id))
      .limit(1);
    
    if (historyItem.length === 0) {
      return res.status(404).json({ error: '履歴が見つかりません' });
    }

    // 画像ファイルが存在する場合は削除
    if (historyItem[0].imagePath) {
      const imagePath = path.join(process.cwd(), 'public', historyItem[0].imagePath);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // データベースから削除
    await db
      .delete(supportHistory)
      .where(eq(supportHistory.id, id));

    res.json({ message: '履歴を削除しました' });

  } catch (error) {
    console.error('履歴削除エラー:', error);
    res.status(500).json({ error: '履歴の削除に失敗しました' });
  }
});

// PDFエクスポート
router.get('/:id/export-pdf', async (req, res) => {
  try {
    const { id } = req.params;
    
    const historyItem = await db
      .select()
      .from(supportHistory)
      .where(eq(supportHistory.id, id))
      .limit(1);
    
    if (historyItem.length === 0) {
      return res.status(404).json({ error: '履歴が見つかりません' });
    }

    const item = historyItem[0];
    
    // PDFドキュメントを作成
    const doc = new PDFDocument();
    
    // レスポンスヘッダーを設定
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="support_history_${item.machineType}_${item.machineNumber}.pdf"`);
    
    // PDFをレスポンスストリームにパイプ
    doc.pipe(res);
    
    // PDFの内容を作成
    doc.fontSize(20).text('応急処置サポート履歴', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(12).text(`機種: ${item.machineType}`);
    doc.text(`機械番号: ${item.machineNumber}`);
    doc.text(`作成日時: ${new Date(item.createdAt).toLocaleString('ja-JP')}`);
    doc.moveDown();
    
    doc.fontSize(14).text('データ内容:', { underline: true });
    doc.moveDown();
    
    // JSONデータを整形して表示
    const jsonString = JSON.stringify(item.jsonData, null, 2);
    doc.fontSize(10).text(jsonString, { align: 'left' });
    
    // 画像が存在する場合
    if (item.imagePath) {
      doc.moveDown();
      doc.fontSize(14).text('関連画像:', { underline: true });
      doc.moveDown();
      
      const imagePath = path.join(process.cwd(), 'public', item.imagePath);
      if (fs.existsSync(imagePath)) {
        try {
          doc.image(imagePath, { width: 300 });
        } catch (error) {
          doc.text('画像の読み込みに失敗しました');
        }
      } else {
        doc.text('画像ファイルが見つかりません');
      }
    }
    
    // PDFを終了
    doc.end();

  } catch (error) {
    console.error('PDFエクスポートエラー:', error);
    res.status(500).json({ error: 'PDFエクスポートに失敗しました' });
  }
});

// レポート生成機能
router.post('/generate-report', async (req, res) => {
  try {
    const { searchFilters, reportTitle, reportDescription } = req.body;
    
    // 検索条件に基づいて履歴を取得
    let whereConditions = [];
    
    if (searchFilters.machineType) {
      whereConditions.push(ilike(supportHistory.jsonData, `%${searchFilters.machineType}%`));
    }
    
    if (searchFilters.machineNumber) {
      whereConditions.push(ilike(supportHistory.jsonData, `%${searchFilters.machineNumber}%`));
    }
    
    if (searchFilters.searchText) {
      whereConditions.push(ilike(supportHistory.jsonData, `%${searchFilters.searchText}%`));
    }
    
    const results = await db
      .select({
        id: supportHistory.id,
        machineType: supportHistory.machineType,
        machineNumber: supportHistory.machineNumber,
        jsonData: supportHistory.jsonData,
        imagePath: supportHistory.imagePath,
        createdAt: supportHistory.createdAt
      })
      .from(supportHistory)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(supportHistory.createdAt));

    // レポートデータを構築
    const reportData = {
      title: reportTitle || '履歴検索レポート',
      description: reportDescription || '',
      generatedAt: new Date().toISOString(),
      searchFilters,
      totalCount: results.length,
      items: results.map(item => ({
        id: item.id,
        machineType: item.machineType,
        machineNumber: item.machineNumber,
        createdAt: item.createdAt,
        jsonData: item.jsonData,
        imagePath: item.imagePath
      }))
    };

    // PDFレポートを生成
    const doc = new PDFDocument();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="history_report_${new Date().toISOString().split('T')[0]}.pdf"`);
    
    doc.pipe(res);
    
    // レポートヘッダー
    doc.fontSize(24).text(reportData.title, { align: 'center' });
    doc.moveDown();
    
    if (reportData.description) {
      doc.fontSize(12).text(reportData.description, { align: 'center' });
      doc.moveDown();
    }
    
    doc.fontSize(10).text(`生成日時: ${new Date(reportData.generatedAt).toLocaleString('ja-JP')}`);
    doc.fontSize(10).text(`検索結果: ${reportData.totalCount}件`);
    doc.moveDown();
    
    // 検索条件
    doc.fontSize(14).text('検索条件:', { underline: true });
    doc.moveDown();
    if (searchFilters.machineType) doc.fontSize(10).text(`機種: ${searchFilters.machineType}`);
    if (searchFilters.machineNumber) doc.fontSize(10).text(`機械番号: ${searchFilters.machineNumber}`);
    if (searchFilters.searchText) doc.fontSize(10).text(`検索テキスト: ${searchFilters.searchText}`);
    doc.moveDown();
    
    // 検索結果一覧
    doc.fontSize(14).text('検索結果一覧:', { underline: true });
    doc.moveDown();
    
    reportData.items.forEach((item, index) => {
      doc.fontSize(12).text(`${index + 1}. ${item.machineType} - ${item.machineNumber}`, { underline: true });
      doc.fontSize(10).text(`作成日時: ${new Date(item.createdAt).toLocaleString('ja-JP')}`);
      
      // JSONデータの主要な情報を抽出
      try {
        const jsonData = typeof item.jsonData === 'string' ? JSON.parse(item.jsonData) : item.jsonData;
        if (jsonData.title) doc.fontSize(10).text(`タイトル: ${jsonData.title}`);
        if (jsonData.description) doc.fontSize(10).text(`説明: ${jsonData.description}`);
        if (jsonData.emergencyMeasures) doc.fontSize(10).text(`応急処置: ${jsonData.emergencyMeasures}`);
      } catch (error) {
        doc.fontSize(10).text('データ形式エラー');
      }
      
      doc.moveDown();
    });
    
    doc.end();

  } catch (error) {
    console.error('レポート生成エラー:', error);
    res.status(500).json({ error: 'レポート生成に失敗しました' });
  }
});

// 高度なテキスト検索機能
router.post('/advanced-search', async (req, res) => {
  try {
    const { searchText, limit = 50 } = req.body;
    
    if (!searchText) {
      return res.status(400).json({ error: '検索テキストが必要です' });
    }
    
    // 全履歴を取得
    const allHistory = await db
      .select({
        id: supportHistory.id,
        machineType: supportHistory.machineType,
        machineNumber: supportHistory.machineNumber,
        jsonData: supportHistory.jsonData,
        imagePath: supportHistory.imagePath,
        createdAt: supportHistory.createdAt
      })
      .from(supportHistory)
      .orderBy(desc(supportHistory.createdAt));

    // Fuse.jsで高度な検索を実行
    const fuse = new Fuse(allHistory, {
      keys: [
        { name: 'machineType', weight: 0.3 },
        { name: 'machineNumber', weight: 0.3 },
        { name: 'jsonData', weight: 1.0 }
      ],
      threshold: 0.3, // より厳密な検索
      includeScore: true,
      ignoreLocation: true,
      useExtendedSearch: true,
      minMatchCharLength: 1, // 1文字でもマッチ
      findAllMatches: true,
      shouldSort: true
    });

    // 検索テキストを分割して複数条件で検索
    const searchTerms = searchText.split(/\s+/).filter(term => term.length > 0);
    let searchResults = [];

    if (searchTerms.length > 1) {
      // 複数キーワードの場合、各キーワードで検索して結果を統合
      const allResults = new Map();
      
      searchTerms.forEach(term => {
        const termResults = fuse.search(term);
        termResults.forEach(result => {
          if (!allResults.has(result.item.id)) {
            allResults.set(result.item.id, { ...result.item, score: result.score });
          } else {
            // 既存の結果がある場合は、より良いスコアを採用
            const existing = allResults.get(result.item.id);
            if (result.score < existing.score) {
              allResults.set(result.item.id, { ...result.item, score: result.score });
            }
          }
        });
      });
      
      searchResults = Array.from(allResults.values());
    } else {
      // 単一キーワードの場合
      searchResults = fuse.search(searchText);
    }
    
    const results = searchResults
      .slice(0, limit)
      .map(result => ({
        ...result.item,
        score: result.score
      }));

    res.json({
      items: results,
      total: results.length,
      searchText,
      searchTerms: searchTerms
    });

  } catch (error) {
    console.error('高度な検索エラー:', error);
    res.status(500).json({ error: '検索に失敗しました' });
  }
});

export { router as supportHistoryRouter }; 