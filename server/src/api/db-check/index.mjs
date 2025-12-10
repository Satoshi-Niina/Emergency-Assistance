import { dbPool } from '../../infra/db.mjs';

export default async function (req, res) {
  try {
    console.log('[db-check] Database connection check request');

    // OPTIONSリクエストの処理
    if (req.method === 'OPTIONS') {
      res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
        'Access-Control-Max-Age': '86400',
      });
      return res.status(200).send('');
    }

    // データベースプールの確認
    if (!dbPool) {
      console.warn('[db-check] Database pool not initialized');
      return res.status(200).json({
        success: false,
        status: 'ERROR',
        message: 'データベース接続プールが初期化されていません',
        timestamp: new Date().toISOString()
      });
    }

    // 実際のデータベース接続テスト
    const timeout = 15000;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database connection timeout')), timeout);
    });

    const queryPromise = dbPool.query('SELECT NOW() as current_time, version() as version');

    const result = await Promise.race([queryPromise, timeoutPromise]);
    console.log('[db-check] Database connection successful');

    return res.status(200).json({
      success: true,
      status: 'OK',
      message: 'データベース接続は正常です',
      db_time: result.rows[0].current_time,
      version: result.rows[0].version,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[db-check] Error:', error.message);
    return res.status(200).json({
      success: false,
      status: 'ERROR',
      message: 'データベース接続に失敗しました',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
