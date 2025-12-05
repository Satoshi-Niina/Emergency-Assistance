export default async function (req, res) {
  try {
    console.log('Data Processor API processed a request.');

    // OPTIONSリクエストの処理 (Expressでは通常不要だが念のため)
    if (req.method === 'OPTIONS') {
      res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
        'Access-Control-Max-Age': '86400',
      });
      return res.status(200).send('');
    }

    // パスパラメータの取得
    // Expressのルート定義が /api/data-processor/* となっている場合、req.params.0 などで取得する必要があるかもしれないが、
    // loadApiRoutesの実装では /api/data-processor として登録されている。
    // サブパスを取得するには req.path を解析する必要がある。
    
    // req.path は /api/data-processor/process のようになる
    const parts = req.path.split('/');
    const action = parts[parts.length - 1]; // 簡易的な取得
    const method = req.method;

    console.log('Data Processor request:', { method, action });

    // POST /api/data-processor/process - データ処理
    // Expressでは req.body は既にパースされていると仮定 (middlewareによる)
    if (method === 'POST' && (action === 'process' || req.path.endsWith('/process'))) {
      const body = req.body;

      const processingResult = {
        success: true,
        message: 'データの処理が完了しました',
        processedData: {
          id: `processed-${Date.now()}`,
          originalSize: body.data?.length || 0,
          processedSize: (body.data?.length || 0) * 0.8,
          processingTime: Math.random() * 1000,
          status: 'completed',
          metadata: {
            type: body.type || 'general',
            category: body.category || 'unknown',
            processedAt: new Date().toISOString(),
          },
        },
        statistics: {
          totalItems: 1,
          successfulItems: 1,
          failedItems: 0,
          processingTime: Math.random() * 1000,
        },
      };

      return res.status(200).json(processingResult);
    }

    // GET /api/data-processor/status - 処理状況取得
    if (method === 'GET' && (action === 'status' || req.path.endsWith('/status'))) {
      const status = {
        isProcessing: false,
        queueLength: 0,
        lastProcessed: new Date().toISOString(),
        totalProcessed: 100,
        successRate: 0.95,
      };

      return res.status(200).json({
        success: true,
        data: status,
      });
    }

    // デフォルトのレスポンス (ルートパスなど)
    return res.status(200).json({
      message: "Data Processor API is running",
      endpoints: [
        "POST /process",
        "GET /status"
      ]
    });

  } catch (error) {
    console.error('Error in data processor function:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
