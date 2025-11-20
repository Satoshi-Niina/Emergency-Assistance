module.exports = async (context, request) => {
  try {
    context.log('Knowledge HTTP trigger function processed a request.');

    // OPTIONSリクエストの処理（CORSはazure-server.mjsで一元管理）
    if (request.method === 'OPTIONS') {
      return {
        status: 200,
        body: '',
      };
    }

    const id = request.params.id;
    const method = request.method;
    context.log('Knowledge request:', { method, id });

    // GET /api/knowledge - 一覧取得
    if (method === 'GET' && !id) {
      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
        }),
      };
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

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: true,
          data: knowledgeItem,
        }),
      };
    }

    // POST /api/knowledge - 新規作成
    if (method === 'POST') {
      const body = await request.json();
      const newKnowledge = {
        id: `knowledge-${Date.now()}`,
        title: body.title || '新しいナレッジ',
        content: body.content || '',
        category: body.category || 'general',
        tags: body.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: true,
          data: newKnowledge,
        }),
      };
    }

    // PUT /api/knowledge/{id} - 更新
    if (method === 'PUT' && id) {
      const body = await request.json();
      const updatedKnowledge = {
        id: id,
        title: body.title || `更新されたナレッジ ${id}`,
        content: body.content || '',
        category: body.category || 'general',
        tags: body.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: true,
          data: updatedKnowledge,
        }),
      };
    }

    // DELETE /api/knowledge/{id} - 削除
    if (method === 'DELETE' && id) {
      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: true,
          message: `ナレッジ ${id} を削除しました`,
        }),
      };
    }

    return {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed',
      }),
    };
  } catch (error) {
    context.log.error('Error in knowledge function:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: 'ナレッジベースの操作に失敗しました',
        details: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
