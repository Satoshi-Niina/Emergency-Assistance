const httpTrigger = async function (context: any, req: any): Promise<void> {
  // CORS ヘッダーを設定
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  // POSTメソッドのみ受け付け
  if (req.method !== 'POST') {
    context.res = {
      status: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
    return;
  }

  try {
    context.log('🔍 GPT接続チェック開始');

    // OpenAI APIキーの確認
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey || openaiApiKey.trim() === '') {
      context.log('❌ OpenAI APIキーが設定されていません');
      context.res = {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          status: 'ERROR',
          message: 'OpenAI APIキーが設定されていません',
          timestamp: new Date().toISOString()
        })
      };
      return;
    }

    // テスト用のシンプルなリクエスト
    const startTime = Date.now();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'こんにちは。これは接続テストです。簡潔にご挨拶ください。' }
        ],
        max_tokens: 50,
        temperature: 0.3
      })
    });

    const endTime = Date.now();
    const responseTime = `${endTime - startTime}ms`;

    if (!response.ok) {
      const errorData = await response.text();
      context.log.error('❌ OpenAI APIエラー:', response.status, errorData);
      
      let errorMessage = 'GPT API接続エラー';
      
      if (response.status === 401) {
        errorMessage = 'OpenAI APIキーが無効です';
      } else if (response.status === 429) {
        errorMessage = 'APIレート制限に達しました';
      } else if (response.status === 500) {
        errorMessage = 'OpenAI サーバーエラー';
      }
      
      context.res = {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          status: 'ERROR',
          message: errorMessage,
          timestamp: new Date().toISOString()
        })
      };
      return;
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'GPT応答を取得できませんでした';

    context.log('✅ GPT接続チェック成功:', reply);

    context.res = {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        status: 'OK',
        message: 'GPT接続が正常です',
        reply: reply,
        response_time: responseTime,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    context.log.error('❌ GPT接続チェックエラー:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'GPT接続エラー';
    
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
