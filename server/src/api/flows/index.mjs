import { BlobServiceClient } from '@azure/storage-blob';
import { BLOB_CONTAINER, BLOB_PREFIX } from '../blob-config.mjs';

export default async function (req, res) {
  const method = req.method;
  const path = req.path;
  
  try {
    console.log('Flows API processed a request.', {
      method,
      path,
    });

    // OPTIONSリクエストの処理
    if (method === 'OPTIONS') {
      res.set({
        'Access-Control-Allow-Origin': '*', // 必要に応じて調整
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
        'Access-Control-Max-Age': '86400',
      });
      return res.status(200).send('');
    }

    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    console.log('Storage configuration:', {
      hasConnectionString: !!connectionString,
      containerName: BLOB_CONTAINER,
      blobPrefix: BLOB_PREFIX,
      envVars: {
        AZURE_STORAGE_CONNECTION_STRING: connectionString
          ? '[SET]'
          : '[NOT SET]',
        BLOB_CONTAINER_NAME: BLOB_CONTAINER,
        BLOB_PREFIX: BLOB_PREFIX,
      },
    });

    if (!connectionString) {
      console.error('Blob connection error', {
        method,
        path,
        container: BLOB_CONTAINER,
        blobPrefix: BLOB_PREFIX,
      });
      return res.status(500).json({
        success: false,
        error: 'Azure Storage接続文字列が設定されていません',
        details: 'AZURE_STORAGE_CONNECTION_STRING environment variable is required',
        method,
        path,
        container: BLOB_CONTAINER,
        blobPrefix: BLOB_PREFIX,
        timestamp: new Date().toISOString(),
      });
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(BLOB_CONTAINER);
    
    // コンテナの存在確認
    const containerExists = await containerClient.exists();
    if (!containerExists) {
      console.error('Blob container not found', {
        method,
        path,
        container: BLOB_CONTAINER,
      });
      return res.status(404).json({
        success: false,
        error: 'コンテナが見つかりません',
        method,
        path,
        container: BLOB_CONTAINER,
        timestamp: new Date().toISOString(),
      });
    }

    // フローファイルの一覧を取得
    const flows = [];
    // BLOB_PREFIX が空文字の場合の処理
    const listOptions = {
      includeMetadata: true,
    };
    if (BLOB_PREFIX) {
        listOptions.prefix = BLOB_PREFIX;
    }

    console.log('Listing blobs with options:', listOptions);
    
    for await (const blob of containerClient.listBlobsFlat(listOptions)) {
      // BLOB_PREFIX を除去して表示名にするロジックは元のコードを踏襲
      // ただし、BLOB_PREFIX が空の場合はそのまま
      const displayName = BLOB_PREFIX ? blob.name.replace(BLOB_PREFIX, '') : blob.name;
      
      flows.push({
        name: blob.name, // 完全なBLOB名
        displayName: displayName,
        size: blob.properties.contentLength,
        lastModified: blob.properties.lastModified,
        contentType: blob.properties.contentType,
        url: containerClient.getBlobClient(blob.name).url,
      });
    }

    return res.status(200).json({
        success: true,
        data: flows
    });

  } catch (error) {
    console.error('Error in flows function:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
