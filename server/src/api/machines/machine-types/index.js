const { app } = require('@azure/functions');
const { db } = require('../../db/index.js');

app.http('machinesMachineTypes', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'machines/machine-types',
    handler: async (request, context) => {
        try {
            context.log('Machine types HTTP trigger function processed a request.');

            // OPTIONSリクエストの処理
            if (request.method === 'OPTIONS') {
                return {
                    status: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
                        'Access-Control-Max-Age': '86400'
                    },
                    body: ''
                };
            }

            // データベースから機械タイプを取得
            let machineTypes;
            try {
                const result = await db.execute(`
                    SELECT id, name, description, category, specifications, maintenance_interval, created_at, updated_at
                    FROM machine_types
                    ORDER BY category, name
                `);

                machineTypes = result.map(row => ({
                    id: row.id,
                    name: row.name,
                    description: row.description,
                    category: row.category,
                    specifications: row.specifications ? JSON.parse(row.specifications) : {},
                    maintenanceInterval: row.maintenance_interval,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                }));

            } catch (dbError) {
                context.log.warn('Database query failed, using sample data:', dbError.message);
                
                // データベースエラーの場合はサンプルデータを返す
                machineTypes = [
                    {
                        id: 1,
                        name: '保守用車両A型',
                        description: '緊急時対応用の保守車両',
                        category: 'vehicle',
                        specifications: {
                            engine: 'ディーゼル',
                            capacity: '4人乗り',
                            equipment: ['工具セット', '応急処置キット']
                        },
                        maintenanceInterval: 30,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    },
                    {
                        id: 2,
                        name: '保守用車両B型',
                        description: '大型保守作業用車両',
                        category: 'vehicle',
                        specifications: {
                            engine: 'ディーゼル',
                            capacity: '6人乗り',
                            equipment: ['大型工具', 'クレーン', '照明設備']
                        },
                        maintenanceInterval: 45,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    },
                    {
                        id: 3,
                        name: '信号機保守用機器',
                        description: '信号機の点検・保守用機器',
                        category: 'equipment',
                        specifications: {
                            type: '電子機器',
                            voltage: '100V',
                            features: ['自動点検', 'リモート監視']
                        },
                        maintenanceInterval: 14,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }
                ];
            }

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: true,
                    data: machineTypes,
                    count: machineTypes.length,
                    message: '機械タイプ一覧を取得しました'
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
                    error: '機械タイプの取得に失敗しました',
                    details: error.message
                })
            };
        }};