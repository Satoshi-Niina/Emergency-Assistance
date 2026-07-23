import { db } from '../db/index.js';
import { schema } from '../db/schema.js';
import { eq, desc, like, and, gte, lte } from 'drizzle-orm';

const { emergencyFlows } = schema;
import { z } from 'zod';

// バリデーションスキーマ
const createFlowSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().optional(),
  keyword: z.string().optional(),
  category: z.string().optional(),
  steps: z.array(z.any()).optional(),
  imagePath: z.string().optional(),
});

const searchFlowSchema = z.object({
  title: z.string().optional(),
  keyword: z.string().optional(),
  category: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export interface EmergencyFlow {
  id: string;
  title: string;
  description?: string;
  keyword?: string;
  category?: string;
  steps?: any[];
  imagePath?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface FlowSearchParams {
  title?: string;
  keyword?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

const isDefinedString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

export interface FlowSearchResult {
  items: EmergencyFlow[];
  total: number;
  page: number;
  totalPages: number;
}

export class KnowledgeService {
  /**
   * 応急処置フローを作成
   */
  static async createFlow(
    data: z.infer<typeof createFlowSchema>
  ): Promise<EmergencyFlow> {
    try {
      console.log('📋 新規応急処置フロー作成:', data);

      // バリデーション
      const validationResult = createFlowSchema.safeParse(data);
      if (!validationResult.success) {
        throw new Error(
          `バリデーションエラー: ${validationResult.error.errors.map(e => e.message).join(', ')}`
        );
      }

      const { title, description, keyword, category, steps, imagePath } =
        validationResult.data;

      // データベースに保存
      const newFlow = await db
        .insert(emergencyFlows)
        .values({
          title,
          description: description || null,
          keyword: keyword || null,
          category: category || null,
          steps: steps || [],
          imagePath: imagePath || null,
        })
        .returning();

      console.log('✅ 応急処置フロー作成完了:', newFlow[0].id);
      return newFlow[0];
    } catch (error) {
      console.error('❌ 応急処置フロー作成エラー:', error);
      throw error;
    }
  }

  /**
   * 応急処置フロー一覧を取得
   */
  static async getFlowList(
    params: FlowSearchParams
  ): Promise<FlowSearchResult> {
    try {
      console.log('📋 応急処置フロー一覧取得:', params);

      // バリデーション
      const validationResult = searchFlowSchema.safeParse(params);
      if (!validationResult.success) {
        throw new Error(
          `バリデーションエラー: ${validationResult.error.errors.map(e => e.message).join(', ')}`
        );
      }

      const {
        title,
        keyword,
        category,
        limit = 20,
        offset = 0,
      } = validationResult.data;

      // 検索条件を構築
      const conditions = [];
      if (title) {
        conditions.push(like(emergencyFlows.title, `%${title}%`));
      }
      if (keyword) {
        conditions.push(like(emergencyFlows.keyword, `%${keyword}%`));
      }
      if (category) {
        conditions.push(eq(emergencyFlows.category, category));
      }

      // データ取得
      const query = db
        .select({
          id: emergencyFlows.id,
          title: emergencyFlows.title,
          description: emergencyFlows.description,
          keyword: emergencyFlows.keyword,
          category: emergencyFlows.category,
          steps: emergencyFlows.steps,
          imagePath: emergencyFlows.imagePath,
          createdAt: emergencyFlows.createdAt,
          updatedAt: emergencyFlows.updatedAt,
        })
        .from(emergencyFlows);

      // 条件を適用
      if (conditions.length > 0) {
        query.where(and(...conditions));
      }

      // ページネーションとソート
      const items = await query
        .orderBy(desc(emergencyFlows.createdAt))
        .limit(limit)
        .offset(offset);

      // 総件数を取得
      const countQuery = db
        .select({ count: emergencyFlows.id })
        .from(emergencyFlows);
      if (conditions.length > 0) {
        countQuery.where(and(...conditions));
      }
      const countResult = await countQuery;
      const total = countResult.length;

      const page = Math.floor(offset / limit) + 1;
      const totalPages = Math.ceil(total / limit);

      console.log(
        `✅ 応急処置フロー取得完了: ${items.length}件 (全${total}件)`
      );

      return {
        items,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      console.error('❌ 応急処置フロー取得エラー:', error);
      throw error;
    }
  }

  /**
   * 特定の応急処置フローを取得
   */
  static async getFlowById(id: string): Promise<EmergencyFlow | null> {
    try {
      console.log(`📋 応急処置フロー詳細取得: ${id}`);

      const flowItem = await db
        .select({
          id: emergencyFlows.id,
          title: emergencyFlows.title,
          description: emergencyFlows.description,
          keyword: emergencyFlows.keyword,
          category: emergencyFlows.category,
          steps: emergencyFlows.steps,
          imagePath: emergencyFlows.imagePath,
          createdAt: emergencyFlows.createdAt,
          updatedAt: emergencyFlows.updatedAt,
        })
        .from(emergencyFlows)
        .where(eq(emergencyFlows.id, id))
        .limit(1);

      if (flowItem.length === 0) {
        console.log('⚠️  応急処置フローが見つかりません:', id);
        return null;
      }

      console.log('✅ 応急処置フロー詳細取得完了');
      return flowItem[0];
    } catch (error) {
      console.error('❌ 応急処置フロー詳細取得エラー:', error);
      throw error;
    }
  }

  /**
   * 応急処置フローを削除
   */
  static async deleteFlow(id: string): Promise<boolean> {
    try {
      console.log(`📋 応急処置フロー削除: ${id}`);

      const result = await db
        .delete(emergencyFlows)
        .where(eq(emergencyFlows.id, id))
        .returning();

      if (result.length === 0) {
        console.log('⚠️  削除対象の応急処置フローが見つかりません:', id);
        return false;
      }

      console.log('✅ 応急処置フロー削除完了:', id);
      return true;
    } catch (error) {
      console.error('❌ 応急処置フロー削除エラー:', error);
      throw error;
    }
  }

  /**
   * 応急処置フローを更新
   */
  static async updateFlow(
    id: string,
    data: Partial<z.infer<typeof createFlowSchema>>
  ): Promise<EmergencyFlow | null> {
    try {
      console.log(`📋 応急処置フロー更新: ${id}`, data);

      const result = await db
        .update(emergencyFlows)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(emergencyFlows.id, id))
        .returning();

      if (result.length === 0) {
        console.log('⚠️  更新対象の応急処置フローが見つかりません:', id);
        return null;
      }

      console.log('✅ 応急処置フロー更新完了:', id);
      return result[0] as any;
    } catch (error) {
      console.error('❌ 応急処置フロー更新エラー:', error);
      throw error;
    }
  }

  /**
   * カテゴリ一覧を取得
   */
  static async getCategories(): Promise<string[]> {
    try {
      console.log('📋 カテゴリ一覧取得');

      const categories = (await db
        .select({ category: emergencyFlows.category })
        .from(emergencyFlows)
      ) as Array<{ category: string | null }>;

      const uniqueCategories = Array.from(
        new Set(categories.map(c => c.category).filter(isDefinedString))
      );

      console.log('✅ カテゴリ一覧取得完了:', uniqueCategories.length + '件');
      return uniqueCategories;
    } catch (error) {
      console.error('❌ カテゴリ一覧取得エラー:', error);
      throw error;
    }
  }

  /**
   * キーワード検索
   */
  static async searchByKeyword(keyword: string): Promise<EmergencyFlow[]> {
    try {
      console.log(`📋 キーワード検索: ${keyword}`);

      const flows = await db
        .select({
          id: emergencyFlows.id,
          title: emergencyFlows.title,
          description: emergencyFlows.description,
          keyword: emergencyFlows.keyword,
          category: emergencyFlows.category,
          steps: emergencyFlows.steps,
          imagePath: emergencyFlows.imagePath,
          createdAt: emergencyFlows.createdAt,
          updatedAt: emergencyFlows.updatedAt,
        })
        .from(emergencyFlows)
        .where(like(emergencyFlows.keyword, `%${keyword}%`))
        .orderBy(desc(emergencyFlows.createdAt));

      console.log(`✅ キーワード検索完了: ${flows.length}件`);
      return flows;
    } catch (error) {
      console.error('❌ キーワード検索エラー:', error);
      throw error;
    }
  }

  /**
   * 統計情報を取得
   */
  static async getStatistics(): Promise<{
    totalCount: number;
    categoryCount: number;
    todayCount: number;
    thisWeekCount: number;
  }> {
    try {
      console.log('📋 ナレッジ統計情報取得');

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      // 総件数
      const totalResult = await db
        .select({ count: emergencyFlows.id })
        .from(emergencyFlows);
      const totalCount = totalResult.length;

      // カテゴリ数
      const categories = await this.getCategories();
      const categoryCount = categories.length;

      // 今日の件数
      const todayResult = await db
        .select({ count: emergencyFlows.id })
        .from(emergencyFlows)
        .where(eq(emergencyFlows.createdAt, today));
      const todayCount = todayResult.length;

      // 今週の件数
      const weekResult = await db
        .select({ count: emergencyFlows.id })
        .from(emergencyFlows)
        .where(
          and(
            gte(emergencyFlows.createdAt, weekAgo),
            lte(emergencyFlows.createdAt, now)
          )
        );
      const thisWeekCount = weekResult.length;

      console.log('✅ 統計情報取得完了');

      return {
        totalCount,
        categoryCount,
        todayCount,
        thisWeekCount,
      };
    } catch (error) {
      console.error('❌ 統計情報取得エラー:', error);
      throw error;
    }
  }
}
