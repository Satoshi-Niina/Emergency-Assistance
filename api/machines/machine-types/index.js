const { app } = require('@azure/functions');
const { db } = require('../../../server/db/index.js');

app.http('machineTypes', {
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    authLevel: 'anonymous',
    route: 'machines/machine-types',
    handler: async (request, context) => {
        try {
            context.log('Machine types HTTP trigger function processed a request.');

            // 生のSQLクエリで直接データを取得
            const machineTypes = await db.execute(`
                SELECT id, machine_type_name, created_at
                FROM machine_types
                ORDER BY created_at DESC
            `);

            context.log('Machine types query result:', {
                count: machineTypes.length,
                types: machineTypes
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
                    data: machineTypes,
                    total: machineTypes.length,
                    timestamp: new Date().toISOString()
                })
            };
        } catch (error) {
            context.log.error('Error in machine types function:', error);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: '機種一覧の取得に失敗しました',
                    details: error.message,
                    timestamp: new Date().toISOString()
                })
            };
        }
    }
});
