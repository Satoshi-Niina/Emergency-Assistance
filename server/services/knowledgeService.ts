import { db } from '../db/index.js';
import { schema } from '../../shared/schema.js';
import { eq, desc, like, and, gte, lte } from 'drizzle-orm';

const { emergencyFlows } = schema;
import { z } from 'zod';

// 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｹ繧ｭ繝ｼ繝・
const createFlowSchema = z.object({
  title: z.string().min(1, '繧ｿ繧､繝医Ν縺ｯ蠢・医〒縺・),
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
   * 蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ繧剃ｽ懈・
   */
  static async createFlow(data: z.infer<typeof createFlowSchema>): Promise<EmergencyFlow> {
    try {
      console.log('搭 譁ｰ隕丞ｿ懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ菴懈・:', data);
      
      // 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
      const validationResult = createFlowSchema.safeParse(data);
      if (!validationResult.success) {
        throw new Error(`繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｨ繝ｩ繝ｼ: ${validationResult.error.errors.map(e => e.message).join(', ')}`);
      }

      const { title, description, keyword, category, steps, imagePath } = validationResult.data;

      // 繝・・繧ｿ繝吶・繧ｹ縺ｫ菫晏ｭ・
      const newFlow = await db.insert(emergencyFlows).values({
        title,
        description: description || null,
        keyword: keyword || null,
        category: category || null,
        steps: steps || [],
        imagePath: imagePath || null
      }).returning();

      console.log('笨・蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ菴懈・螳御ｺ・', newFlow[0].id);
      return newFlow[0];
      
    } catch (error) {
      console.error('笶・蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ菴懈・繧ｨ繝ｩ繝ｼ:', error);
      throw error;
    }
  }

  /**
   * 蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ荳隕ｧ繧貞叙蠕・
   */
  static async getFlowList(params: FlowSearchParams): Promise<FlowSearchResult> {
    try {
      console.log('搭 蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ荳隕ｧ蜿門ｾ・', params);
      
      // 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
      const validationResult = searchFlowSchema.safeParse(params);
      if (!validationResult.success) {
        throw new Error(`繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｨ繝ｩ繝ｼ: ${validationResult.error.errors.map(e => e.message).join(', ')}`);
      }

      const { title, keyword, category, limit = 20, offset = 0 } = validationResult.data;

      // 讀懃ｴ｢譚｡莉ｶ繧呈ｧ狗ｯ・
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

      // 繝・・繧ｿ蜿門ｾ・
      const query = db.select({
        id: emergencyFlows.id,
        title: emergencyFlows.title,
        description: emergencyFlows.description,
        keyword: emergencyFlows.keyword,
        category: emergencyFlows.category,
        steps: emergencyFlows.steps,
        imagePath: emergencyFlows.imagePath,
        createdAt: emergencyFlows.createdAt,
        updatedAt: emergencyFlows.updatedAt
      }).from(emergencyFlows);

      // 譚｡莉ｶ繧帝←逕ｨ
      if (conditions.length > 0) {
        query.where(and(...conditions));
      }

      // 繝壹・繧ｸ繝阪・繧ｷ繝ｧ繝ｳ縺ｨ繧ｽ繝ｼ繝・
      const items = await query
        .orderBy(desc(emergencyFlows.createdAt))
        .limit(limit)
        .offset(offset);

      // 邱丈ｻｶ謨ｰ繧貞叙蠕・
      const countQuery = db.select({ count: emergencyFlows.id }).from(emergencyFlows);
      if (conditions.length > 0) {
        countQuery.where(and(...conditions));
      }
      const countResult = await countQuery;
      const total = countResult.length;

      const page = Math.floor(offset / limit) + 1;
      const totalPages = Math.ceil(total / limit);

      console.log(`笨・蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ蜿門ｾ怜ｮ御ｺ・ ${items.length}莉ｶ (蜈ｨ${total}莉ｶ)`);

      return {
        items,
        total,
        page,
        totalPages
      };
      
    } catch (error) {
      console.error('笶・蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ蜿門ｾ励お繝ｩ繝ｼ:', error);
      throw error;
    }
  }

  /**
   * 迚ｹ螳壹・蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ繧貞叙蠕・
   */
  static async getFlowById(id: string): Promise<EmergencyFlow | null> {
    try {
      console.log(`搭 蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ隧ｳ邏ｰ蜿門ｾ・ ${id}`);

      const flowItem = await db.select({
        id: emergencyFlows.id,
        title: emergencyFlows.title,
        description: emergencyFlows.description,
        keyword: emergencyFlows.keyword,
        category: emergencyFlows.category,
        steps: emergencyFlows.steps,
        imagePath: emergencyFlows.imagePath,
        createdAt: emergencyFlows.createdAt,
        updatedAt: emergencyFlows.updatedAt
      }).from(emergencyFlows)
      .where(eq(emergencyFlows.id, id))
      .limit(1);

      if (flowItem.length === 0) {
        console.log('笞・・ 蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ:', id);
        return null;
      }

      console.log('笨・蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ隧ｳ邏ｰ蜿門ｾ怜ｮ御ｺ・);
      return flowItem[0];
      
    } catch (error) {
      console.error('笶・蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ隧ｳ邏ｰ蜿門ｾ励お繝ｩ繝ｼ:', error);
      throw error;
    }
  }

  /**
   * 蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ繧貞炎髯､
   */
  static async deleteFlow(id: string): Promise<boolean> {
    try {
      console.log(`搭 蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ蜑企勁: ${id}`);

      const result = await db.delete(emergencyFlows)
        .where(eq(emergencyFlows.id, id))
        .returning();

      if (result.length === 0) {
        console.log('笞・・ 蜑企勁蟇ｾ雎｡縺ｮ蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ:', id);
        return false;
      }

      console.log('笨・蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ蜑企勁螳御ｺ・', id);
      return true;
      
    } catch (error) {
      console.error('笶・蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ蜑企勁繧ｨ繝ｩ繝ｼ:', error);
      throw error;
    }
  }

  /**
   * 蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ繧呈峩譁ｰ
   */
  static async updateFlow(id: string, data: Partial<z.infer<typeof createFlowSchema>>): Promise<EmergencyFlow | null> {
    try {
      console.log(`搭 蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ譖ｴ譁ｰ: ${id}`, data);

      const result = await db.update(emergencyFlows)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(emergencyFlows.id, id))
        .returning();

      if (result.length === 0) {
        console.log('笞・・ 譖ｴ譁ｰ蟇ｾ雎｡縺ｮ蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ:', id);
        return null;
      }

      console.log('笨・蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ譖ｴ譁ｰ螳御ｺ・', id);
      return result[0] as any;
      
    } catch (error) {
      console.error('笶・蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ譖ｴ譁ｰ繧ｨ繝ｩ繝ｼ:', error);
      throw error;
    }
  }

  /**
   * 繧ｫ繝・ざ繝ｪ荳隕ｧ繧貞叙蠕・
   */
  static async getCategories(): Promise<string[]> {
    try {
      console.log('搭 繧ｫ繝・ざ繝ｪ荳隕ｧ蜿門ｾ・);

      const categories = await db.select({ category: emergencyFlows.category })
        .from(emergencyFlows)
        .where(emergencyFlows.category.isNotNull());

      const uniqueCategories = [...new Set(categories.map(c => c.category))].filter(Boolean);
      
      console.log('笨・繧ｫ繝・ざ繝ｪ荳隕ｧ蜿門ｾ怜ｮ御ｺ・', uniqueCategories.length + '莉ｶ');
      return uniqueCategories;
      
    } catch (error) {
      console.error('笶・繧ｫ繝・ざ繝ｪ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
      throw error;
    }
  }

  /**
   * 繧ｭ繝ｼ繝ｯ繝ｼ繝画､懃ｴ｢
   */
  static async searchByKeyword(keyword: string): Promise<EmergencyFlow[]> {
    try {
      console.log(`搭 繧ｭ繝ｼ繝ｯ繝ｼ繝画､懃ｴ｢: ${keyword}`);

      const flows = await db.select({
        id: emergencyFlows.id,
        title: emergencyFlows.title,
        description: emergencyFlows.description,
        keyword: emergencyFlows.keyword,
        category: emergencyFlows.category,
        steps: emergencyFlows.steps,
        imagePath: emergencyFlows.imagePath,
        createdAt: emergencyFlows.createdAt,
        updatedAt: emergencyFlows.updatedAt
      }).from(emergencyFlows)
      .where(like(emergencyFlows.keyword, `%${keyword}%`))
      .orderBy(desc(emergencyFlows.createdAt));

      console.log(`笨・繧ｭ繝ｼ繝ｯ繝ｼ繝画､懃ｴ｢螳御ｺ・ ${flows.length}莉ｶ`);
      return flows;
      
    } catch (error) {
      console.error('笶・繧ｭ繝ｼ繝ｯ繝ｼ繝画､懃ｴ｢繧ｨ繝ｩ繝ｼ:', error);
      throw error;
    }
  }

  /**
   * 邨ｱ險域ュ蝣ｱ繧貞叙蠕・
   */
  static async getStatistics(): Promise<{
    totalCount: number;
    categoryCount: number;
    todayCount: number;
    thisWeekCount: number;
  }> {
    try {
      console.log('搭 繝翫Ξ繝・ず邨ｱ險域ュ蝣ｱ蜿門ｾ・);

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      // 邱丈ｻｶ謨ｰ
      const totalResult = await db.select({ count: emergencyFlows.id }).from(emergencyFlows);
      const totalCount = totalResult.length;

      // 繧ｫ繝・ざ繝ｪ謨ｰ
      const categories = await this.getCategories();
      const categoryCount = categories.length;

      // 莉頑律縺ｮ莉ｶ謨ｰ
      const todayResult = await db.select({ count: emergencyFlows.id })
        .from(emergencyFlows)
        .where(eq(emergencyFlows.createdAt, today));
      const todayCount = todayResult.length;

      // 莉企ｱ縺ｮ莉ｶ謨ｰ
      const weekResult = await db.select({ count: emergencyFlows.id })
        .from(emergencyFlows)
        .where(and(
          gte(emergencyFlows.createdAt, weekAgo),
          lte(emergencyFlows.createdAt, now)
        ));
      const thisWeekCount = weekResult.length;

      console.log('笨・邨ｱ險域ュ蝣ｱ蜿門ｾ怜ｮ御ｺ・);

      return {
        totalCount,
        categoryCount,
        todayCount,
        thisWeekCount
      };
      
    } catch (error) {
      console.error('笶・邨ｱ險域ュ蝣ｱ蜿門ｾ励お繝ｩ繝ｼ:', error);
      throw error;
    }
  }
} 