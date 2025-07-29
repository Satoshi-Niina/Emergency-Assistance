
import express from 'express';
import { db } from '../db/schema.js';
import { historyItems, historyImages } from '../db/schema.js';
import { eq, like, and, gte, desc } from 'drizzle-orm';
import { z } from 'zod';

const router = express.Router();

// 履歴検索用スキーマ
const historyQuerySchema = z.object({
  query: z.string().optional(),
  machineModel: z.string().optional(),
  office: z.string().optional(),
  category: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0)
});

// 履歴一覧取得
router.get('/list', async (req, res) => {
  try {
    const query = historyQuerySchema.parse(req.query);
    
    // 基本クエリ構築
    let whereConditions = [];
    
    // テキスト検索
    if (query.query) {
      whereConditions.push(
        // TODO: 実際のデータベースに応じて検索条件を調整
        // or(
        //   like(historyItems.title, `%${query.query}%`),
        //   like(historyItems.description, `%${query.query}%`),
        //   like(historyItems.machineModel, `%${query.query}%`),
        //   like(historyItems.office, `%${query.query}%`),
        //   like(historyItems.emergencyGuideContent, `%${query.query}%`)
        // )
      );
    }
    
    // 機種フィルタ
    if (query.machineModel) {
      whereConditions.push(eq(historyItems.machineModel, query.machineModel));
    }
    
    // 事業所フィルタ
    if (query.office) {
      whereConditions.push(eq(historyItems.office, query.office));
    }
    
    // カテゴリフィルタ
    if (query.category) {
      whereConditions.push(eq(historyItems.category, query.category));
    }
    
    // 日付範囲フィルタ
    if (query.dateFrom) {
      whereConditions.push(gte(historyItems.createdAt, new Date(query.dateFrom)));
    }
    
    if (query.dateTo) {
      whereConditions.push(gte(new Date(query.dateTo), historyItems.createdAt));
    }
    
    // TODO: 実際のデータベース操作
    // const results = await db
    //   .select({
    //     id: historyItems.id,
    //     chatId: historyItems.chatId,
    //     title: historyItems.title,
    //     description: historyItems.description,
    //     machineModel: historyItems.machineModel,
    //     office: historyItems.office,
    //     category: historyItems.category,
    //     emergencyGuideTitle: historyItems.emergencyGuideTitle,
    //     emergencyGuideContent: historyItems.emergencyGuideContent,
    //     keywords: historyItems.keywords,
    //     createdAt: historyItems.createdAt,
    //     updatedAt: historyItems.updatedAt
    //   })
    //   .from(historyItems)
    //   .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    //   .orderBy(desc(historyItems.createdAt))
    //   .limit(query.limit)
    //   .offset(query.offset);

    // 仮のレスポンス（後で実際のデータベース操作に置き換え）
    const mockResults = [
      {
        id: '1',
        chatId: 'chat-001',
        title: 'エンジン停止トラブル',
        description: '走行中に突然エンジンが停止した',
        machineModel: 'MT-100',
        office: '東京事業所',
        category: 'エンジン',
        emergencyGuideTitle: 'エンジン停止対応',
        emergencyGuideContent: '燃料カットレバーの確認を行う',
        keywords: ['エンジン停止', '燃料カット', 'MT-100'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // 各履歴項目に関連する画像を取得
    // TODO: 実際の画像取得処理
    const resultsWithImages = await Promise.all(
      mockResults.map(async (item) => {
        // const images = await db
        //   .select()
        //   .from(historyImages)
        //   .where(eq(historyImages.historyItemId, item.id));
        
        const mockImages = [
          {
            id: 'img1',
            url: '/knowledge-base/images/emergency-flow-step1.jpg',
            description: 'エンジンルーム'
          }
        ];
        
        return {
          ...item,
          images: mockImages
        };
      })
    );

    res.json({
      items: resultsWithImages,
      total: resultsWithImages.length,
      hasMore: false
    });

  } catch (error) {
    console.error('履歴取得エラー:', error);
    res.status(500).json({ error: '履歴の取得に失敗しました' });
  }
});

// 履歴詳細取得
router.get('/item/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // TODO: 実際のデータベース操作
    // const historyItem = await db
    //   .select()
    //   .from(historyItems)
    //   .where(eq(historyItems.id, id))
    //   .limit(1);
    
    // if (historyItem.length === 0) {
    //   return res.status(404).json({ error: '履歴が見つかりません' });
    // }
    
    // const images = await db
    //   .select()
    //   .from(historyImages)
    //   .where(eq(historyImages.historyItemId, id));

    // 仮のレスポンス
    const mockItem = {
      id: id,
      chatId: 'chat-001',
      title: 'エンジン停止トラブル',
      description: '走行中に突然エンジンが停止した',
      machineModel: 'MT-100',
      office: '東京事業所',
      category: 'エンジン',
      emergencyGuideTitle: 'エンジン停止対応',
      emergencyGuideContent: '燃料カットレバーの確認を行う',
      keywords: ['エンジン停止', '燃料カット', 'MT-100'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      images: [
        {
          id: 'img1',
          url: '/knowledge-base/images/emergency-flow-step1.jpg',
          description: 'エンジンルーム'
        }
      ]
    };

    res.json(mockItem);

  } catch (error) {
    console.error('履歴詳細取得エラー:', error);
    res.status(500).json({ error: '履歴詳細の取得に失敗しました' });
  }
});

// 履歴項目の作成（チャットから呼び出される）
router.post('/create', async (req, res) => {
  try {
    const createSchema = z.object({
      chatId: z.string(),
      title: z.string(),
      description: z.string(),
      machineModel: z.string().optional(),
      office: z.string().optional(),
      category: z.string().optional(),
      emergencyGuideTitle: z.string().optional(),
      emergencyGuideContent: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      images: z.array(z.object({
        url: z.string(),
        description: z.string().optional()
      })).optional()
    });

    const data = createSchema.parse(req.body);

    // TODO: 実際のデータベース操作
    // const newHistoryItem = await db
    //   .insert(historyItems)
    //   .values({
    //     chatId: data.chatId,
    //     title: data.title,
    //     description: data.description,
    //     machineModel: data.machineModel,
    //     office: data.office,
    //     category: data.category,
    //     emergencyGuideTitle: data.emergencyGuideTitle,
    //     emergencyGuideContent: data.emergencyGuideContent,
    //     keywords: data.keywords,
    //   })
    //   .returning();

    // if (data.images && data.images.length > 0) {
    //   await db
    //     .insert(historyImages)
    //     .values(
    //       data.images.map(image => ({
    //         historyItemId: newHistoryItem[0].id,
    //         url: image.url,
    //         description: image.description
    //       }))
    //     );
    // }

    // 仮のレスポンス
    const mockResponse = {
      id: 'new-history-id',
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    res.status(201).json(mockResponse);

  } catch (error) {
    console.error('履歴作成エラー:', error);
    res.status(500).json({ error: '履歴の作成に失敗しました' });
  }
});

// 統計情報取得
router.get('/stats', async (req, res) => {
  try {
    // TODO: 実際の統計情報取得
    // const totalCount = await db
    //   .select({ count: count() })
    //   .from(historyItems);
    
    // const categoryStats = await db
    //   .select({
    //     category: historyItems.category,
    //     count: count()
    //   })
    //   .from(historyItems)
    //   .groupBy(historyItems.category);
    
    // const machineModelStats = await db
    //   .select({
    //     machineModel: historyItems.machineModel,
    //     count: count()
    //   })
    //   .from(historyItems)
    //   .groupBy(historyItems.machineModel);

    // 仮の統計情報
    const mockStats = {
      total: 150,
      categories: [
        { category: 'エンジン', count: 45 },
        { category: 'ブレーキ', count: 32 },
        { category: '電気系統', count: 28 },
        { category: '油圧系統', count: 25 },
        { category: 'その他', count: 20 }
      ],
      machineModels: [
        { machineModel: 'MT-100', count: 40 },
        { machineModel: 'MR-400', count: 35 },
        { machineModel: 'TC-250', count: 30 },
        { machineModel: 'SS-750', count: 25 },
        { machineModel: 'その他', count: 20 }
      ],
      offices: [
        { office: '東京事業所', count: 45 },
        { office: '大阪事業所', count: 35 },
        { office: '名古屋事業所', count: 30 },
        { office: '福岡事業所', count: 25 },
        { office: 'その他', count: 15 }
      ]
    };

    res.json(mockStats);

  } catch (error) {
    console.error('統計情報取得エラー:', error);
    res.status(500).json({ error: '統計情報の取得に失敗しました' });
  }
});

export { router as historyRouter };
