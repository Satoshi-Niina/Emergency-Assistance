/**
 * Settings API - RAG設定管理
 * GET /api/settings/rag - RAG設定取得
 * POST /api/settings/rag - RAG設定更新
 */

export default async function settingsHandler(req, res) {
  const method = req.method;
  const pathParts = req.path.split('/').filter(p => p);
  const action = pathParts[pathParts.length - 1]; // 最後のパス要素を取得

  console.log('[api/settings] Request:', { method, action, path: req.path, pathParts });

  // GET /api/settings/rag - RAG設定取得
  if (method === 'GET' && action === 'rag') {
    const ragSettings = {
      enabled: true,
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 1000,
      knowledgeBase: {
        enabled: true,
        sources: ['documents', 'troubleshooting', 'knowledge-base'],
        similarityThreshold: 0.8,
      },
      searchSettings: {
        maxResults: 10,
        includeMetadata: true,
        filterByCategory: false,
      },
    };

    return res.json({
      success: true,
      data: ragSettings,
    });
  }

  // POST /api/settings/rag - RAG設定更新
  if (method === 'POST' && action === 'rag') {
    try {
      const settings = req.body;
      console.log('[api/settings/rag] Updating settings:', settings);

      // 実際の保存処理はここに実装
      // 現在はメモリ上のみでの動作

      return res.json({
        success: true,
        message: 'RAG設定を更新しました',
        data: settings,
      });
    } catch (error) {
      console.error('[api/settings/rag] Error:', error);
      return res.status(500).json({
        success: false,
        error: 'RAG設定の更新に失敗しました',
        details: error.message,
      });
    }
  }

  return res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
  });
}

export const methods = ['get', 'post', 'put', 'delete'];
