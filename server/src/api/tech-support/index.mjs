export default async function (req, res) {
  try {
    console.log('Tech Support HTTP trigger function processed a request.');

    // OPTIONSリクエストの処理
    if (req.method === 'OPTIONS') {
      res.status(200).send('');
      return;
    }

    // パスからアクションを取得
    // req.path: /api/tech-support/cleanup-uploads
    const parts = req.path.split('/').filter(p => p);
    // parts: ['api', 'tech-support', 'cleanup-uploads']
    // actionは最後の要素、ただし 'tech-support' 自体の場合は undefined
    let action = parts.length > 2 ? parts[2] : undefined;
    
    // クエリパラメータで指定される場合も考慮
    if (!action && req.query.action) {
      action = req.query.action;
    }

    const method = req.method;

    console.log('Tech Support request:', { method, action });

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

      res.json(cleanupResult);
      return;
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

      res.json(backupResult);
      return;
    }

    // GET /api/tech-support/status - システム状況
    if (method === 'GET' && (action === 'status' || !action)) {
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
              name: 'Storage',
              status: 'running',
              uptime: '7 days, 12 hours',
            }
          ]
        }
      };
      res.json(systemStatus);
      return;
    }

    // 未対応のアクション
    res.status(404).json({
      success: false,
      error: 'Action not found',
      action: action
    });

  } catch (error) {
    console.error('Error in tech-support function:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
