module.exports = async (context, request) => {
        try {
            context.log('Knowledge Base Images HTTP trigger function processed a request.');

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

            const category = request.params.category;
            const filename = request.params.filename;
            const method = request.method;
            
            context.log('Knowledge Base Images request:', { method, category, filename });

            // GET /api/knowledge-base/images - 全画像一覧
            if (method === 'GET' && !category) {
                const allImages = [
                    {
                        id: 'kb-img-1',
                        filename: 'troubleshooting-step-1.jpg',
                        category: 'troubleshooting',
                        size: 51200,
                        mimeType: 'image/jpeg',
                        url: '/api/knowledge-base/images/troubleshooting/troubleshooting-step-1.jpg',
                        description: 'トラブルシューティング手順の画像1',
                        tags: ['troubleshooting', 'step', 'guide'],
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 'kb-img-2',
                        filename: 'emergency-flow-diagram.png',
                        category: 'emergency',
                        size: 76800,
                        mimeType: 'image/png',
                        url: '/api/knowledge-base/images/emergency/emergency-flow-diagram.png',
                        description: '緊急時フローの図解',
                        tags: ['emergency', 'flow', 'diagram'],
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 'kb-img-3',
                        filename: 'maintenance-checklist.jpg',
                        category: 'maintenance',
                        size: 64000,
                        mimeType: 'image/jpeg',
                        url: '/api/knowledge-base/images/maintenance/maintenance-checklist.jpg',
                        description: 'メンテナンスチェックリスト',
                        tags: ['maintenance', 'checklist', 'guide'],
                        createdAt: new Date().toISOString()
                    }
                ];

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
                        data: allImages,
                        total: allImages.length
                    })
                };
            }

            // GET /api/knowledge-base/images/{category} - カテゴリ別画像一覧
            if (method === 'GET' && category && !filename) {
                const categoryImages = [
                    {
                        id: `kb-img-${category}-1`,
                        filename: `${category}-image-1.jpg`,
                        category: category,
                        size: 51200,
                        mimeType: 'image/jpeg',
                        url: `/api/knowledge-base/images/${category}/${category}-image-1.jpg`,
                        description: `${category}カテゴリの画像1`,
                        tags: [category, 'sample'],
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: `kb-img-${category}-2`,
                        filename: `${category}-image-2.png`,
                        category: category,
                        size: 76800,
                        mimeType: 'image/png',
                        url: `/api/knowledge-base/images/${category}/${category}-image-2.png`,
                        description: `${category}カテゴリの画像2`,
                        tags: [category, 'sample'],
                        createdAt: new Date().toISOString()
                    }
                ];

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
                        data: categoryImages,
                        category: category,
                        total: categoryImages.length
                    })
                };
            }

            // GET /api/knowledge-base/images/{category}/{filename} - 個別画像取得
            if (method === 'GET' && category && filename) {
                const imageData = {
                    id: `kb-img-${category}-${filename}`,
                    filename: filename,
                    category: category,
                    size: 102400,
                    mimeType: filename.endsWith('.png') ? 'image/png' : 'image/jpeg',
                    url: `/api/knowledge-base/images/${category}/${filename}`,
                    description: `${category}カテゴリの${filename}`,
                    tags: [category, 'knowledge-base'],
                    createdAt: new Date().toISOString(),
                    metadata: {
                        width: 800,
                        height: 600,
                        format: filename.endsWith('.png') ? 'PNG' : 'JPEG',
                        colorSpace: 'RGB'
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
                    body: JSON.stringify({
                        success: true,
                        data: imageData
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
            context.log.error('Error in knowledge base images function:', error);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'ナレッジベース画像の操作に失敗しました',
                    details: error.message,
                    timestamp: new Date().toISOString()
                })
            };
         }
};