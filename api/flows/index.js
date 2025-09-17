
const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');
const { BLOB_CONTAINER, BLOB_PREFIX } = require('../blob-config');

app.http('flows', {
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    authLevel: 'anonymous',
    route: 'flows',
    handler: async (request, context) => {
        const method = request.method;
        const path = request.url || '';
        try {
            context.log('Flows HTTP trigger function processed a request.', { method, path });
            const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
            context.log('Storage configuration:', {
                hasConnectionString: !!connectionString,
                containerName: BLOB_CONTAINER,
                blobPrefix: BLOB_PREFIX,
                envVars: {
                    AZURE_STORAGE_CONNECTION_STRING: connectionString ? '[SET]' : '[NOT SET]',
                    BLOB_CONTAINER_NAME: BLOB_CONTAINER,
                    BLOB_PREFIX: BLOB_PREFIX
                }
            });
            if (!connectionString) {
                context.log.error('Blob connection error', { method, path, container: BLOB_CONTAINER, blobPrefix: BLOB_PREFIX });
                context.res = {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': 'https://emergency-assist-app.azurestaticapps.net',
                        'Access-Control-Allow-Credentials': 'true'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'Azure Storage接続文字列が設定されていません',
                        details: 'AZURE_STORAGE_CONNECTION_STRING environment variable is required',
                        method,
                        path,
                        container: BLOB_CONTAINER,
                        blobPrefix: BLOB_PREFIX,
                        timestamp: new Date().toISOString()
                    })
                };
                return;
            }
            const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
            const containerClient = blobServiceClient.getContainerClient(BLOB_CONTAINER);
            // コンテナの存在確認
            const containerExists = await containerClient.exists();
            if (!containerExists) {
                context.log.error('Blob container not found', { method, path, container: BLOB_CONTAINER });
                context.res = {
                    status: 404,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': 'https://emergency-assist-app.azurestaticapps.net',
                        'Access-Control-Allow-Credentials': 'true'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'コンテナが見つかりません',
                        method,
                        path,
                        container: BLOB_CONTAINER,
                        timestamp: new Date().toISOString()
                    })
                };
                return;
            }
            // フローファイルの一覧を取得
            const flows = [];
            const listOptions = {
                prefix: BLOB_PREFIX,
                includeMetadata: true
            };
            context.log('Listing blobs with options:', listOptions);
            for await (const blob of containerClient.listBlobsFlat(listOptions)) {
                const blobName = `${BLOB_PREFIX}${blob.name.replace(BLOB_PREFIX, '')}`;
                flows.push({
                    name: blobName,
                    displayName: blob.name.replace(BLOB_PREFIX, ''),
                    size: blob.properties.contentLength,
                    lastModified: blob.properties.lastModified,
                    contentType: blob.properties.contentType,
                    url: containerClient.getBlobClient(blobName).url
                });
            }
            context.res = {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': 'https://emergency-assist-app.azurestaticapps.net',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Allow-Credentials': 'true'
                },
                body: JSON.stringify({
                    success: true,
                    data: flows,
                    total: flows.length,
                    timestamp: new Date().toISOString()
                })
            };
        } catch (error) {
            context.log.error('Error in flows function', { error: error.message, method, path, container: BLOB_CONTAINER, blobPrefix: BLOB_PREFIX });
            context.res = {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': 'https://emergency-assist-app.azurestaticapps.net',
                    'Access-Control-Allow-Credentials': 'true'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'フロー一覧の取得に失敗しました',
                    details: error.message,
                    method,
                    path,
                    container: BLOB_CONTAINER,
                    blobPrefix: BLOB_PREFIX,
                    timestamp: new Date().toISOString()
                })
            };
        }
    }
});
