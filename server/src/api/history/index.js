// BLOBストレージクライアントの初期化
const getBlobServiceClient = () => {
  const { BlobServiceClient } = require('@azure/storage-blob');
  const { DefaultAzureCredential } = require('@azure/identity');
  
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

  if (connectionString && connectionString.trim()) {
    try {
      return BlobServiceClient.fromConnectionString(connectionString.trim());
    } catch (error) {
      console.error('❌ Failed to initialize BLOB service client:', error);
      return null;
    }
  } else if (accountName && accountKey && accountName.trim() && accountKey.trim()) {
    try {
      const { StorageSharedKeyCredential } = require('@azure/storage-blob');
      const credential = new StorageSharedKeyCredential(
        accountName.trim(),
        accountKey.trim()
      );
      return new BlobServiceClient(
        `https://${accountName.trim()}.blob.core.windows.net`,
        credential
      );
    } catch (error) {
      console.error('❌ Failed to initialize BLOB service client:', error);
      return null;
    }
  } else if (accountName && accountName.trim()) {
    try {
      const credential = new DefaultAzureCredential();
      return new BlobServiceClient(
        `https://${accountName.trim()}.blob.core.windows.net`,
        credential
      );
    } catch (error) {
      console.error('❌ Failed to initialize BLOB service client with Managed Identity:', error);
      return null;
    }
  }
  
  return null;
};

// パス正規化ヘルパー
const norm = (p) => {
  const BASE = (process.env.AZURE_KNOWLEDGE_BASE_PATH ?? process.env.STORAGE_BASE_PREFIX ?? 'knowledge-base')
    .replace(/^[\\/]+|[\\/]+$/g, '');
  return [BASE, String(p || '')]
    .filter(Boolean)
    .join('/')
    .replace(/\\+/g, '/')
    .replace(/\/+/g, '/');
};

module.exports = async (context, request) => {
  try {
    context.log('History HTTP trigger function processed a request.');

    // OPTIONSリクエストの処理
    if (request.method === 'OPTIONS') {
      return {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
          'Access-Control-Max-Age': '86400',
        },
        body: '',
      };
    }

    const action = request.params.action;
    const method = request.method;
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    context.log('History request:', {
      method,
      action,
      searchParams: Object.fromEntries(searchParams),
    });

    // GET /api/history - 履歴一覧取得
    if (method === 'GET' && !action) {
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const search = searchParams.get('search') || '';

      const mockHistory = [
        {
          id: 'history-1',
          title: 'サンプル履歴1',
          description: 'サンプルの履歴データです',
          type: 'operation',
          timestamp: new Date().toISOString(),
          user: 'admin',
          status: 'completed',
        },
        {
          id: 'history-2',
          title: 'サンプル履歴2',
          description: '別のサンプル履歴です',
          type: 'maintenance',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          user: 'admin',
          status: 'completed',
        },
      ];

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
        },
        body: JSON.stringify({
          success: true,
          data: mockHistory,
          pagination: {
            page: page,
            limit: limit,
            total: mockHistory.length,
            totalPages: Math.ceil(mockHistory.length / limit),
          },
        }),
      };
    }

    // GET /api/history/machine-data - マシンデータ履歴
    if (method === 'GET' && action === 'machine-data') {
      const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'knowledge';
      const blobServiceClient = getBlobServiceClient();
      let allFiles = [];

      if (blobServiceClient) {
        try {
          const containerClient = blobServiceClient.getContainerClient(containerName);
          const prefix = norm('exports/');
          
          context.log(`🔍 BLOBストレージからマシンデータ取得: prefix=${prefix}, container=${containerName}`);
          
          for await (const blob of containerClient.listBlobsFlat({ prefix })) {
            if (blob.name.endsWith('.json')) {
              const fileName = blob.name.split('/').pop();
              allFiles.push({
                id: fileName.replace('.json', ''),
                name: fileName.replace('.json', ''),
                title: fileName.replace('.json', ''),
                type: 'history',
                createdAt: blob.properties.lastModified ? blob.properties.lastModified.toISOString() : new Date().toISOString(),
                size: blob.properties.contentLength || 0,
                filePath: blob.name,
                category: 'exports'
              });
            }
          }
          context.log(`✅ BLOBから ${allFiles.length} 件のマシンデータ取得`);
        } catch (error) {
          context.log.error('❌ BLOB読み込みエラー:', error);
          // エラーでも空配列を返す
        }
      } else {
        context.log.warn('⚠️ BLOBサービスクライアントが利用できません');
      }

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
        },
        body: JSON.stringify({
          success: true,
          data: allFiles,
          total: allFiles.length,
          message: '機械故障履歴ファイル一覧を取得しました',
          timestamp: new Date().toISOString()
        }),
      };
    }

    // GET /api/history/export-files - エクスポートファイル一覧取得
    if (method === 'GET' && action === 'export-files') {
      const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'knowledge';
      const blobServiceClient = getBlobServiceClient();
      const items = [];

      if (blobServiceClient) {
        try {
          const containerClient = blobServiceClient.getContainerClient(containerName);
          const prefix = norm('exports/');

          context.log(`🔍 BLOBストレージからエクスポート取得: prefix=${prefix}, container=${containerName}`);

          for await (const blob of containerClient.listBlobsFlat({ prefix })) {
            if (blob.name.endsWith('.json')) {
              const fileName = blob.name.split('/').pop();
              items.push({
                id: fileName.replace('.json', ''),
                fileName: fileName,
                blobName: blob.name,
                lastModified: blob.properties.lastModified ? blob.properties.lastModified.toISOString() : new Date().toISOString(),
                size: blob.properties.contentLength || 0,
              });
            }
          }
          context.log(`✅ BLOBから ${items.length} 件のエクスポート取得`);
        } catch (error) {
          context.log.error('❌ BLOB読み込みエラー:', error);
          context.log.error('❌ エラー詳細:', error instanceof Error ? error.stack : error);
          // BLOBエラーでも空配列を返す（フォールバック）
        }
      } else {
        context.log.warn('⚠️ BLOBサービスクライアントが利用できません');
      }

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
        },
        body: JSON.stringify({
          success: true,
          data: items,
          total: items.length,
          timestamp: new Date().toISOString()
        }),
      };
    }

    // GET /api/history/search-filters - 検索フィルター
    if (method === 'GET' && action === 'search-filters') {
      const filters = {
        types: ['operation', 'maintenance', 'error', 'info'],
        statuses: ['completed', 'pending', 'failed', 'cancelled'],
        users: ['admin', 'operator', 'maintenance'],
        dateRanges: [
          { label: '今日', value: 'today' },
          { label: '昨日', value: 'yesterday' },
          { label: '今週', value: 'this_week' },
          { label: '今月', value: 'this_month' },
        ],
      };

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
        },
        body: JSON.stringify({
          success: true,
          data: filters,
        }),
      };
    }

    // GET /api/history/file - ファイル取得
    if (method === 'GET' && action === 'file') {
      const fileName = searchParams.get('name');
      if (!fileName) {
        return {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            success: false,
            error: 'ファイル名が指定されていません',
          }),
        };
      }

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
        },
        body: JSON.stringify({
          success: true,
          data: {
            fileName: fileName,
            content: `ファイル ${fileName} の内容です`,
            size: 1024,
            lastModified: new Date().toISOString(),
          },
        }),
      };
    }

    // PUT /api/history/update-item/{id} - 履歴項目更新
    if (method === 'PUT' && action === 'update-item') {
      const itemId = request.params.id;
      const body = await request.json();

      const updatedItem = {
        id: itemId,
        title: body.title || `更新された履歴 ${itemId}`,
        description: body.description || '',
        type: body.type || 'operation',
        timestamp: new Date().toISOString(),
        user: 'admin',
        status: body.status || 'completed',
      };

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
        },
        body: JSON.stringify({
          success: true,
          data: updatedItem,
        }),
      };
    }

    return {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Not found',
      }),
    };
  } catch (error) {
    context.log.error('Error in history function:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: '履歴データの操作に失敗しました',
        details: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
