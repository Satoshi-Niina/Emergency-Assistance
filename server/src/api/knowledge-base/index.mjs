import { dbQuery } from '../../infra/db.mjs';

export default async function (req, res) {
  try {
    console.log('Knowledge base HTTP trigger function processed a request.');

    // 生のSQLクエリで直接データを取得
    const result = await dbQuery(`
            SELECT id, title, content, category, created_at
            FROM base_documents
            ORDER BY created_at DESC
        `);

    console.log('Knowledge base query result:', {
      count: result.rows.length,
    });

    res.set({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in knowledge base function:', error);
    res.status(500).set({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }).json({
      success: false,
      error: 'ナレッジデータの取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
