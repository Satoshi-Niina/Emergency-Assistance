import { app } from '@azure/functions';
import { BlobServiceClient } from '@azure/storage-blob';
import { randomUUID } from 'crypto';
// Blob Service Client縺ｮ蛻晄悄蛹・
let blobServiceClient = null;
function initializeBlobService() {
    if (blobServiceClient)
        return blobServiceClient;
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
        console.error('AZURE_STORAGE_CONNECTION_STRING迺ｰ蠅・､画焚縺瑚ｨｭ螳壹＆繧後※縺・∪縺帙ｓ');
        return null;
    }
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    return blobServiceClient;
}
export async function documentUploadHandler(request, context) {
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
        // Blob Service謗･邯・
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
                    message: '繧ｹ繝医Ξ繝ｼ繧ｸ謗･邯壹′蛻ｩ逕ｨ縺ｧ縺阪∪縺帙ｓ'
                })
            };
        }
        const containerName = process.env.BLOB_CONTAINER_NAME || 'documents';
        const containerClient = blobService.getContainerClient(containerName);
        // 繧ｳ繝ｳ繝・リ縺悟ｭ伜惠縺吶ｋ縺薙→繧堤｢ｺ隱・
        const exists = await containerClient.exists();
        if (!exists) {
            await containerClient.create({ access: 'blob' });
            context.log(`Container ${containerName} created`);
        }
        // 繝ｪ繧ｯ繧ｨ繧ｹ繝医°繧峨ヵ繧｡繧､繝ｫ繝・・繧ｿ繧貞叙蠕・
        const formData = await request.formData();
        const file = formData.get('file');
        const title = formData.get('title');
        const category = formData.get('category');
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
                    message: '繝輔ぃ繧､繝ｫ縺碁∈謚槭＆繧後※縺・∪縺帙ｓ'
                })
            };
        }
        // 繝輔ぃ繧､繝ｫ蜷阪・逕滓・・・UID + 蜈・・繝輔ぃ繧､繝ｫ蜷搾ｼ・
        const fileExtension = file.name.split('.').pop();
        const uniqueFileName = `${randomUUID()}_${file.name}`;
        // BLOB縺ｫ繧｢繝・・繝ｭ繝ｼ繝・
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
    }
    catch (error) {
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
                message: '繝輔ぃ繧､繝ｫ繧｢繝・・繝ｭ繝ｼ繝峨↓螟ｱ謨励＠縺ｾ縺励◆'
            })
        };
    }
}
export async function documentListHandler(request, context) {
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
        // Blob Service謗･邯・
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
                    message: '繧ｹ繝医Ξ繝ｼ繧ｸ謗･邯壹′蛻ｩ逕ｨ縺ｧ縺阪∪縺帙ｓ'
                })
            };
        }
        const containerName = process.env.BLOB_CONTAINER_NAME || 'documents';
        const containerClient = blobService.getContainerClient(containerName);
        // 繧ｳ繝ｳ繝・リ縺悟ｭ伜惠縺吶ｋ縺薙→繧堤｢ｺ隱・
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
        // BLOB繝輔ぃ繧､繝ｫ荳隕ｧ繧貞叙蠕・
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
        // 譛譁ｰ鬆・↓繧ｽ繝ｼ繝・
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
    }
    catch (error) {
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
                message: '繧ｵ繝ｼ繝舌・繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
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
