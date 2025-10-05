import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BlobServiceClient, BlockBlobClient } from '@azure/storage-blob';
import { randomUUID } from 'crypto';

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

export async function documentUploadHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Document upload request received');

    // CORS handling
    if (request.method === 'OPTIONS') {
        return {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        };
    }

    if (request.method !== 'POST') {
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

        const containerName = process.env.BLOB_CONTAINER_NAME || 'documents';
        const containerClient = blobService.getContainerClient(containerName);

        // コンテナが存在することを確認
        const exists = await containerClient.exists();
        if (!exists) {
            await containerClient.create({ access: 'blob' });
            context.log(`Container ${containerName} created`);
        }

        // リクエストからファイルデータを取得
        const formData = await request.formData();
        const file = formData.get('file') as unknown as File;
        const title = formData.get('title') as string;
        const category = formData.get('category') as string;
        
        if (!file) {
            return {
                status: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'no_file',
                    message: 'ファイルが選択されていません'
                })
            };
        }

        // ファイル名の生成（UUID + 元のファイル名）
        const fileExtension = file.name.split('.').pop();
        const uniqueFileName = `${randomUUID()}_${file.name}`;
        
        // BLOBにアップロード
        const blobClient = containerClient.getBlockBlobClient(uniqueFileName);
        const buffer = await file.arrayBuffer();
        
        await blobClient.uploadData(buffer, {
            blobHTTPHeaders: {
                blobContentType: file.type,
            },
            metadata: {
                originalName: file.name,
                title: title || file.name,
                category: category || 'general',
                uploadedAt: new Date().toISOString()
            }
        });

        const fileUrl = blobClient.url;

        context.log(`File uploaded successfully: ${uniqueFileName}`);

        return {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                document: {
                    id: uniqueFileName,
                    name: file.name,
                    title: title || file.name,
                    category: category || 'general',
                    url: fileUrl,
                    size: file.size,
                    uploadedAt: new Date().toISOString()
                }
            })
        };

    } catch (error) {
        context.error('Document upload error:', error);
        return {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                success: false,
                error: 'internal_server_error',
                message: 'ファイルアップロードに失敗しました'
            })
        };
    }
}

export async function documentListHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Document list request received');

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

        const containerName = process.env.BLOB_CONTAINER_NAME || 'documents';
        const containerClient = blobService.getContainerClient(containerName);

        // コンテナが存在することを確認
        const exists = await containerClient.exists();
        if (!exists) {
            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    success: true,
                    documents: []
                })
            };
        }

        // BLOBファイル一覧を取得
        const documents = [];
        for await (const blob of containerClient.listBlobsFlat({ includeMetadata: true })) {
            documents.push({
                id: blob.name,
                name: blob.metadata?.originalName || blob.name,
                title: blob.metadata?.title || blob.name,
                category: blob.metadata?.category || 'general',
                url: `${containerClient.url}/${blob.name}`,
                size: blob.properties.contentLength,
                lastModified: blob.properties.lastModified,
                uploadedAt: blob.metadata?.uploadedAt
            });
        }

        // 最新順にソート
        documents.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

        context.log(`Found ${documents.length} documents`);

        return {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                documents: documents
            })
        };

    } catch (error) {
        context.error('Document list error:', error);
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

app.http('document-upload', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'documents/upload',
    handler: documentUploadHandler
});

app.http('document-list', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'documents/list',
    handler: documentListHandler
});