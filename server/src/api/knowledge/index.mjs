export default async function (req, res) {
  try {
    console.log('Knowledge API processed a request.');

    // OPTIONSリクエストの処理
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
    // /api/knowledge/:id のようなルート定義を想定
    // loadApiRoutes では /api/knowledge として登録されるため、req.path から id を抽出する必要がある
    // req.path は /api/knowledge/123 のようになる
    
    const parts = req.path.split('/');
    // parts[0] = '', parts[1] = 'api', parts[2] = 'knowledge', parts[3] = id
    const id = parts.length > 3 ? parts[3] : null;
    const method = req.method;
    
    console.log('Knowledge request:', { method, id });

    // GET /api/knowledge - 一覧取得
    if (method === 'GET' && !id) {
      return res.status(200).json({
        success: true,
        data: [
          {
            id: 'knowledge-1',
            title: 'サンプルナレッジ1',
            content: 'サンプルのナレッジベースコンテンツです',
            category: 'general',
            tags: ['sample', 'general'],
            createdAt: new Date().toISOString(),
          },
          {
            id: 'knowledge-2',
            title: 'サンプルナレッジ2',
            content: '別のサンプルナレッジです',
            category: 'technical',
            tags: ['sample', 'technical'],
            createdAt: new Date().toISOString(),
          },
        ],
      });
    }

    // GET /api/knowledge/{id} - 個別取得
    if (method === 'GET' && id) {
      const knowledgeItem = {
        id: id,
        title: `ナレッジ ${id}`,
        content: `ID ${id} のナレッジベースコンテンツです。詳細な情報が含まれています。`,
        category: 'general',
        tags: ['sample', 'knowledge'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return res.status(200).json({
        success: true,
        data: knowledgeItem,
      });
    }

    // POST /api/knowledge - 新規作成
    if (method === 'POST') {
      const body = req.body;
      const newKnowledge = {
        id: `knowledge-${Date.now()}`,
        title: body.title || '新しいナレッジ',
        content: body.content || '',
        category: body.category || 'general',
        tags: body.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return res.status(201).json({
        success: true,
        data: newKnowledge,
      });
    }

    // PUT /api/knowledge/{id} - 更新
    if (method === 'PUT' && id) {
      const body = req.body;
      const updatedKnowledge = {
        id: id,
        title: body.title || `更新されたナレッジ ${id}`,
        content: body.content || '更新されたコンテンツ',
        category: body.category || 'general',
        tags: body.tags || [],
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return res.status(200).json({
        success: true,
        data: updatedKnowledge,
      });
    }

    // DELETE /api/knowledge/{id} - 削除
    if (method === 'DELETE' && id) {
      return res.status(200).json({
        success: true,
        message: `ナレッジ ${id} を削除しました`,
        id: id,
      });
    }

    return res.status(404).json({
      success: false,
      error: 'Not found',
      path: req.path
    });

  } catch (error) {
    console.error('Error in knowledge function:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
