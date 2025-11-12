"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HistoryService = void 0;
const db_js_1 = require("../db/db.js");
const storageService_js_1 = require("./storageService.js");
const zod_1 = require("zod");
// バリデーションスキーマ
const createSessionSchema = zod_1.z.object({
    title: zod_1.z.string().optional(),
    machineType: zod_1.z.string().optional(),
    machineNumber: zod_1.z.string().optional(),
    metadata: zod_1.z.any().optional(),
});
const createHistorySchema = zod_1.z.object({
    sessionId: zod_1.z.string().uuid('セッションIDはUUID形式である必要があります'),
    question: zod_1.z.string().min(1, '質問は必須です'),
    answer: zod_1.z.string().optional(),
    imageBase64: zod_1.z.string().optional(),
    machineType: zod_1.z.string().optional(),
    machineNumber: zod_1.z.string().optional(),
    metadata: zod_1.z.any().optional(),
});
const searchHistorySchema = zod_1.z.object({
    machineType: zod_1.z.string().optional(),
    machineNumber: zod_1.z.string().optional(),
    status: zod_1.z.enum(['active', 'completed', 'archived']).optional(),
    limit: zod_1.z.number().min(1).max(100).default(20),
    offset: zod_1.z.number().min(0).default(0),
});
class HistoryService {
    /**
     * チャットセッションを作成
     */
    static async createSession(data) {
        try {
            console.log('📋 新規チャットセッション作成:', data);
            // バリデーション
            const validationResult = createSessionSchema.safeParse(data);
            if (!validationResult.success) {
                throw new Error(`バリデーションエラー: ${validationResult.error.errors.map(e => e.message).join(', ')}`);
            }
            const { title, machineType, machineNumber, metadata } = validationResult.data;
            // セッションを作成
            const result = await (0, db_js_1.query)(`INSERT INTO chat_sessions (title, machine_type, machine_number, metadata)
         VALUES ($1, $2, $3, $4)
         RETURNING *`, [
                title,
                machineType,
                machineNumber,
                metadata ? JSON.stringify(metadata) : null,
            ]);
            const session = result.rows[0];
            console.log('✅ チャットセッション作成完了:', session.id);
            return {
                id: session.id,
                title: session.title,
                machineType: session.machine_type,
                machineNumber: session.machine_number,
                status: session.status,
                metadata: session.metadata,
                createdAt: session.created_at,
                updatedAt: session.updated_at,
            };
        }
        catch (error) {
            console.error('❌ チャットセッション作成エラー:', error);
            throw error;
        }
    }
    /**
     * チャット履歴を作成
     */
    static async createHistory(data) {
        try {
            console.log('📋 新規チャット履歴作成:', data);
            // バリデーション
            const validationResult = createHistorySchema.safeParse(data);
            if (!validationResult.success) {
                throw new Error(`バリデーションエラー: ${validationResult.error.errors.map(e => e.message).join(', ')}`);
            }
            const { sessionId, question, answer, imageBase64, machineType, machineNumber, metadata, } = validationResult.data;
            let imageUrl;
            // 画像がある場合はストレージに保存
            if (imageBase64) {
                const uploadResult = await storageService_js_1.storageService.saveBase64Image(imageBase64);
                imageUrl = uploadResult.url;
            }
            // 履歴を保存
            const result = await (0, db_js_1.query)(`INSERT INTO chat_history (session_id, question, answer, image_url, machine_type, machine_number, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`, [
                sessionId,
                question,
                answer,
                imageUrl,
                machineType,
                machineNumber,
                metadata ? JSON.stringify(metadata) : null,
            ]);
            const history = result.rows[0];
            console.log('✅ チャット履歴作成完了:', history.id);
            return {
                id: history.id,
                sessionId: history.session_id,
                question: history.question,
                answer: history.answer,
                imageUrl: history.image_url,
                machineType: history.machine_type,
                machineNumber: history.machine_number,
                metadata: history.metadata,
                createdAt: history.created_at,
            };
        }
        catch (error) {
            console.error('❌ チャット履歴作成エラー:', error);
            throw error;
        }
    }
    /**
     * セッション一覧を取得
     */
    static async getSessionList(searchParams) {
        try {
            console.log('📋 セッション一覧取得:', searchParams);
            // バリデーション
            const validationResult = searchHistorySchema.safeParse(searchParams);
            if (!validationResult.success) {
                throw new Error(`バリデーションエラー: ${validationResult.error.errors.map(e => e.message).join(', ')}`);
            }
            const { machineType, machineNumber, status, limit = 20, offset = 0, } = validationResult.data;
            // 検索条件を構築
            const conditions = [];
            const queryParams = [];
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
            // セッション一覧を取得（ビューを使用）
            const result = await (0, db_js_1.query)(`SELECT * FROM chat_session_summary ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...queryParams, limit, offset]);
            // 総件数を取得
            const countResult = await (0, db_js_1.query)(`SELECT COUNT(*) as total FROM chat_sessions ${whereClause}`, queryParams);
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
                lastMessageAt: row.last_message_at,
            }));
            console.log(`✅ セッション一覧取得完了: ${items.length}件 (全${total}件)`);
            return {
                items,
                total,
                page,
                totalPages,
            };
        }
        catch (error) {
            console.error('❌ セッション一覧取得エラー:', error);
            throw error;
        }
    }
    /**
     * セッション詳細を取得
     */
    static async getSessionById(id) {
        try {
            console.log(`📋 セッション詳細取得: ${id}`);
            const result = await (0, db_js_1.query)(`SELECT * FROM chat_sessions WHERE id = $1`, [
                id,
            ]);
            if (result.rows.length === 0) {
                console.log('⚠️  セッションが見つかりません:', id);
                return null;
            }
            const session = result.rows[0];
            console.log('✅ セッション詳細取得完了');
            return {
                id: session.id,
                title: session.title,
                machineType: session.machine_type,
                machineNumber: session.machine_number,
                status: session.status,
                metadata: session.metadata,
                createdAt: session.created_at,
                updatedAt: session.updated_at,
            };
        }
        catch (error) {
            console.error('❌ セッション詳細取得エラー:', error);
            throw error;
        }
    }
    /**
     * セッションの履歴を取得
     */
    static async getSessionHistory(sessionId) {
        try {
            console.log(`📋 セッション履歴取得: ${sessionId}`);
            const result = await (0, db_js_1.query)(`SELECT * FROM chat_history 
         WHERE session_id = $1 
         ORDER BY created_at ASC`, [sessionId]);
            const history = result.rows.map(row => ({
                id: row.id,
                sessionId: row.session_id,
                question: row.question,
                answer: row.answer,
                imageUrl: row.image_url,
                machineType: row.machine_type,
                machineNumber: row.machine_number,
                metadata: row.metadata,
                createdAt: row.created_at,
            }));
            console.log(`✅ セッション履歴取得完了: ${history.length}件`);
            return history;
        }
        catch (error) {
            console.error('❌ セッション履歴取得エラー:', error);
            throw error;
        }
    }
    /**
     * セッションを削除
     */
    static async deleteSession(id) {
        try {
            console.log(`📋 セッション削除: ${id}`);
            // セッションに関連する画像を削除
            const historyResult = await (0, db_js_1.query)(`SELECT image_url FROM chat_history WHERE session_id = $1 AND image_url IS NOT NULL`, [id]);
            // 画像ファイルを削除
            for (const row of historyResult.rows) {
                if (row.image_url) {
                    const filename = row.image_url.split('/').pop();
                    if (filename) {
                        await storageService_js_1.storageService.deleteFile(filename);
                    }
                }
            }
            // セッションを削除（CASCADEで履歴も削除される）
            const result = await (0, db_js_1.query)(`DELETE FROM chat_sessions WHERE id = $1 RETURNING id`, [id]);
            if (result.rows.length === 0) {
                console.log('⚠️  削除対象のセッションが見つかりません:', id);
                return false;
            }
            console.log('✅ セッション削除完了:', id);
            return true;
        }
        catch (error) {
            console.error('❌ セッション削除エラー:', error);
            throw error;
        }
    }
    /**
     * セッションを更新
     */
    static async updateSession(id, data) {
        try {
            console.log(`📋 セッション更新: ${id}`, data);
            const updateFields = [];
            const params = [];
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
                throw new Error('更新するフィールドが指定されていません');
            }
            params.push(id);
            const result = await (0, db_js_1.query)(`UPDATE chat_sessions 
         SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $${paramIndex}
         RETURNING *`, params);
            if (result.rows.length === 0) {
                console.log('⚠️  更新対象のセッションが見つかりません:', id);
                return null;
            }
            const session = result.rows[0];
            console.log('✅ セッション更新完了:', id);
            return {
                id: session.id,
                title: session.title,
                machineType: session.machine_type,
                machineNumber: session.machine_number,
                status: session.status,
                metadata: session.metadata,
                createdAt: session.created_at,
                updatedAt: session.updated_at,
            };
        }
        catch (error) {
            console.error('❌ セッション更新エラー:', error);
            throw error;
        }
    }
    /**
     * 統計情報を取得
     */
    static async getStatistics() {
        try {
            console.log('📋 履歴統計情報取得');
            // 総セッション数
            const totalResult = await (0, db_js_1.query)('SELECT COUNT(*) as total FROM chat_sessions');
            const totalSessions = parseInt(totalResult.rows[0].total);
            // 今日のセッション数
            const todayResult = await (0, db_js_1.query)('SELECT COUNT(*) as total FROM chat_sessions WHERE DATE(created_at) = CURRENT_DATE');
            const todaySessions = parseInt(todayResult.rows[0].total);
            // 今週のセッション数
            const weekResult = await (0, db_js_1.query)("SELECT COUNT(*) as total FROM chat_sessions WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'");
            const thisWeekSessions = parseInt(weekResult.rows[0].total);
            // 今月のセッション数
            const monthResult = await (0, db_js_1.query)("SELECT COUNT(*) as total FROM chat_sessions WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'");
            const thisMonthSessions = parseInt(monthResult.rows[0].total);
            // 総メッセージ数
            const messagesResult = await (0, db_js_1.query)('SELECT COUNT(*) as total FROM chat_history');
            const totalMessages = parseInt(messagesResult.rows[0].total);
            // アクティブセッション数
            const activeResult = await (0, db_js_1.query)("SELECT COUNT(*) as total FROM chat_sessions WHERE status = 'active'");
            const activeSessions = parseInt(activeResult.rows[0].total);
            console.log('✅ 統計情報取得完了');
            return {
                totalSessions,
                todaySessions,
                thisWeekSessions,
                thisMonthSessions,
                totalMessages,
                activeSessions,
            };
        }
        catch (error) {
            console.error('❌ 統計情報取得エラー:', error);
            throw error;
        }
    }
    /**
     * CSVエクスポート用データを取得
     */
    static async getExportData(sessionId) {
        try {
            console.log(`📋 エクスポートデータ取得: ${sessionId}`);
            const session = await this.getSessionById(sessionId);
            if (!session) {
                return null;
            }
            const history = await this.getSessionHistory(sessionId);
            return {
                session,
                history,
            };
        }
        catch (error) {
            console.error('❌ エクスポートデータ取得エラー:', error);
            throw error;
        }
    }
}
exports.HistoryService = HistoryService;
