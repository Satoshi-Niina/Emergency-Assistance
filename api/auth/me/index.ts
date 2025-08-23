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
    console.log('👤 ユーザー認証状態確認API呼び出し');
    
    // セッション情報がないため、未認証として返す
    // 実際の実装では、JWTトークンやセッションから認証状態を確認する
    return new Response(JSON.stringify({
      success: false,
      isAuthenticated: false,
      message: 'セッション認証が実装されていません'
    }), {
      status: 401,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('❌ 認証状態確認エラー:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'サーバーエラーが発生しました',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
