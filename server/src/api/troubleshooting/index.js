const { app } = require('@azure/functions');

app.http('troubleshooting', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'troubleshooting/{id?}',
    handler: async (request, context) => {
        try {
            context.log('Troubleshooting HTTP trigger function processed a request.');

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

            const id = request.params.id;
            context.log('Troubleshooting ID:', id);

            // IDが指定されていない場合は一覧を返す
            if (!id) {
                return {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie'
                    },
                    body: JSON.stringify({
                        success: true,
                        data: [
                            {
                                id: 'sample-flow-1',
                                title: 'サンプルフロー1',
                                description: 'サンプルのトラブルシューティングフローです',
                                steps: [
                                    {
                                        id: 'step-1',
                                        title: 'ステップ1',
                                        message: '最初のステップです',
                                        description: '詳細な説明'
                                    }
                                ]
                            }
                        ]
                    })
                };
            }

            // 個別のフローデータを返す
            const flowData = {
                id: id,
                title: `フロー ${id}`,
                description: `ID ${id} のトラブルシューティングフローです`,
                steps: [
                    {
                        id: 'step-1',
                        title: '問題の確認',
                        message: '問題の詳細を確認してください',
                        description: '具体的な問題の内容を確認します',
                        imageUrl: null,
                        images: []
                    },
                    {
                        id: 'step-2',
                        title: '解決手順1',
                        message: '最初の解決手順を実行してください',
                        description: '基本的な解決手順です',
                        imageUrl: null,
                        images: []
                    },
                    {
                        id: 'step-3',
                        title: '解決手順2',
                        message: '追加の解決手順を実行してください',
                        description: 'より詳細な解決手順です',
                        imageUrl: null,
                        images: []
                    }
                ]
            };

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie'
                },
                body: JSON.stringify({
                    success: true,
                    data: flowData
                })
            };

        } catch (error) {
            context.log.error('Error in troubleshooting function:', error);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'トラブルシューティングデータの取得に失敗しました',
                    details: error.message,
                    timestamp: new Date().toISOString()
                })
            };
         }
};