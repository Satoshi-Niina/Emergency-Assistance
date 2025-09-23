module.exports = async (context, request) => {
  try {
    context.log('Images HTTP trigger function processed a request.');

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
    const param = request.params.param;
    const method = request.method;

    context.log('Images request:', { method, action, param });

    // POST /api/images/upload - 画像アップロード
    if (method === 'POST' && action === 'upload') {
      const uploadResult = {
        success: true,
        message: '画像のアップロードが完了しました',
        image: {
          id: `img-${Date.now()}`,
          filename: 'uploaded-image.jpg',
          originalName: 'sample-image.jpg',
          size: 102400,
          mimeType: 'image/jpeg',
          url: '/api/images/img-1234567890',
          thumbnailUrl: '/api/images/img-1234567890/thumbnail',
          uploadedAt: new Date().toISOString(),
          category: 'general',
          tags: ['uploaded', 'sample'],
        },
      };

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
        },
        body: JSON.stringify(uploadResult),
      };
    }

    // GET /api/images/category/{category} - カテゴリ別画像一覧
    if (method === 'GET' && action === 'category') {
      const category = param || 'general';
      const images = [
        {
          id: `img-${category}-1`,
          filename: `${category}-image-1.jpg`,
          size: 51200,
          mimeType: 'image/jpeg',
          url: `/api/images/img-${category}-1`,
          thumbnailUrl: `/api/images/img-${category}-1/thumbnail`,
          category: category,
          tags: [category, 'sample'],
          createdAt: new Date().toISOString(),
        },
        {
          id: `img-${category}-2`,
          filename: `${category}-image-2.png`,
          size: 76800,
          mimeType: 'image/png',
          url: `/api/images/img-${category}-2`,
          thumbnailUrl: `/api/images/img-${category}-2/thumbnail`,
          category: category,
          tags: [category, 'sample'],
          createdAt: new Date().toISOString(),
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
          data: images,
          category: category,
          total: images.length,
        }),
      };
    }

    // GET /api/images/search/{query} - 画像検索
    if (method === 'GET' && action === 'search') {
      const query = param || '';
      const searchResults = [
        {
          id: 'img-search-1',
          filename: 'search-result-1.jpg',
          size: 64000,
          mimeType: 'image/jpeg',
          url: '/api/images/img-search-1',
          thumbnailUrl: '/api/images/img-search-1/thumbnail',
          category: 'search',
          tags: ['search', query],
          relevanceScore: 0.95,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'img-search-2',
          filename: 'search-result-2.png',
          size: 32000,
          mimeType: 'image/png',
          url: '/api/images/img-search-2',
          thumbnailUrl: '/api/images/img-search-2/thumbnail',
          category: 'search',
          tags: ['search', query],
          relevanceScore: 0.87,
          createdAt: new Date().toISOString(),
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
          data: searchResults,
          query: query,
          total: searchResults.length,
        }),
      };
    }

    // GET /api/images/{imageId} - 個別画像取得
    if (method === 'GET' && action && !param) {
      const imageId = action;
      const imageData = {
        id: imageId,
        filename: `${imageId}.jpg`,
        size: 102400,
        mimeType: 'image/jpeg',
        url: `/api/images/${imageId}`,
        thumbnailUrl: `/api/images/${imageId}/thumbnail`,
        category: 'general',
        tags: ['sample'],
        createdAt: new Date().toISOString(),
        metadata: {
          width: 800,
          height: 600,
          format: 'JPEG',
          colorSpace: 'RGB',
        },
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
          data: imageData,
        }),
      };
    }

    // GET /api/images - 全画像一覧
    if (method === 'GET' && !action) {
      const allImages = [
        {
          id: 'img-all-1',
          filename: 'all-images-1.jpg',
          size: 51200,
          mimeType: 'image/jpeg',
          url: '/api/images/img-all-1',
          thumbnailUrl: '/api/images/img-all-1/thumbnail',
          category: 'general',
          tags: ['all', 'sample'],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'img-all-2',
          filename: 'all-images-2.png',
          size: 76800,
          mimeType: 'image/png',
          url: '/api/images/img-all-2',
          thumbnailUrl: '/api/images/img-all-2/thumbnail',
          category: 'technical',
          tags: ['all', 'technical'],
          createdAt: new Date().toISOString(),
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
          data: allImages,
          total: allImages.length,
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
    context.log.error('Error in images function:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: '画像操作に失敗しました',
        details: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
