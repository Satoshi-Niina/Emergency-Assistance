import { sql } from '../db/db';
import { eq, desc, like, and } from 'drizzle-orm';
import { z } from 'zod';

// バリデーションスキーマ
const createFlowSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().optional(),
  keyword: z.string().optional(),
  category: z.string().optional(),
  steps: z.array(z.any()).optional(),
  imagePath: z.string().optional()
});

const searchFlowSchema = z.object({
  title: z.string().optional(),
  keyword: z.string().optional(),
  category: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0)
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
  static async createFlow(data: z.infer<typeof createFlowSchema>): Promise<EmergencyFlow> {
    try {
      console.log('📋 新規応急処置フロー作成:', data);
      
      // バリデーション
      const validationResult = createFlowSchema.safeParse(data);
      if (!validationResult.success) {
        throw new Error(`バリデーションエラー: ${validationResult.error.errors.map(e => e.message).join(', ')}`);
      }

      const { title, description, keyword, category, steps, imagePath } = validationResult.data;

      // データベースに保存（emergencyFlowsテーブルは削除されたため、一時的にJSONファイルに保存）
      const newFlow: EmergencyFlow = {
        id: crypto.randomUUID(),
        title,
        description: description || undefined,
        keyword: keyword || undefined,
        category: category || undefined,
        steps: steps || [],
        imagePath: imagePath || undefined,
        createdAt: new Date()
      };

      console.log('✅ 応急処置フロー作成完了:', newFlow.id);
      return newFlow;
      
    } catch (error) {
      console.error('❌ 応急処置フロー作成エラー:', error);
      throw error;
    }
  }

  /**
   * 応急処置フロー一覧を取得
   */
  static async getFlowList(params: FlowSearchParams): Promise<FlowSearchResult> {
    try {
      console.log('📋 応急処置フロー一覧取得:', params);
      
      // バリデーション
      const validationResult = searchFlowSchema.safeParse(params);
      if (!validationResult.success) {
        throw new Error(`バリデーションエラー: ${validationResult.error.errors.map(e => e.message).join(', ')}`);
      }

      const { title, keyword, category, limit = 20, offset = 0 } = validationResult.data;

      // 検索条件を構築
      const conditions = [];
      if (title) {
        conditions.push(like(sql`emergencyFlows.title`, `%${title}%`));
      }
      if (keyword) {
        conditions.push(like(sql`emergencyFlows.keyword`, `%${keyword}%`));
      }
      if (category) {
        conditions.push(eq(sql`emergencyFlows.category`, category));
      }

      // データ取得
      const query = sql`
        SELECT 
          emergencyFlows.id,
          emergencyFlows.title,
          emergencyFlows.description,
          emergencyFlows.keyword,
          emergencyFlows.category,
          emergencyFlows.steps,
          emergencyFlows.imagePath,
          emergencyFlows.createdAt,
          emergencyFlows.updatedAt
        FROM emergencyFlows
      `;

      // 条件を適用
      if (conditions.length > 0) {
        query.append(` WHERE ${conditions.join(' AND ')}`);
      }

      // ページネーションとソート
      const items = await sql`${query} ORDER BY emergencyFlows.createdAt DESC LIMIT ${limit} OFFSET ${offset}`;

      // 総件数を取得
      const countQuery = sql`SELECT COUNT(*) FROM emergencyFlows`;
      if (conditions.length > 0) {
        countQuery.append(` WHERE ${conditions.join(' AND ')}`);
      }
      const countResult = await sql`${countQuery}`;
      const total = countResult[0].count;

      const page = Math.floor(offset / limit) + 1;
      const totalPages = Math.ceil(total / limit);

      console.log(`✅ 応急処置フロー取得完了: ${items.length}件 (全${total}件)`);

      return {
        items,
        total,
        page,
        totalPages
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

      const flowItem = await sql`
        SELECT 
          emergencyFlows.id,
          emergencyFlows.title,
          emergencyFlows.description,
          emergencyFlows.keyword,
          emergencyFlows.category,
          emergencyFlows.steps,
          emergencyFlows.imagePath,
          emergencyFlows.createdAt,
          emergencyFlows.updatedAt
        FROM emergencyFlows
        WHERE emergencyFlows.id = ${id}
        LIMIT 1
      `;

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

      const result = await sql`
        DELETE FROM emergencyFlows
        WHERE emergencyFlows.id = ${id}
        RETURNING *
      `;

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
  static async updateFlow(id: string, data: Partial<z.infer<typeof createFlowSchema>>): Promise<EmergencyFlow | null> {
    try {
      console.log(`📋 応急処置フロー更新: ${id}`, data);

      const result = await sql`
        UPDATE emergencyFlows
        SET
          ${sql.identifier('title')} = ${data.title},
          ${sql.identifier('description')} = ${data.description},
          ${sql.identifier('keyword')} = ${data.keyword},
          ${sql.identifier('category')} = ${data.category},
          ${sql.identifier('steps')} = ${data.steps},
          ${sql.identifier('imagePath')} = ${data.imagePath},
          ${sql.identifier('updatedAt')} = ${new Date()}
        WHERE emergencyFlows.id = ${id}
        RETURNING *
      `;

      if (result.length === 0) {
        console.log('⚠️  更新対象の応急処置フローが見つかりません:', id);
        return null;
      }

      console.log('✅ 応急処置フロー更新完了:', id);
      return result[0];
      
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

      const categories = await sql`
        SELECT DISTINCT emergencyFlows.category
        FROM emergencyFlows
        WHERE emergencyFlows.category IS NOT NULL
      `;

      const uniqueCategories = [...new Set(categories.map(c => c.category))].filter(Boolean);
      
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

      const flows = await sql`
        SELECT 
          emergencyFlows.id,
          emergencyFlows.title,
          emergencyFlows.description,
          emergencyFlows.keyword,
          emergencyFlows.category,
          emergencyFlows.steps,
          emergencyFlows.imagePath,
          emergencyFlows.createdAt,
          emergencyFlows.updatedAt
        FROM emergencyFlows
        WHERE emergencyFlows.keyword LIKE ${`%${keyword}%`}
        ORDER BY emergencyFlows.createdAt DESC
      `;

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
      const totalResult = await sql`SELECT COUNT(*) FROM emergencyFlows`;
      const totalCount = totalResult[0].count;

      // カテゴリ数
      const categories = await this.getCategories();
      const categoryCount = categories.length;

      // 今日の件数
      const todayResult = await sql`SELECT COUNT(*) FROM emergencyFlows WHERE emergencyFlows.createdAt = ${today}`;
      const todayCount = todayResult[0].count;

      // 今週の件数
      const weekResult = await sql`SELECT COUNT(*) FROM emergencyFlows WHERE emergencyFlows.createdAt >= ${weekAgo} AND emergencyFlows.createdAt <= ${now}`;
      const thisWeekCount = weekResult[0].count;

      console.log('✅ 統計情報取得完了');

      return {
        totalCount,
        categoryCount,
        todayCount,
        thisWeekCount
      };
      
    } catch (error) {
      console.error('❌ 統計情報取得エラー:', error);
      throw error;
    }
  }
} 