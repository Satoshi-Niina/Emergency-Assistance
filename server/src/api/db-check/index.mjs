import { getDbPool } from '../../infra/db.mjs';

export default async function (req, res) {
  try {
    console.log('[db-check] データベース接続チェック開始');
    console.log('[db-check] Environment:', process.env.NODE_ENV);
    console.log('[db-check] DATABASE_URL set:', !!process.env.DATABASE_URL);

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

    // データベース接続プールを取得
    const dbPool = getDbPool();
    if (!dbPool) {
      console.warn('[db-check] データベースプールが初期化されていません');
      return res.status(200).json({
        success: false,
        status: 'ERROR',
        message: 'データベース接続プールが初期化されていません',
        error: 'Database pool not initialized',
        details: {
          environment: process.env.NODE_ENV || 'development',
          database_url_set: !!process.env.DATABASE_URL
        },
        timestamp: new Date().toISOString()
      });
    }

    // 実際のデータベース接続テスト
    const timeout = 15000; // 15秒
    console.log(`[db-check] タイムアウト設定: ${timeout}ms`);
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database connection timeout')), timeout);
    });

    const queryPromise = dbPool.query('SELECT NOW() as current_time, version() as version');

    console.log('[db-check] クエリ実行中...');
    const result = await Promise.race([queryPromise, timeoutPromise]);
    console.log('[db-check] クエリ成功');

    return res.status(200).json({
      success: true,
      status: 'OK',
      message: 'データベース接続チェック成功',
      db_time: result.rows[0].current_time,
      version: result.rows[0].version,
      details: {
        environment: process.env.NODE_ENV || 'development',
        database: 'connected',
        current_time: result.rows[0].current_time,
        version: result.rows[0].version
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[db-check] エラー発生:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack
    });
    
    return res.status(200).json({
      success: false,
      status: 'ERROR',
      message: error.message || 'データベース接続チェック失敗',
      error: error.message,
      details: {
        environment: process.env.NODE_ENV || 'development',
        database: 'connection_failed',
        error_type: error.constructor.name,
        error_code: error.code,
        database_url_set: !!process.env.DATABASE_URL
      },
      timestamp: new Date().toISOString()
    });
  }
}
