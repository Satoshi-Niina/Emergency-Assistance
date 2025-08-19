import db from '../db/db';
import { z } from 'zod';

// バリデーションスキーマ
const createFlowSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().optional(),
  keyword: z.string().optional(),
  category: z.string().optional(),
  steps: z.array(z.object({
    id: z.string(),
    type: z.enum(['step', 'condition', 'action']),
    description: z.string(),
    nextStepId: z.string().optional(),
    options: z.array(z.object({
      text: z.string(),
      nextStepId: z.string()
    })).optional()
  })).optional()
});

export type CreateFlowData = z.infer<typeof createFlowSchema>;

export class KnowledgeService {
  /**
   * 新しいフローを作成
   */
  async createFlow(data: CreateFlowData): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      // バリデーション
      const validationResult = createFlowSchema.safeParse(data);
      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error.errors.map(e => e.message).join(', ')
        };
      }

      const validData = validationResult.data;

      // DBクエリで挿入
      const insertQuery = `
        INSERT INTO emergency_flows (title, description, keyword, category, steps, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING id
      `;

      const result = await db.query(insertQuery, [
        validData.title,
        validData.description || null,
        validData.keyword || null,
        validData.category || null,
        JSON.stringify(validData.steps || [])
      ]);

      if (result.rows && result.rows.length > 0) {
        return {
          success: true,
          id: result.rows[0].id
        };
      } else {
        return {
          success: false,
          error: 'フローの作成に失敗しました'
        };
      }
    } catch (error) {
      console.error('フロー作成エラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * フローを検索
   */
  async searchFlows(params: {
    title?: string;
    keyword?: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; flows?: any[]; total?: number; error?: string }> {
    try {
      const { title, keyword, category, page = 1, limit = 10 } = params;
      const offset = (page - 1) * limit;

      // 条件を動的に構築
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (title) {
        conditions.push(`title ILIKE $${paramIndex}`);
        values.push(`%${title}%`);
        paramIndex++;
      }

      if (keyword) {
        conditions.push(`keyword ILIKE $${paramIndex}`);
        values.push(`%${keyword}%`);
        paramIndex++;
      }

      if (category) {
        conditions.push(`category = $${paramIndex}`);
        values.push(category);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // メインクエリ
      const selectQuery = `
        SELECT id, title, description, keyword, category, steps, created_at, updated_at
        FROM emergency_flows
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      values.push(limit, offset);

      const result = await db.query(selectQuery, values);

      // 総数を取得
      const countQuery = `
        SELECT COUNT(*) as count
        FROM emergency_flows
        ${whereClause}
      `;

      const countResult = await db.query(countQuery, values.slice(0, -2)); // limit, offsetを除外

      return {
        success: true,
        flows: result.rows || [],
        total: parseInt(countResult.rows?.[0]?.count || '0')
      };

    } catch (error) {
      console.error('フロー検索エラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * IDでフローを取得
   */
  async getFlowById(id: string): Promise<{ success: boolean; flow?: any; error?: string }> {
    try {
      const query = `
        SELECT id, title, description, keyword, category, steps, created_at, updated_at
        FROM emergency_flows
        WHERE id = $1
      `;

      const result = await db.query(query, [id]);

      if (result.rows && result.rows.length > 0) {
        return {
          success: true,
          flow: result.rows[0]
        };
      } else {
        return {
          success: false,
          error: 'フローが見つかりません'
        };
      }
    } catch (error) {
      console.error('フロー取得エラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * フローを更新
   */
  async updateFlow(id: string, data: Partial<CreateFlowData>): Promise<{ success: boolean; error?: string }> {
    try {
      // 更新フィールドを動的に構築
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.title !== undefined) {
        updates.push(`title = $${paramIndex}`);
        values.push(data.title);
        paramIndex++;
      }

      if (data.description !== undefined) {
        updates.push(`description = $${paramIndex}`);
        values.push(data.description);
        paramIndex++;
      }

      if (data.keyword !== undefined) {
        updates.push(`keyword = $${paramIndex}`);
        values.push(data.keyword);
        paramIndex++;
      }

      if (data.category !== undefined) {
        updates.push(`category = $${paramIndex}`);
        values.push(data.category);
        paramIndex++;
      }

      if (data.steps !== undefined) {
        updates.push(`steps = $${paramIndex}`);
        values.push(JSON.stringify(data.steps));
        paramIndex++;
      }

      if (updates.length === 0) {
        return {
          success: false,
          error: '更新する項目が指定されていません'
        };
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const updateQuery = `
        UPDATE emergency_flows
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
      `;

      const result = await db.query(updateQuery, values);

      return {
        success: true
      };
    } catch (error) {
      console.error('フロー更新エラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * フローを削除
   */
  async deleteFlow(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const deleteQuery = `
        DELETE FROM emergency_flows
        WHERE id = $1
      `;

      const result = await db.query(deleteQuery, [id]);

      return {
        success: true
      };
    } catch (error) {
      console.error('フロー削除エラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * ベクトル検索用のキーワードマッチング
   */
  async searchByVector(queryVector: number[], limit: number = 10): Promise<{ success: boolean; results?: any[]; error?: string }> {
    try {
      // 将来的にベクトル検索を実装する場合のプレースホルダー
      console.log('ベクトル検索は現在実装されていません');

      return {
        success: false,
        error: 'ベクトル検索は現在サポートされていません'
      };
    } catch (error) {
      console.error('ベクトル検索エラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 統計情報を取得
   */
  async getStats(): Promise<{ success: boolean; stats?: any; error?: string }> {
    try {
      const totalQuery = `SELECT COUNT(*) as total FROM emergency_flows`;
      const categoriesQuery = `
        SELECT category, COUNT(*) as count
        FROM emergency_flows
        WHERE category IS NOT NULL
        GROUP BY category
        ORDER BY count DESC
      `;

      const [totalResult, categoriesResult] = await Promise.all([
        db.query(totalQuery),
        db.query(categoriesQuery)
      ]);

      return {
        success: true,
        stats: {
          total: parseInt(totalResult.rows?.[0]?.total || '0'),
          categories: categoriesResult.rows || []
        }
      };
    } catch (error) {
      console.error('統計情報取得エラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// デフォルトインスタンスをエクスポート
export const knowledgeService = new KnowledgeService();