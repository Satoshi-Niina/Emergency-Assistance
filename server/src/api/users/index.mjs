// ESM形式 - Expressルートハンドラー
// 自動ルーティングシステムにより /api/users にマッピングされます

import { dbQuery } from '../../../db/index.js';

// デフォルトエクスポート: Expressルートハンドラー関数
export default async function usersHandler(req, res) {
  try {
    const method = req.method;
    
    // GETリクエスト: ユーザー一覧取得
    if (method === 'GET') {
      console.log('[api/users] Fetching all users');
      
      try {
        // 生のSQLクエリで直接データを取得
        const result = await dbQuery(`
          SELECT id, username, display_name, role, department, description, created_at
          FROM users
          ORDER BY created_at DESC
        `);

        const allUsers = result?.rows || [];

        console.log('[api/users] Users found:', {
          count: allUsers.length,
          users: allUsers.map(u => ({
            id: u.id,
            username: u.username,
            role: u.role,
          })),
        });

        return res.status(200).json({
          success: true,
          data: allUsers,
          total: allUsers.length,
          timestamp: new Date().toISOString(),
        });
      } catch (dbError) {
        console.error('[api/users] Database error:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Database query failed',
          details: dbError.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // その他のメソッドは未実装
    return res.status(405).json({
      success: false,
      error: `Method ${method} not allowed`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[api/users] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// サポートするHTTPメソッドを指定（オプション）
export const methods = ['get', 'post'];
