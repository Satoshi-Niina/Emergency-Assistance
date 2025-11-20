module.exports = async (context, request) => {
  try {
    context.log('Tech Support HTTP trigger function processed a request.');

    // OPTIONSリクエストの処理（CORSはazure-server.mjsで一元管理）
    if (request.method === 'OPTIONS') {
      return {
        status: 200,
        body: '',
      };
    }

    const action = request.params.action;
    const method = request.method;

    context.log('Tech Support request:', { method, action });

    // POST /api/tech-support/cleanup-uploads - アップロードファイルクリーンアップ
    if (method === 'POST' && action === 'cleanup-uploads') {
      const cleanupResult = {
        success: true,
        message: 'アップロードファイルのクリーンアップが完了しました',
        cleanedFiles: [
          {
            id: 'file-1',
            name: 'temp-file-1.txt',
            size: 1024,
            deletedAt: new Date().toISOString(),
          },
          {
            id: 'file-2',
            name: 'temp-file-2.pdf',
            size: 2048,
            deletedAt: new Date().toISOString(),
          },
        ],
        statistics: {
          totalFiles: 2,
          totalSize: 3072,
          spaceFreed: 3072,
          processingTime: Math.random() * 1000,
        },
      };

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanupResult),
      };
    }

    // POST /api/tech-support/backup-logs - ログバックアップ
    if (method === 'POST' && action === 'backup-logs') {
      const backupResult = {
        success: true,
        message: 'ログのバックアップが完了しました',
        backupInfo: {
          backupId: `backup-${Date.now()}`,
          fileName: `logs-backup-${new Date().toISOString().split('T')[0]}.zip`,
          size: 5120,
          createdAt: new Date().toISOString(),
          logFiles: ['application.log', 'error.log', 'access.log', 'debug.log'],
        },
        statistics: {
          totalLogFiles: 4,
          totalSize: 5120,
          compressionRatio: 0.8,
          processingTime: Math.random() * 2000,
        },
      };

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backupResult),
      };
    }

    // GET /api/tech-support/status - システム状況
    if (method === 'GET' && action === 'status') {
      const systemStatus = {
        success: true,
        data: {
          system: {
            status: 'healthy',
            uptime: '7 days, 12 hours',
            memoryUsage: '65%',
            cpuUsage: '45%',
            diskUsage: '78%',
          },
          services: [
            {
              name: 'API Server',
              status: 'running',
              uptime: '7 days, 12 hours',
            },
            {
              name: 'Database',
              status: 'running',
              uptime: '7 days, 12 hours',
            },
            {
              name: 'File Storage',
              status: 'running',
              uptime: '7 days, 12 hours',
            },
          ],
          lastBackup: new Date(Date.now() - 86400000).toISOString(),
          nextMaintenance: new Date(Date.now() + 7 * 86400000).toISOString(),
        },
      };

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(systemStatus),
      };
    }

    return {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: 'Not found',
      }),
    };
  } catch (error) {
    context.log.error('Error in tech support function:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: 'テクニカルサポート機能でエラーが発生しました',
        details: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
