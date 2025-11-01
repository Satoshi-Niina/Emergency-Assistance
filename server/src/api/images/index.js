import path from 'path';
import fs from 'fs';

export default async function(context, request) {
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
      // multipart/form-data から画像ファイルを取得
      const boundary = request.headers['content-type']?.split('boundary=')[1];
      if (!boundary) {
        return {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ success: false, error: 'boundaryが見つかりません' }),
        };
      }
      // Azure Functions等でのmultipart解析は外部ライブラリ推奨。ここでは簡易実装例。
      const rawBody = request.body;
      // 画像ファイル部分を抽出（本番はbusboy, formidable等推奨）
      // ここではPNG前提で保存
      const imagesDir = process.env.CHAT_IMAGES_PATH
        ? path.resolve(process.cwd(), process.env.CHAT_IMAGES_PATH)
        : path.join(path.resolve(), 'knowledge-base/images/chat-exports');
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }
      // ファイル名生成
      const fileName = `chat_image_${Date.now()}.png`;
      const filePath = path.join(imagesDir, fileName);
      // bodyがBufferの場合はそのまま保存（PNG前提）
      fs.writeFileSync(filePath, rawBody);
      const imageUrl = `/api/images/file/${fileName}`;
      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
        },
        body: JSON.stringify({ success: true, url: imageUrl, fileName }),
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
}
