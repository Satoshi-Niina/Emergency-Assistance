import { query, transaction } from '../db/db';
import { storageService } from './storageService';
import { z } from 'zod';

// 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｹ繧ｭ繝ｼ繝・
const createSessionSchema = z.object({
  title: z.string().optional(),
  machineType: z.string().optional(),
  machineNumber: z.string().optional(),
  metadata: z.any().optional()
});

const createHistorySchema = z.object({
  sessionId: z.string().uuid('繧ｻ繝・す繝ｧ繝ｳID縺ｯUUID蠖｢蠑上〒縺ゅｋ蠢・ｦ√′縺ゅｊ縺ｾ縺・),
  question: z.string().min(1, '雉ｪ蝠上・蠢・医〒縺・),
  answer: z.string().optional(),
  imageBase64: z.string().optional(),
  machineType: z.string().optional(),
  machineNumber: z.string().optional(),
  metadata: z.any().optional()
});

const searchHistorySchema = z.object({
  machineType: z.string().optional(),
  machineNumber: z.string().optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0)
});

export interface ChatSession {
  id: string;
  title?: string;
  machineType?: string;
  machineNumber?: string;
  status: 'active' | 'completed' | 'archived';
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
  messageCount?: number;
  lastMessageAt?: Date;
}

export interface ChatHistory {
  id: string;
  sessionId: string;
  question: string;
  answer?: string;
  imageUrl?: string;
  machineType?: string;
  machineNumber?: string;
  metadata?: any;
  createdAt: Date;
}

export interface HistorySearchParams {
  machineType?: string;
  machineNumber?: string;
  status?: 'active' | 'completed' | 'archived';
  limit?: number;
  offset?: number;
}

export interface HistorySearchResult {
  items: ChatSession[];
  total: number;
  page: number;
  totalPages: number;
}

export class HistoryService {
  /**
   * 繝√Ε繝・ヨ繧ｻ繝・す繝ｧ繝ｳ繧剃ｽ懈・
   */
  static async createSession(data: z.infer<typeof createSessionSchema>): Promise<ChatSession> {
    try {
      console.log('搭 譁ｰ隕上メ繝｣繝・ヨ繧ｻ繝・す繝ｧ繝ｳ菴懈・:', data);
      
      // 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
      const validationResult = createSessionSchema.safeParse(data);
      if (!validationResult.success) {
        throw new Error(`繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｨ繝ｩ繝ｼ: ${validationResult.error.errors.map(e => e.message).join(', ')}`);
      }

      const { title, machineType, machineNumber, metadata } = validationResult.data;

      // 繧ｻ繝・す繝ｧ繝ｳ繧剃ｽ懈・
      const result = await query(
        `INSERT INTO chat_sessions (title, machine_type, machine_number, metadata)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [title, machineType, machineNumber, metadata ? JSON.stringify(metadata) : null]
      );

      const session = result.rows[0];
      console.log('笨・繝√Ε繝・ヨ繧ｻ繝・す繝ｧ繝ｳ菴懈・螳御ｺ・', session.id);
      
      return {
        id: session.id,
        title: session.title,
        machineType: session.machine_type,
        machineNumber: session.machine_number,
        status: session.status,
        metadata: session.metadata,
        createdAt: session.created_at,
        updatedAt: session.updated_at
      };
      
    } catch (error) {
      console.error('笶・繝√Ε繝・ヨ繧ｻ繝・す繝ｧ繝ｳ菴懈・繧ｨ繝ｩ繝ｼ:', error);
      throw error;
    }
  }

  /**
   * 繝√Ε繝・ヨ螻･豁ｴ繧剃ｽ懈・
   */
  static async createHistory(data: z.infer<typeof createHistorySchema>): Promise<ChatHistory> {
    try {
      console.log('搭 譁ｰ隕上メ繝｣繝・ヨ螻･豁ｴ菴懈・:', data);
      
      // 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
      const validationResult = createHistorySchema.safeParse(data);
      if (!validationResult.success) {
        throw new Error(`繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｨ繝ｩ繝ｼ: ${validationResult.error.errors.map(e => e.message).join(', ')}`);
      }

      const { sessionId, question, answer, imageBase64, machineType, machineNumber, metadata } = validationResult.data;

      let imageUrl: string | undefined;

      // 逕ｻ蜒上′縺ゅｋ蝣ｴ蜷医・繧ｹ繝医Ξ繝ｼ繧ｸ縺ｫ菫晏ｭ・
      if (imageBase64) {
        const uploadResult = await storageService.saveBase64Image(imageBase64);
        imageUrl = uploadResult.url;
      }

      // 螻･豁ｴ繧剃ｿ晏ｭ・
      const result = await query(
        `INSERT INTO chat_history (session_id, question, answer, image_url, machine_type, machine_number, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [sessionId, question, answer, imageUrl, machineType, machineNumber, metadata ? JSON.stringify(metadata) : null]
      );

      const history = result.rows[0];
      console.log('笨・繝√Ε繝・ヨ螻･豁ｴ菴懈・螳御ｺ・', history.id);
      
      return {
        id: history.id,
        sessionId: history.session_id,
        question: history.question,
        answer: history.answer,
        imageUrl: history.image_url,
        machineType: history.machine_type,
        machineNumber: history.machine_number,
        metadata: history.metadata,
        createdAt: history.created_at
      };
      
    } catch (error) {
      console.error('笶・繝√Ε繝・ヨ螻･豁ｴ菴懈・繧ｨ繝ｩ繝ｼ:', error);
      throw error;
    }
  }

  /**
   * 繧ｻ繝・す繝ｧ繝ｳ荳隕ｧ繧貞叙蠕・
   */
  static async getSessionList(searchParams: HistorySearchParams): Promise<HistorySearchResult> {
    try {
      console.log('搭 繧ｻ繝・す繝ｧ繝ｳ荳隕ｧ蜿門ｾ・', searchParams);
      
      // 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
      const validationResult = searchHistorySchema.safeParse(searchParams);
      if (!validationResult.success) {
        throw new Error(`繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｨ繝ｩ繝ｼ: ${validationResult.error.errors.map(e => e.message).join(', ')}`);
      }

      const { machineType, machineNumber, status, limit = 20, offset = 0 } = validationResult.data;

      // 讀懃ｴ｢譚｡莉ｶ繧呈ｧ狗ｯ・
      const conditions: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (machineType) {
        conditions.push(`machine_type ILIKE $${paramIndex}`);
        queryParams.push(`%${machineType}%`);
        paramIndex++;
      }

      if (machineNumber) {
        conditions.push(`machine_number ILIKE $${paramIndex}`);
        queryParams.push(`%${machineNumber}%`);
        paramIndex++;
      }

      if (status) {
        conditions.push(`status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // 繧ｻ繝・す繝ｧ繝ｳ荳隕ｧ繧貞叙蠕暦ｼ医ン繝･繝ｼ繧剃ｽｿ逕ｨ・・
      const result = await query(
        `SELECT * FROM chat_session_summary ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...queryParams, limit, offset]
      );

      // 邱丈ｻｶ謨ｰ繧貞叙蠕・
      const countResult = await query(
        `SELECT COUNT(*) as total FROM chat_sessions ${whereClause}`,
        queryParams
      );

      const total = parseInt(countResult.rows[0].total);
      const page = Math.floor(offset / limit) + 1;
      const totalPages = Math.ceil(total / limit);

      const items = result.rows.map(row => ({
        id: row.session_id,
        title: row.title,
        machineType: row.machine_type,
        machineNumber: row.machine_number,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        messageCount: parseInt(row.message_count) || 0,
        lastMessageAt: row.last_message_at
      }));

      console.log(`笨・繧ｻ繝・す繝ｧ繝ｳ荳隕ｧ蜿門ｾ怜ｮ御ｺ・ ${items.length}莉ｶ (蜈ｨ${total}莉ｶ)`);

      return {
        items,
        total,
        page,
        totalPages
      };
      
    } catch (error) {
      console.error('笶・繧ｻ繝・す繝ｧ繝ｳ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
      throw error;
    }
  }

  /**
   * 繧ｻ繝・す繝ｧ繝ｳ隧ｳ邏ｰ繧貞叙蠕・
   */
  static async getSessionById(id: string): Promise<ChatSession | null> {
    try {
      console.log(`搭 繧ｻ繝・す繝ｧ繝ｳ隧ｳ邏ｰ蜿門ｾ・ ${id}`);

      const result = await query(
        `SELECT * FROM chat_sessions WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        console.log('笞・・ 繧ｻ繝・す繝ｧ繝ｳ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ:', id);
        return null;
      }

      const session = result.rows[0];
      console.log('笨・繧ｻ繝・す繝ｧ繝ｳ隧ｳ邏ｰ蜿門ｾ怜ｮ御ｺ・);

      return {
        id: session.id,
        title: session.title,
        machineType: session.machine_type,
        machineNumber: session.machine_number,
        status: session.status,
        metadata: session.metadata,
        createdAt: session.created_at,
        updatedAt: session.updated_at
      };
      
    } catch (error) {
      console.error('笶・繧ｻ繝・す繝ｧ繝ｳ隧ｳ邏ｰ蜿門ｾ励お繝ｩ繝ｼ:', error);
      throw error;
    }
  }

  /**
   * 繧ｻ繝・す繝ｧ繝ｳ縺ｮ螻･豁ｴ繧貞叙蠕・
   */
  static async getSessionHistory(sessionId: string): Promise<ChatHistory[]> {
    try {
      console.log(`搭 繧ｻ繝・す繝ｧ繝ｳ螻･豁ｴ蜿門ｾ・ ${sessionId}`);

      const result = await query(
        `SELECT * FROM chat_history 
         WHERE session_id = $1 
         ORDER BY created_at ASC`,
        [sessionId]
      );

      const history = result.rows.map(row => ({
        id: row.id,
        sessionId: row.session_id,
        question: row.question,
        answer: row.answer,
        imageUrl: row.image_url,
        machineType: row.machine_type,
        machineNumber: row.machine_number,
        metadata: row.metadata,
        createdAt: row.created_at
      }));

      console.log(`笨・繧ｻ繝・す繝ｧ繝ｳ螻･豁ｴ蜿門ｾ怜ｮ御ｺ・ ${history.length}莉ｶ`);
      return history;
      
    } catch (error) {
      console.error('笶・繧ｻ繝・す繝ｧ繝ｳ螻･豁ｴ蜿門ｾ励お繝ｩ繝ｼ:', error);
      throw error;
    }
  }

  /**
   * 繧ｻ繝・す繝ｧ繝ｳ繧貞炎髯､
   */
  static async deleteSession(id: string): Promise<boolean> {
    try {
      console.log(`搭 繧ｻ繝・す繝ｧ繝ｳ蜑企勁: ${id}`);

      // 繧ｻ繝・す繝ｧ繝ｳ縺ｫ髢｢騾｣縺吶ｋ逕ｻ蜒上ｒ蜑企勁
      const historyResult = await query(
        `SELECT image_url FROM chat_history WHERE session_id = $1 AND image_url IS NOT NULL`,
        [id]
      );

      // 逕ｻ蜒上ヵ繧｡繧､繝ｫ繧貞炎髯､
      for (const row of historyResult.rows) {
        if (row.image_url) {
          const filename = row.image_url.split('/').pop();
          if (filename) {
            await storageService.deleteFile(filename);
          }
        }
      }

      // 繧ｻ繝・す繝ｧ繝ｳ繧貞炎髯､・・ASCADE縺ｧ螻･豁ｴ繧ょ炎髯､縺輔ｌ繧具ｼ・
      const result = await query(
        `DELETE FROM chat_sessions WHERE id = $1 RETURNING id`,
        [id]
      );

      if (result.rows.length === 0) {
        console.log('笞・・ 蜑企勁蟇ｾ雎｡縺ｮ繧ｻ繝・す繝ｧ繝ｳ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ:', id);
        return false;
      }

      console.log('笨・繧ｻ繝・す繝ｧ繝ｳ蜑企勁螳御ｺ・', id);
      return true;
      
    } catch (error) {
      console.error('笶・繧ｻ繝・す繝ｧ繝ｳ蜑企勁繧ｨ繝ｩ繝ｼ:', error);
      throw error;
    }
  }

  /**
   * 繧ｻ繝・す繝ｧ繝ｳ繧呈峩譁ｰ
   */
  static async updateSession(id: string, data: Partial<z.infer<typeof createSessionSchema>>): Promise<ChatSession | null> {
    try {
      console.log(`搭 繧ｻ繝・す繝ｧ繝ｳ譖ｴ譁ｰ: ${id}`, data);

      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (data.title !== undefined) {
        updateFields.push(`title = $${paramIndex}`);
        params.push(data.title);
        paramIndex++;
      }

      if (data.machineType !== undefined) {
        updateFields.push(`machine_type = $${paramIndex}`);
        params.push(data.machineType);
        paramIndex++;
      }

      if (data.machineNumber !== undefined) {
        updateFields.push(`machine_number = $${paramIndex}`);
        params.push(data.machineNumber);
        paramIndex++;
      }

      if (data.metadata !== undefined) {
        updateFields.push(`metadata = $${paramIndex}`);
        params.push(JSON.stringify(data.metadata));
        paramIndex++;
      }

      if (updateFields.length === 0) {
        throw new Error('譖ｴ譁ｰ縺吶ｋ繝輔ぅ繝ｼ繝ｫ繝峨′謖・ｮ壹＆繧後※縺・∪縺帙ｓ');
      }

      params.push(id);
      const result = await query(
        `UPDATE chat_sessions 
         SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $${paramIndex}
         RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        console.log('笞・・ 譖ｴ譁ｰ蟇ｾ雎｡縺ｮ繧ｻ繝・す繝ｧ繝ｳ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ:', id);
        return null;
      }

      const session = result.rows[0];
      console.log('笨・繧ｻ繝・す繝ｧ繝ｳ譖ｴ譁ｰ螳御ｺ・', id);

      return {
        id: session.id,
        title: session.title,
        machineType: session.machine_type,
        machineNumber: session.machine_number,
        status: session.status,
        metadata: session.metadata,
        createdAt: session.created_at,
        updatedAt: session.updated_at
      };
      
    } catch (error) {
      console.error('笶・繧ｻ繝・す繝ｧ繝ｳ譖ｴ譁ｰ繧ｨ繝ｩ繝ｼ:', error);
      throw error;
    }
  }

  /**
   * 邨ｱ險域ュ蝣ｱ繧貞叙蠕・
   */
  static async getStatistics(): Promise<{
    totalSessions: number;
    todaySessions: number;
    thisWeekSessions: number;
    thisMonthSessions: number;
    totalMessages: number;
    activeSessions: number;
  }> {
    try {
      console.log('搭 螻･豁ｴ邨ｱ險域ュ蝣ｱ蜿門ｾ・);

      // 邱上そ繝・す繝ｧ繝ｳ謨ｰ
      const totalResult = await query('SELECT COUNT(*) as total FROM chat_sessions');
      const totalSessions = parseInt(totalResult.rows[0].total);

      // 莉頑律縺ｮ繧ｻ繝・す繝ｧ繝ｳ謨ｰ
      const todayResult = await query(
        'SELECT COUNT(*) as total FROM chat_sessions WHERE DATE(created_at) = CURRENT_DATE'
      );
      const todaySessions = parseInt(todayResult.rows[0].total);

      // 莉企ｱ縺ｮ繧ｻ繝・す繝ｧ繝ｳ謨ｰ
      const weekResult = await query(
        'SELECT COUNT(*) as total FROM chat_sessions WHERE created_at >= CURRENT_DATE - INTERVAL \'7 days\''
      );
      const thisWeekSessions = parseInt(weekResult.rows[0].total);

      // 莉頑怦縺ｮ繧ｻ繝・す繝ｧ繝ｳ謨ｰ
      const monthResult = await query(
        'SELECT COUNT(*) as total FROM chat_sessions WHERE created_at >= CURRENT_DATE - INTERVAL \'30 days\''
      );
      const thisMonthSessions = parseInt(monthResult.rows[0].total);

      // 邱上Γ繝・そ繝ｼ繧ｸ謨ｰ
      const messagesResult = await query('SELECT COUNT(*) as total FROM chat_history');
      const totalMessages = parseInt(messagesResult.rows[0].total);

      // 繧｢繧ｯ繝・ぅ繝悶そ繝・す繝ｧ繝ｳ謨ｰ
      const activeResult = await query(
        'SELECT COUNT(*) as total FROM chat_sessions WHERE status = \'active\''
      );
      const activeSessions = parseInt(activeResult.rows[0].total);

      console.log('笨・邨ｱ險域ュ蝣ｱ蜿門ｾ怜ｮ御ｺ・);

      return {
        totalSessions,
        todaySessions,
        thisWeekSessions,
        thisMonthSessions,
        totalMessages,
        activeSessions
      };
      
    } catch (error) {
      console.error('笶・邨ｱ險域ュ蝣ｱ蜿門ｾ励お繝ｩ繝ｼ:', error);
      throw error;
    }
  }

  /**
   * CSV繧ｨ繧ｯ繧ｹ繝昴・繝育畑繝・・繧ｿ繧貞叙蠕・
   */
  static async getExportData(sessionId: string): Promise<{
    session: ChatSession;
    history: ChatHistory[];
  } | null> {
    try {
      console.log(`搭 繧ｨ繧ｯ繧ｹ繝昴・繝医ョ繝ｼ繧ｿ蜿門ｾ・ ${sessionId}`);

      const session = await this.getSessionById(sessionId);
      if (!session) {
        return null;
      }

      const history = await this.getSessionHistory(sessionId);

      return {
        session,
        history
      };
      
    } catch (error) {
      console.error('笶・繧ｨ繧ｯ繧ｹ繝昴・繝医ョ繝ｼ繧ｿ蜿門ｾ励お繝ｩ繝ｼ:', error);
      throw error;
    }
  }
} 