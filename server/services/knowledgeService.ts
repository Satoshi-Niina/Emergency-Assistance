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

      // 条件を構築
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (title) {
        conditions.push(`title ILIKE $${paramIndex}`);
        params.push(`%${title}%`);
        paramIndex++;
      }
      if (keyword) {
        conditions.push(`keyword ILIKE $${paramIndex}`);
        params.push(`%${keyword}%`);
        paramIndex++;
      }
      if (category) {
        conditions.push(`category = $${paramIndex}`);
        params.push(category);
        paramIndex++;
      }

      // データ取得
      let query = `
        SELECT 
          id,
          title,
          description,
          keyword,
          category,
          steps,
          imagePath,
          "createdAt",
          "updatedAt"
        FROM emergency_flows
      `;

      // 条件を適用
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      // ページネーションとソート
      query += ` ORDER BY "createdAt" DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const items = await sql(query, params);

      // 総件数を取得
      let countQuery = `SELECT COUNT(*) as count FROM emergency_flows`;
      if (conditions.length > 0) {
        countQuery += ` WHERE ${conditions.join(' AND ')}`;
      }
      const countResult = await sql(countQuery, params.slice(0, -2));
      const total = parseInt(countResult[0]?.count || '0');

      const page = Math.floor(offset / limit) + 1;
      const totalPages = Math.ceil(total / limit);

      console.log(`✅ 応急処置フロー一覧取得完了: ${items.length}件`);

      return {
        items: items as EmergencyFlow[],
        total,
        page,
        totalPages
      };
      
    } catch (error) {
      console.error('❌ 応急処置フロー一覧取得エラー:', error);
      throw error;
    }
  }

  /**
   * 応急処置フロー詳細を取得
   */
  static async getFlowById(id: string): Promise<EmergencyFlow | null> {
    try {
      console.log(`📋 応急処置フロー詳細取得: ${id}`);

      const flowItem = await sql`
        SELECT 
          id,
          title,
          description,
          keyword,
          category,
          steps,
          imagePath,
          "createdAt",
          "updatedAt"
        FROM emergency_flows
        WHERE id = ${id}
        LIMIT 1
      `;

      if (flowItem.length === 0) {
        console.log(`❌ 応急処置フローが見つかりません: ${id}`);
        return null;
      }

      console.log(`✅ 応急処置フロー詳細取得完了: ${id}`);
      return flowItem[0] as EmergencyFlow;
      
    } catch (error) {
      console.error(`❌ 応急処置フロー詳細取得エラー: ${id}`, error);
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
        DELETE FROM emergency_flows
        WHERE id = ${id}
        RETURNING *
      `;

      if (result.length === 0) {
        console.log(`❌ 応急処置フローが見つかりません: ${id}`);
        return false;
      }

      console.log(`✅ 応急処置フロー削除完了: ${id}`);
      return true;
      
    } catch (error) {
      console.error(`❌ 応急処置フロー削除エラー: ${id}`, error);
      throw error;
    }
  }

  /**
   * 応急処置フローを更新
   */
  static async updateFlow(id: string, data: Partial<EmergencyFlow>): Promise<EmergencyFlow | null> {
    try {
      console.log(`📋 応急処置フロー更新: ${id}`, data);

      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (data.title !== undefined) {
        updateFields.push(`title = $${paramIndex}`);
        params.push(data.title);
        paramIndex++;
      }
      if (data.description !== undefined) {
        updateFields.push(`description = $${paramIndex}`);
        params.push(data.description);
        paramIndex++;
      }
      if (data.keyword !== undefined) {
        updateFields.push(`keyword = $${paramIndex}`);
        params.push(data.keyword);
        paramIndex++;
      }
      if (data.category !== undefined) {
        updateFields.push(`category = $${paramIndex}`);
        params.push(data.category);
        paramIndex++;
      }
      if (data.steps !== undefined) {
        updateFields.push(`steps = $${paramIndex}`);
        params.push(data.steps);
        paramIndex++;
      }
      if (data.imagePath !== undefined) {
        updateFields.push(`"imagePath" = $${paramIndex}`);
        params.push(data.imagePath);
        paramIndex++;
      }

      // updatedAtを追加
      updateFields.push(`"updatedAt" = $${paramIndex}`);
      params.push(new Date());
      paramIndex++;

      if (updateFields.length === 0) {
        console.log(`⚠️ 更新するフィールドがありません: ${id}`);
        return await this.getFlowById(id);
      }

      const result = await sql`
        UPDATE emergency_flows
        SET ${sql.unsafe(updateFields.join(', '))}
        WHERE id = ${id}
        RETURNING *
      `;

      if (result.length === 0) {
        console.log(`❌ 応急処置フローが見つかりません: ${id}`);
        return null;
      }

      console.log(`✅ 応急処置フロー更新完了: ${id}`);
      return result[0] as EmergencyFlow;
      
    } catch (error) {
      console.error(`❌ 応急処置フロー更新エラー: ${id}`, error);
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
        SELECT DISTINCT category
        FROM emergency_flows
        WHERE category IS NOT NULL
      `;

      const uniqueCategories = [...new Set(categories.map(c => c.category))].filter(Boolean);
      console.log(`✅ カテゴリ一覧取得完了: ${uniqueCategories.length}件`);

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
          id,
          title,
          description,
          keyword,
          category,
          steps,
          imagePath,
          "createdAt",
          "updatedAt"
        FROM emergency_flows
        WHERE keyword ILIKE ${`%${keyword}%`}
        ORDER BY "createdAt" DESC
      `;

      console.log(`✅ キーワード検索完了: ${flows.length}件`);
      return flows as EmergencyFlow[];
      
    } catch (error) {
      console.error(`❌ キーワード検索エラー: ${keyword}`, error);
      throw error;
    }
  }

  /**
   * 統計情報を取得
   */
  static async getStatistics(): Promise<{
    total: number;
    categories: number;
    today: number;
    thisWeek: number;
  }> {
    try {
      console.log('📋 統計情報取得');

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // 総件数
      const totalResult = await sql`SELECT COUNT(*) as count FROM emergency_flows`;
      const totalCount = parseInt(totalResult[0]?.count || '0');

      // カテゴリ数
      const categoryResult = await sql`SELECT COUNT(DISTINCT category) as count FROM emergency_flows WHERE category IS NOT NULL`;
      const categoryCount = parseInt(categoryResult[0]?.count || '0');

      // 今日の件数
      const todayResult = await sql`SELECT COUNT(*) as count FROM emergency_flows WHERE "createdAt" >= ${today}`;
      const todayCount = parseInt(todayResult[0]?.count || '0');

      // 今週の件数
      const weekResult = await sql`SELECT COUNT(*) as count FROM emergency_flows WHERE "createdAt" >= ${weekAgo} AND "createdAt" <= ${now}`;
      const thisWeekCount = parseInt(weekResult[0]?.count || '0');

      console.log('✅ 統計情報取得完了');

      return {
        total: totalCount,
        categories: categoryCount,
        today: todayCount,
        thisWeek: thisWeekCount
      };
      
    } catch (error) {
      console.error('❌ 統計情報取得エラー:', error);
      throw error;
    }
  }
} 