const { app } = require('@azure/functions');
const { db } = require('../../server/db/index.js');

app.http('knowledgeBase', {
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    authLevel: 'anonymous',
    route: 'knowledge-base',
    handler: async (request, context) => {
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
                data: knowledgeData
            });

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                },
                body: JSON.stringify({
                    success: true,
                    data: knowledgeData,
                    total: knowledgeData.length,
                    timestamp: new Date().toISOString()
                })
            };
        } catch (error) {
            context.log.error('Error in knowledge base function:', error);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'ナレッジデータの取得に失敗しました',
                    details: error.message,
                    timestamp: new Date().toISOString()
                })
            };
        }
    }
});
