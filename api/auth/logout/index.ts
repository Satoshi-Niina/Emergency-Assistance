export default async function handler(req: any): Promise<Response> {
  // CORS ヘッダーを設定
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  // POSTメソッドのみ受け付け
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    console.log('🔐 ログアウトAPI呼び出し');
    
    // ログアウト処理（セッションクリア等）
    return new Response(JSON.stringify({
      success: true,
      message: 'ログアウトしました',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('❌ ログアウトエラー:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'ログアウト処理でエラーが発生しました',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
