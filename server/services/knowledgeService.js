"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeService = void 0;
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
const { emergencyFlows } = schema_js_1.schema;
const zod_1 = require("zod");
// バリデーションスキーマ
const createFlowSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'タイトルは必須です'),
    description: zod_1.z.string().optional(),
    keyword: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    steps: zod_1.z.array(zod_1.z.any()).optional(),
    imagePath: zod_1.z.string().optional(),
});
const searchFlowSchema = zod_1.z.object({
    title: zod_1.z.string().optional(),
    keyword: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    limit: zod_1.z.number().min(1).max(100).default(20),
    offset: zod_1.z.number().min(0).default(0),
});
class KnowledgeService {
    /**
     * 応急処置フローを作成
     */
    static async createFlow(data) {
        try {
            console.log('📋 新規応急処置フロー作成:', data);
            // バリデーション
            const validationResult = createFlowSchema.safeParse(data);
            if (!validationResult.success) {
                throw new Error(`バリデーションエラー: ${validationResult.error.errors.map(e => e.message).join(', ')}`);
            }
            const { title, description, keyword, category, steps, imagePath } = validationResult.data;
            // データベースに保存
            const newFlow = await index_js_1.db
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
        }
        catch (error) {
            console.error('❌ 応急処置フロー作成エラー:', error);
            throw error;
        }
    }
    /**
     * 応急処置フロー一覧を取得
     */
    static async getFlowList(params) {
        try {
            console.log('📋 応急処置フロー一覧取得:', params);
            // バリデーション
            const validationResult = searchFlowSchema.safeParse(params);
            if (!validationResult.success) {
                throw new Error(`バリデーションエラー: ${validationResult.error.errors.map(e => e.message).join(', ')}`);
            }
            const { title, keyword, category, limit = 20, offset = 0, } = validationResult.data;
            // 検索条件を構築
            const conditions = [];
            if (title) {
                conditions.push((0, drizzle_orm_1.like)(emergencyFlows.title, `%${title}%`));
            }
            if (keyword) {
                conditions.push((0, drizzle_orm_1.like)(emergencyFlows.keyword, `%${keyword}%`));
            }
            if (category) {
                conditions.push((0, drizzle_orm_1.eq)(emergencyFlows.category, category));
            }
            // データ取得
            const query = index_js_1.db
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
                query.where((0, drizzle_orm_1.and)(...conditions));
            }
            // ページネーションとソート
            const items = await query
                .orderBy((0, drizzle_orm_1.desc)(emergencyFlows.createdAt))
                .limit(limit)
                .offset(offset);
            // 総件数を取得
            const countQuery = index_js_1.db
                .select({ count: emergencyFlows.id })
                .from(emergencyFlows);
            if (conditions.length > 0) {
                countQuery.where((0, drizzle_orm_1.and)(...conditions));
            }
            const countResult = await countQuery;
            const total = countResult.length;
            const page = Math.floor(offset / limit) + 1;
            const totalPages = Math.ceil(total / limit);
            console.log(`✅ 応急処置フロー取得完了: ${items.length}件 (全${total}件)`);
            return {
                items,
                total,
                page,
                totalPages,
            };
        }
        catch (error) {
            console.error('❌ 応急処置フロー取得エラー:', error);
            throw error;
        }
    }
    /**
     * 特定の応急処置フローを取得
     */
    static async getFlowById(id) {
        try {
            console.log(`📋 応急処置フロー詳細取得: ${id}`);
            const flowItem = await index_js_1.db
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
                .where((0, drizzle_orm_1.eq)(emergencyFlows.id, id))
                .limit(1);
            if (flowItem.length === 0) {
                console.log('⚠️  応急処置フローが見つかりません:', id);
                return null;
            }
            console.log('✅ 応急処置フロー詳細取得完了');
            return flowItem[0];
        }
        catch (error) {
            console.error('❌ 応急処置フロー詳細取得エラー:', error);
            throw error;
        }
    }
    /**
     * 応急処置フローを削除
     */
    static async deleteFlow(id) {
        try {
            console.log(`📋 応急処置フロー削除: ${id}`);
            const result = await index_js_1.db
                .delete(emergencyFlows)
                .where((0, drizzle_orm_1.eq)(emergencyFlows.id, id))
                .returning();
            if (result.length === 0) {
                console.log('⚠️  削除対象の応急処置フローが見つかりません:', id);
                return false;
            }
            console.log('✅ 応急処置フロー削除完了:', id);
            return true;
        }
        catch (error) {
            console.error('❌ 応急処置フロー削除エラー:', error);
            throw error;
        }
    }
    /**
     * 応急処置フローを更新
     */
    static async updateFlow(id, data) {
        try {
            console.log(`📋 応急処置フロー更新: ${id}`, data);
            const result = await index_js_1.db
                .update(emergencyFlows)
                .set({
                ...data,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(emergencyFlows.id, id))
                .returning();
            if (result.length === 0) {
                console.log('⚠️  更新対象の応急処置フローが見つかりません:', id);
                return null;
            }
            console.log('✅ 応急処置フロー更新完了:', id);
            return result[0];
        }
        catch (error) {
            console.error('❌ 応急処置フロー更新エラー:', error);
            throw error;
        }
    }
    /**
     * カテゴリ一覧を取得
     */
    static async getCategories() {
        try {
            console.log('📋 カテゴリ一覧取得');
            const categories = await index_js_1.db
                .select({ category: emergencyFlows.category })
                .from(emergencyFlows)
                .where(emergencyFlows.category.isNotNull());
            const uniqueCategories = [
                ...new Set(categories.map(c => c.category)),
            ].filter(Boolean);
            console.log('✅ カテゴリ一覧取得完了:', uniqueCategories.length + '件');
            return uniqueCategories;
        }
        catch (error) {
            console.error('❌ カテゴリ一覧取得エラー:', error);
            throw error;
        }
    }
    /**
     * キーワード検索
     */
    static async searchByKeyword(keyword) {
        try {
            console.log(`📋 キーワード検索: ${keyword}`);
            const flows = await index_js_1.db
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
                .where((0, drizzle_orm_1.like)(emergencyFlows.keyword, `%${keyword}%`))
                .orderBy((0, drizzle_orm_1.desc)(emergencyFlows.createdAt));
            console.log(`✅ キーワード検索完了: ${flows.length}件`);
            return flows;
        }
        catch (error) {
            console.error('❌ キーワード検索エラー:', error);
            throw error;
        }
    }
    /**
     * 統計情報を取得
     */
    static async getStatistics() {
        try {
            console.log('📋 ナレッジ統計情報取得');
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            // 総件数
            const totalResult = await index_js_1.db
                .select({ count: emergencyFlows.id })
                .from(emergencyFlows);
            const totalCount = totalResult.length;
            // カテゴリ数
            const categories = await this.getCategories();
            const categoryCount = categories.length;
            // 今日の件数
            const todayResult = await index_js_1.db
                .select({ count: emergencyFlows.id })
                .from(emergencyFlows)
                .where((0, drizzle_orm_1.eq)(emergencyFlows.createdAt, today));
            const todayCount = todayResult.length;
            // 今週の件数
            const weekResult = await index_js_1.db
                .select({ count: emergencyFlows.id })
                .from(emergencyFlows)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(emergencyFlows.createdAt, weekAgo), (0, drizzle_orm_1.lte)(emergencyFlows.createdAt, now)));
            const thisWeekCount = weekResult.length;
            console.log('✅ 統計情報取得完了');
            return {
                totalCount,
                categoryCount,
                todayCount,
                thisWeekCount,
            };
        }
        catch (error) {
            console.error('❌ 統計情報取得エラー:', error);
            throw error;
        }
    }
}
exports.KnowledgeService = KnowledgeService;
