// ESM形式 - Expressルートハンドラー
// 自動ルーティングシステムにより /api/users にマッピングされます

import { dbQuery } from '../../infra/db.mjs';
import bcrypt from 'bcryptjs';

// デフォルトエクスポート: Expressルートハンドラー関数
export default async function usersHandler(req, res) {
  try {
    const method = req.method;
    const id = req.params.id || req.path.split('/').pop();
    
    // GETリクエスト: ユーザー一覧取得
    if (method === 'GET' && (!id || id === 'users')) {
      console.log('[api/users] Fetching all users');
      
      try {
        // 生のSQLクエリで直接データを取得
        const result = await dbQuery(`
          SELECT id, username, display_name, role, department, description, created_at
          FROM users
          ORDER BY created_at DESC
        `);

        return res.status(200).json({
          success: true,
          data: result.rows,
          total: result.rows.length,
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

    // POSTリクエスト: ユーザー作成
    if (method === 'POST') {
      const { username, password, display_name, role, department, description } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username and password are required' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      try {
        const result = await dbQuery(
          `INSERT INTO users (username, password, display_name, role, department, description)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, username, display_name, role, department, created_at`,
          [username, hashedPassword, display_name, role || 'user', department, description]
        );
        
        return res.status(201).json({
          success: true,
          data: result.rows[0],
          message: 'User created successfully'
        });
      } catch (err) {
        console.error('[api/users] Create error:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    // DELETEリクエスト: ユーザー削除
    if (method === 'DELETE' && id) {
      try {
        await dbQuery('DELETE FROM users WHERE id = $1', [id]);
        return res.json({ success: true, message: 'User deleted' });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    // PUTリクエスト: ユーザー更新
    if (method === 'PUT' && id) {
      const { password, display_name, role, department, description } = req.body;
      
      try {
        let query = 'UPDATE users SET ';
        const params = [];
        const updates = [];
        let paramIndex = 1;

        if (password) {
          const hashedPassword = await bcrypt.hash(password, 10);
          updates.push(`password = $${paramIndex++}`);
          params.push(hashedPassword);
        }
        if (display_name !== undefined) {
          updates.push(`display_name = $${paramIndex++}`);
          params.push(display_name);
        }
        if (role !== undefined) {
          updates.push(`role = $${paramIndex++}`);
          params.push(role);
        }
        if (department !== undefined) {
          updates.push(`department = $${paramIndex++}`);
          params.push(department);
        }
        if (description !== undefined) {
          updates.push(`description = $${paramIndex++}`);
          params.push(description);
        }

        if (updates.length === 0) {
          return res.status(400).json({ success: false, error: 'No fields to update' });
        }

        query += updates.join(', ') + ` WHERE id = $${paramIndex} RETURNING id, username, display_name, role, department`;
        params.push(id);

        const result = await dbQuery(query, params);
        
        if (result.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'User not found' });
        }

        return res.json({
          success: true,
          data: result.rows[0],
          message: 'User updated successfully'
        });
      } catch (err) {
        console.error('[api/users] Update error:', err);
        return res.status(500).json({ success: false, error: err.message });
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
// 本番サーバーでも PUT / DELETE を受け付けるように拡張
export const methods = ['get', 'post', 'put', 'delete'];
