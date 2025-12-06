/**
 * Admin API
 */

import { dbQuery } from '../../infra/db.mjs';

export default async function adminHandler(req, res) {
  const method = req.method;
  const pathParts = req.path.split('/').filter(p => p);
  const action = pathParts.length > 2 ? pathParts[2] : null;

  console.log('[api/admin] Request:', { method, action, path: req.path });

  if (method === 'GET' && action === 'dashboard') {
    try {
      // 簡易的な統計情報を返す（DBが落ちていてもゼロで返す）
      const userCount = await dbQuery('SELECT COUNT(*) as count FROM users').catch(() => ({ rows: [{ count: 0 }] }));
      const machineCount = await dbQuery('SELECT COUNT(*) as count FROM machines').catch(() => ({ rows: [{ count: 0 }] }));
      const historyCount = await dbQuery('SELECT COUNT(*) as count FROM chat_history').catch(() => ({ rows: [{ count: 0 }] }));

      return res.json({
        success: true,
        stats: {
          users: parseInt(userCount.rows[0].count),
          machines: parseInt(machineCount.rows[0].count),
          history: parseInt(historyCount.rows[0].count),
          uptime: process.uptime()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[api/admin] Dashboard error:', error);
      return res.json({
        success: true,
        stats: {
          users: 0,
          machines: 0,
          history: 0,
          uptime: process.uptime()
        },
        warning: 'DB unreachable, returning zero stats',
        timestamp: new Date().toISOString()
      });
    }
  }

  return res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
}

export const methods = ['get'];
