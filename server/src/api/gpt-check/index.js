module.exports = async (context, request) => {
        try {
            context.log('GPT Check HTTP trigger function processed a request.');

            // OPTIONSリクエストの処理
            if (request.method === 'OPTIONS') {
                return {
                    status: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
                        'Access-Control-Max-Age': '86400'
                    },
                    body: ''
                };
            }

            // GPT API接続チェックのモック
            const gptCheckResult = {
                success: true,
                message: 'GPT API接続は正常です',
                checks: [
                    {
                        name: 'API Key Validation',
                        status: 'passed',
                        message: 'APIキーが有効です',
                        responseTime: Math.random() * 50
                    },
                    {
                        name: 'Model Availability',
                        status: 'passed',
                        message: 'モデルが利用可能です',
                        responseTime: Math.random() * 100
                    },
                    {
                        name: 'Rate Limit Check',
                        status: 'passed',
                        message: 'レート制限内です',
                        responseTime: Math.random() * 30
                    }
                ],
                overallStatus: 'healthy',
                timestamp: new Date().toISOString(),
                api: {
                    provider: 'OpenAI',
                    model: 'gpt-3.5-turbo',
                    version: '3.5',
                    endpoint: 'https://api.openai.com/v1/chat/completions'
                },
                usage: {
                    requestsToday: 150,
                    tokensUsed: 50000,
                    remainingQuota: 950000
                }
            };

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie'
                },
                body: JSON.stringify(gptCheckResult)
            };

        } catch (error) {
            context.log.error('Error in gpt check function:', error);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'GPT APIチェックに失敗しました',
                    details: error.message,
                    timestamp: new Date().toISOString()
                })
            };
         }
};