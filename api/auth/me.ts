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

  // GETメソッドのみ受け付け
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    // 現在の実装では認証状態の永続化がないため、常に未認証として返す
    // 本番環境では JWT トークンやセッション管理を実装する必要があります
    return new Response(JSON.stringify({
      success: false,
      error: '認証が必要です'
    }), {
      status: 401,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Auth check error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'サーバーエラーが発生しました' 
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
