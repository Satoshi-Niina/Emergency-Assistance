import express from 'express';
import { db } from '../db/index.js';
import { supportHistory, machineTypes, machines } from '../db/schema.js';
import { eq, like, and, gte, desc, ilike } from 'drizzle-orm';
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
    // 履歴データから機種一覧を取得
    const machineTypesResult = await db
      .select({
        machineType: supportHistory.machineType
      })
      .from(supportHistory)
      .groupBy(supportHistory.machineType)
      .orderBy(supportHistory.machineType);

    // 履歴データから機械番号一覧を取得
    const machinesResult = await db
      .select({
        machineNumber: supportHistory.machineNumber,
        machineType: supportHistory.machineType
      })
      .from(supportHistory)
      .groupBy(supportHistory.machineNumber, supportHistory.machineType)
      .orderBy(supportHistory.machineNumber);

    // データ形式を統一
    const machineTypes = machineTypesResult.map((item, index) => ({
      id: `type_${index}`,
      machineTypeName: item.machineType
    }));

    const machines = machinesResult.map((item, index) => ({
      id: `machine_${index}`,
      machineNumber: item.machineNumber,
      machineTypeName: item.machineType
    }));

    res.json({
      machineTypes,
      machines
    });

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
    
    // 機種フィルタ（JSONデータ内の部分一致検索）
    if (query.machineType) {
      whereConditions.push(ilike(supportHistory.jsonData, `%${query.machineType}%`));
    }
    
    // 機械番号フィルタ（JSONデータ内の部分一致検索）
    if (query.machineNumber) {
      whereConditions.push(ilike(supportHistory.jsonData, `%${query.machineNumber}%`));
    }
    
    // テキスト検索（JSONデータ内の任意のテキスト検索）
    if (query.searchText) {
      whereConditions.push(ilike(supportHistory.jsonData, `%${query.searchText}%`));
    }
    
    // 日付検索
    if (query.searchDate) {
      const searchDate = new Date(query.searchDate);
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      whereConditions.push(
        and(
          gte(supportHistory.createdAt, searchDate),
          gte(nextDay, supportHistory.createdAt)
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
      threshold: 0.4,
      includeScore: true,
      ignoreLocation: true,
      useExtendedSearch: true
    });

    const searchResults = fuse.search(searchText).slice(0, limit);
    
    const results = searchResults.map(result => ({
      ...result.item,
      score: result.score
    }));

    res.json({
      items: results,
      total: results.length,
      searchText
    });

  } catch (error) {
    console.error('高度な検索エラー:', error);
    res.status(500).json({ error: '検索に失敗しました' });
  }
});

export { router as supportHistoryRouter }; 