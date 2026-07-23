import { db } from '../db/index.mjs';

export default async function (req, res) {
  console.log('Health check HTTP trigger function processed a request.');

  // OPTIONSリクエストの処理
  if (req.method === 'OPTIONS') {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }).send('');
    return;
  }

  // データベース接続テスト
  let dbStatus = 'unknown';
  let dbError = null;
  try {
    await db.execute('SELECT 1 as test');
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'error';
    dbError = error.message;
    console.warn('Database connection test failed:', error.message);
  }

  const overallStatus = (dbStatus === 'connected' || dbStatus === 'unknown')
    ? 'healthy'
    : 'degraded';

  res.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: dbStatus, error: dbError }
    }
  });
}
