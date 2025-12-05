/**
 * Machines API - 機械管理
 * GET /api/machines - 機械一覧取得
 * POST /api/machines - 機械新規登録
 * PUT /api/machines/:id - 機械情報更新
 * DELETE /api/machines/:id - 機械削除
 * GET /api/machines/machine-types - 機械タイプ一覧
 * POST /api/machines/machine-types - 機械タイプ新規登録
 * PUT /api/machines/machine-types/:id - 機械タイプ更新
 * DELETE /api/machines/machine-types/:id - 機械タイプ削除
 */

import { db } from '../db/index.mjs';

export default async function machinesHandler(req, res) {
  const method = req.method;
  const pathParts = req.path.split('/').filter(p => p);
  const id = req.params.id;

  console.log('[api/machines] Request:', { method, path: req.path, pathParts, id });

  try {
    // GET /api/machines/machine-types - 機械タイプ一覧
    if (method === 'GET' && pathParts[2] === 'machine-types' && !id) {
      const rows = await db.execute(`
        SELECT id, machine_type_name, created_at
        FROM machine_types
        ORDER BY machine_type_name ASC
      `);

      return res.json({
        success: true,
        data: rows,
        total: rows.length,
        timestamp: new Date().toISOString(),
      });
    }

    // POST /api/machines/machine-types - 機械タイプ新規登録
    if (method === 'POST' && pathParts[2] === 'machine-types') {
      const { machine_type_name } = req.body;

      if (!machine_type_name) {
        return res.status(400).json({
          success: false,
          error: '機械タイプ名が必要です',
        });
      }

      const rows = await db.execute(
        `INSERT INTO machine_types (machine_type_name) VALUES ($1) RETURNING *`,
        [machine_type_name]
      );

      return res.json({
        success: true,
        data: rows[0],
        message: '機械タイプを登録しました',
      });
    }

    // PUT /api/machines/machine-types/:id - 機械タイプ更新
    if (method === 'PUT' && pathParts[2] === 'machine-types' && id) {
      const { machine_type_name } = req.body;

      if (!machine_type_name) {
        return res.status(400).json({
          success: false,
          error: '機械タイプ名が必要です',
        });
      }

      const rows = await db.execute(
        `UPDATE machine_types SET machine_type_name = $1 WHERE id = $2 RETURNING *`,
        [machine_type_name, id]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '機械タイプが見つかりません',
        });
      }

      return res.json({
        success: true,
        data: rows[0],
        message: '機械タイプを更新しました',
      });
    }

    // DELETE /api/machines/machine-types/:id - 機械タイプ削除
    if (method === 'DELETE' && pathParts[2] === 'machine-types' && id) {
      const rows = await db.execute(
        `DELETE FROM machine_types WHERE id = $1 RETURNING *`,
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '機械タイプが見つかりません',
        });
      }

      return res.json({
        success: true,
        message: '機械タイプを削除しました',
      });
    }

    // GET /api/machines - 機械一覧取得
    if (method === 'GET' && pathParts.length === 2) {
      const rows = await db.execute(`
        SELECT m.id, m.machine_number, m.machine_type_id,
               mt.machine_type_name, m.created_at
        FROM machines m
        LEFT JOIN machine_types mt ON m.machine_type_id = mt.id
        ORDER BY m.created_at DESC
      `);

      return res.json({
        success: true,
        data: rows,
        total: rows.length,
        timestamp: new Date().toISOString(),
      });
    }

    // POST /api/machines - 機械新規登録
    if (method === 'POST' && pathParts.length === 2) {
      const { machine_number, machine_type_id } = req.body;

      if (!machine_number || !machine_type_id) {
        return res.status(400).json({
          success: false,
          error: '機械番号と機械タイプIDが必要です',
        });
      }

      const rows = await db.execute(
        `INSERT INTO machines (machine_number, machine_type_id) VALUES ($1, $2) RETURNING *`,
        [machine_number, machine_type_id]
      );

      return res.json({
        success: true,
        data: rows[0],
        message: '機械を登録しました',
      });
    }

    // PUT /api/machines/:id - 機械情報更新
    if (method === 'PUT' && id) {
      const { machine_number, machine_type_id } = req.body;

      if (!machine_number || !machine_type_id) {
        return res.status(400).json({
          success: false,
          error: '機械番号と機械タイプIDが必要です',
        });
      }

      const rows = await db.execute(
        `UPDATE machines SET machine_number = $1, machine_type_id = $2 WHERE id = $3 RETURNING *`,
        [machine_number, machine_type_id, id]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '機械が見つかりません',
        });
      }

      return res.json({
        success: true,
        data: rows[0],
        message: '機械情報を更新しました',
      });
    }

    // DELETE /api/machines/:id - 機械削除
    if (method === 'DELETE' && id) {
      const rows = await db.execute(
        `DELETE FROM machines WHERE id = $1 RETURNING *`,
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '機械が見つかりません',
        });
      }

      return res.json({
        success: true,
        message: '機械を削除しました',
      });
    }

    return res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      path: req.path,
    });

  } catch (error) {
    console.error('[api/machines] Error:', error);
    return res.status(500).json({
      success: false,
      error: '機械管理処理に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

export const methods = ['get', 'post', 'put', 'delete'];
