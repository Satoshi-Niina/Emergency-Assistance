import { AzureFunction, Context, HttpRequest } from "@azure/functions";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  // CORS ヘッダーを設定
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // OPTIONSリクエスト（プリフライト）への対応
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 200,
      headers: corsHeaders,
      body: ''
    };
    return;
  }

  // GETメソッドのみ受け付け
  if (req.method !== 'GET') {
    context.res = {
      status: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
    return;
  }

  try {
    // 現在の実装では認証状態の永続化がないため、常に未認証として返す
    // 本番環境では JWT トークンやセッション管理を実装する必要があります
    context.res = {
      status: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: '認証が必要です'
      })
    };

  } catch (error) {
    context.log.error('Auth check error:', error);
    context.res = {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: false,
        error: 'サーバーエラーが発生しました' 
      })
    };
  }
};

export default httpTrigger;
