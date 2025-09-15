const { app } = require('@azure/functions');
const { db } = require('../../server/db/index.js');

app.http('machines', {
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    authLevel: 'anonymous',
    route: 'machines',
    handler: async (request, context) => {
        try {
            context.log('Machines HTTP trigger function processed a request.');

            // 生のSQLクエリで直接データを取得
            const machines = await db.execute(`
                SELECT m.id, m.machine_number, m.machine_type_id, 
                       mt.machine_type_name, m.created_at
                FROM machines m
                LEFT JOIN machine_types mt ON m.machine_type_id = mt.id
                ORDER BY m.created_at DESC
            `);

            context.log('Machines query result:', {
                count: machines.length,
                machines: machines
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
                    data: machines,
                    total: machines.length,
                    timestamp: new Date().toISOString()
                })
            };
        } catch (error) {
            context.log.error('Error in machines function:', error);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: '機械一覧の取得に失敗しました',
                    details: error.message,
                    timestamp: new Date().toISOString()
                })
            };
        }
    }
});
