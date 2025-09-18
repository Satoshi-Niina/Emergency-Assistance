module.exports = async (context, request) => {
        try {
            context.log('Data Processor HTTP trigger function processed a request.');

            // OPTIONSリクエストの処理
            if (request.method === 'OPTIONS') {
                return {
                    status: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
                        'Access-Control-Max-Age': '86400'
                    },
                    body: ''
                };
            }

            const action = request.params.action;
            const method = request.method;
            
            context.log('Data Processor request:', { method, action });

            // POST /api/data-processor/process - データ処理
            if (method === 'POST' && action === 'process') {
                const body = await request.json();
                
                const processingResult = {
                    success: true,
                    message: 'データの処理が完了しました',
                    processedData: {
                        id: `processed-${Date.now()}`,
                        originalSize: body.data?.length || 0,
                        processedSize: (body.data?.length || 0) * 0.8,
                        processingTime: Math.random() * 1000,
                        status: 'completed',
                        metadata: {
                            type: body.type || 'general',
                            category: body.category || 'unknown',
                            processedAt: new Date().toISOString()
                        }
                    },
                    statistics: {
                        totalItems: 1,
                        successfulItems: 1,
                        failedItems: 0,
                        processingTime: Math.random() * 1000
                    }
                };

                return {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie'
                    },
                    body: JSON.stringify(processingResult)
                };
            }

            // GET /api/data-processor/status - 処理状況取得
            if (method === 'GET' && action === 'status') {
                const status = {
                    isProcessing: false,
                    queueLength: 0,
                    lastProcessed: new Date().toISOString(),
                    totalProcessed: 100,
                    successRate: 0.95
                };

                return {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie'
                    },
                    body: JSON.stringify({
                        success: true,
                        data: status
                    })
                };
            }

            return {
                status: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Not found'
                })
            };

        } catch (error) {
            context.log.error('Error in data processor function:', error);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'データ処理に失敗しました',
                    details: error.message,
                    timestamp: new Date().toISOString()
                })
            };
        }
};