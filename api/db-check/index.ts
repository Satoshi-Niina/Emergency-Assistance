import { testDatabaseConnection } from "../database.js";

const httpTrigger = async function (context: any, req: any): Promise<void> {
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
    context.log('🔍 データベース接続チェック開始');
    
    const startTime = Date.now();
    const isConnected = await testDatabaseConnection();
    const endTime = Date.now();
    const dbTime = `${endTime - startTime}ms`;

    if (isConnected) {
      context.log('✅ データベース接続チェック成功');
      context.res = {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          status: 'OK',
          message: 'データベース接続が正常です',
          db_time: dbTime,
          timestamp: new Date().toISOString()
        })
      };
    } else {
      context.log('❌ データベース接続チェック失敗');
      context.res = {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          status: 'ERROR',
          message: 'データベースに接続できません',
          db_time: dbTime,
          timestamp: new Date().toISOString()
        })
      };
    }

  } catch (error) {
    context.log.error('❌ データベース接続チェックエラー:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'データベース接続エラー';
    
    context.res = {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        status: 'ERROR',
        message: errorMessage,
        timestamp: new Date().toISOString()
      })
    };
  }
};

export default httpTrigger;
