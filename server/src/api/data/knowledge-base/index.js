const { BlobServiceClient } = require('@azure/storage-blob');

module.exports = async (context, request) => {
        try {
            context.log('Knowledge base data HTTP trigger function processed a request.');

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

            // Azure Blob Storageからナレッジベースデータを取得
            const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
            if (!connectionString) {
                return {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'ストレージ接続文字列が設定されていません'
                    })
                };
            }

            const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
            const containerClient = blobServiceClient.getContainerClient('knowledge');
            
            // ナレッジベースのJSONファイル一覧を取得
            const knowledgeBaseData = [];
            const listOptions = {
                prefix: 'documents/'
            };

            for await (const blob of containerClient.listBlobsFlat(listOptions)) {
                if (blob.name.endsWith('.json')) {
                    try {
                        const blobClient = containerClient.getBlobClient(blob.name);
                        const downloadResponse = await blobClient.download();
                        const content = await streamToString(downloadResponse.readableStreamBody);
                        const data = JSON.parse(content);
                        knowledgeBaseData.push({
                            id: data.id || blob.name,
                            title: data.title || blob.name,
                            content: data.content || '',
                            category: data.category || 'general',
                            tags: data.tags || [],
                            createdAt: data.createdAt || blob.properties.createdOn,
                            updatedAt: data.updatedAt || blob.properties.lastModified
                        });
                    } catch (parseError) {
                        context.log.warn(`Failed to parse blob ${blob.name}:`, parseError.message);
                    }
                }
            }

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: true,
                    data: knowledgeBaseData,
                    count: knowledgeBaseData.length,
                    message: 'ナレッジベースデータを取得しました'
                })
            };

        } catch (error) {
            context.log.error('Error in knowledge base data function:', error);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'ナレッジベースデータの取得に失敗しました',
                    details: error.message
                })
            };
        }
};

// ストリームを文字列に変換するヘルパー関数
async function streamToString(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on('data', (data) => {
            chunks.push(data.toString());
        });
        readableStream.on('end', () => {
            resolve(chunks.join(''));
        });
        readableStream.on('error', reject);
    });
}
