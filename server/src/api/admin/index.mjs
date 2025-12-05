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
      // 簡易的な統計情報を返す
      const userCount = await dbQuery('SELECT COUNT(*) as count FROM users');
      const machineCount = await dbQuery('SELECT COUNT(*) as count FROM machines');
      const historyCount = await dbQuery('SELECT COUNT(*) as count FROM chat_history');

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
      return res.status(500).json({
        success: false,
        error: 'Dashboard data fetch failed',
        details: error.message
      });
    }
  }

  return res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
}
