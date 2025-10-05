import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BlobServiceClient } from '@azure/storage-blob';

// Blob Service Clientの初期化
let blobServiceClient: BlobServiceClient | null = null;

function initializeBlobService() {
    if (blobServiceClient) return blobServiceClient;
    
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
        console.error('AZURE_STORAGE_CONNECTION_STRING環境変数が設定されていません');
        return null;
    }
    
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    return blobServiceClient;
}

export async function storageListHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Storage list request received');

    // CORS handling
    if (request.method === 'OPTIONS') {
        return {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        };
    }

    if (request.method !== 'GET') {
        return {
            status: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        // Blob Service接続
        const blobService = initializeBlobService();
        if (!blobService) {
            context.error('Blob service connection failed');
            return {
                status: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'storage_unavailable',
                    message: 'ストレージ接続が利用できません'
                })
            };
        }

        const containerName = process.env.BLOB_CONTAINER_NAME || 'images';
        const containerClient = blobService.getContainerClient(containerName);

        // コンテナが存在することを確認
        const exists = await containerClient.exists();
        if (!exists) {
            await containerClient.create({ access: 'blob' });
            context.log(`Container ${containerName} created`);
        }

        // BLOBファイル一覧を取得
        const blobs = [];
        for await (const blob of containerClient.listBlobsFlat()) {
            blobs.push({
                name: blob.name,
                url: `${containerClient.url}/${blob.name}`,
                lastModified: blob.properties.lastModified,
                size: blob.properties.contentLength
            });
        }

        context.log(`Found ${blobs.length} blobs`);

        return {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                blobs: blobs
            })
        };

    } catch (error) {
        context.error('Storage list error:', error);
        return {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                success: false,
                error: 'internal_server_error',
                message: 'サーバーエラーが発生しました'
            })
        };
    }
}

app.http('storage-list', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'storage/list',
    handler: storageListHandler
});