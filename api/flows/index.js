const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');

app.http('flows', {
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    authLevel: 'anonymous',
    route: 'flows',
    handler: async (request, context) => {
        try {
            context.log('Flows HTTP trigger function processed a request.');

            const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
            const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || process.env.BLOB_CONTAINER_NAME || 'knowledge';
            const blobPrefix = process.env.BLOB_PREFIX || 'knowledge-base/';

            context.log('Storage configuration:', {
                const { BlobServiceClient } = require('@azure/storage-blob');

                module.exports = async function (context, req) {
                    try {
                        context.log('Flows HTTP trigger function processed a request.');

                        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
                        const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || process.env.BLOB_CONTAINER_NAME || 'knowledge';
                        const blobPrefix = process.env.BLOB_PREFIX || 'knowledge-base/';

                        context.log('Storage configuration:', {
                            hasConnectionString: !!connectionString,
                            containerName: containerName,
                            blobPrefix: blobPrefix,
                            envVars: {
                                AZURE_STORAGE_CONNECTION_STRING: connectionString ? '[SET]' : '[NOT SET]',
                                AZURE_STORAGE_CONTAINER_NAME: process.env.AZURE_STORAGE_CONTAINER_NAME || '[NOT SET]',
                                BLOB_CONTAINER_NAME: process.env.BLOB_CONTAINER_NAME || '[NOT SET]',
                                BLOB_PREFIX: process.env.BLOB_PREFIX || '[NOT SET]'
                            }
                        });

                        if (!connectionString) {
                            context.res = {
                                status: 500,
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Access-Control-Allow-Origin': '*'
                                },
                                body: JSON.stringify({
                                    success: false,
                                    error: 'Azure Storage接続文字列が設定されていません',
                                    details: 'AZURE_STORAGE_CONNECTION_STRING environment variable is required',
                                    timestamp: new Date().toISOString()
                                })
                            };
                            return;
                        }

                        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
                        const containerClient = blobServiceClient.getContainerClient(containerName);

                        // コンテナの存在確認
                        const containerExists = await containerClient.exists();
                        if (!containerExists) {
                            context.res = {
                                status: 404,
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Access-Control-Allow-Origin': '*'
                                },
                                body: JSON.stringify({
                                    success: false,
                                    error: 'コンテナが見つかりません',
                                    timestamp: new Date().toISOString()
                                })
                            };
                            return;
                        }

                        // フローファイルの一覧を取得
                        const flows = [];
                        const listOptions = {
                            prefix: blobPrefix,
                            includeMetadata: true
                        };

                        context.log('Listing blobs with options:', listOptions);

                        for await (const blob of containerClient.listBlobsFlat(listOptions)) {
                            flows.push({
                                name: blob.name,
                                displayName: blob.name.replace(blobPrefix, ''),
                                size: blob.properties.contentLength,
                                lastModified: blob.properties.lastModified,
                                contentType: blob.properties.contentType,
                                url: containerClient.getBlobClient(blob.name).url
                            });
                        }

                        context.res = {
                            status: 200,
                            headers: {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*',
                                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                            },
                            body: JSON.stringify({
                                success: true,
                                data: flows,
                                total: flows.length,
                                timestamp: new Date().toISOString()
                            })
                        };
                    } catch (error) {
                        context.log.error('Error in flows function:', error);
                        context.res = {
                            status: 500,
                            headers: {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            },
                            body: JSON.stringify({
                                success: false,
                                error: 'フロー一覧の取得に失敗しました',
                                details: error.message,
                                timestamp: new Date().toISOString()
                            })
                        };
                    }
                };
