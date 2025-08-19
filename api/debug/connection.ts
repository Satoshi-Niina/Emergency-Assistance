export default async function handler(req: any): Promise<Response> {
  // CORS ヘッダーを設定
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // OPTIONSリクエスト（プリフライト）への対応
  if (req.method === 'OPTIONS') {
    return new Response('', {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const debugInfo = {
      status: 'connected',
      timestamp: new Date().toISOString(),
      environment: 'Azure Static Web Apps API',
      request: {
        method: req.method,
        url: req.url,
        headers: Object.fromEntries(req.headers.entries() || [])
      },
      apiEndpoints: {
        health: '/api/health',
        login: '/api/auth/login',
        debug: '/api/debug/connection'
      },
      message: 'API 接続テスト成功'
    };

    console.log('🔍 API接続デバッグ:', debugInfo);

    return new Response(JSON.stringify(debugInfo), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('❌ API接続デバッグエラー:', error);
    return new Response(JSON.stringify({ 
      status: 'error',
      message: 'API接続テスト失敗',
      error: String(error),
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
