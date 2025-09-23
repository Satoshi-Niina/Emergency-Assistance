const { db } = require('../db/index.js');

module.exports = async function (context, req) {
  try {
    context.log('Knowledge base HTTP trigger function processed a request.');

    // 生のSQLクエリで直接データを取得
    const knowledgeData = await db.execute(`
            SELECT id, title, content, category, created_at
            FROM base_documents
            ORDER BY created_at DESC
        `);

    context.log('Knowledge base query result:', {
      count: knowledgeData.length,
      data: knowledgeData,
    });

    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({
        success: true,
        data: knowledgeData,
        total: knowledgeData.length,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    context.log.error('Error in knowledge base function:', error);
    context.res = {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'ナレッジデータの取得に失敗しました',
        details: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
