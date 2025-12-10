import { getOpenAIClient } from '../../infra/openai.mjs';

export default async function (req, res) {
  try {
    console.log('[gpt-check] GPT接続チェック開始');
    console.log('[gpt-check] Environment:', process.env.NODE_ENV);
    console.log('[gpt-check] OPENAI_API_KEY set:', !!process.env.OPENAI_API_KEY);

    // OPTIONSリクエストの処理
    if (req.method === 'OPTIONS') {
      res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
        'Access-Control-Max-Age': '86400',
      });
      return res.status(200).send('');
    }

    // OpenAI APIキーの設定を確認
    const isOpenAIConfigured = process.env.OPENAI_API_KEY &&
      process.env.OPENAI_API_KEY !== 'dev-mock-key' &&
      process.env.OPENAI_API_KEY.startsWith('sk-');

    const openai = getOpenAIClient();
    
    if (!isOpenAIConfigured || !openai) {
      console.warn('[gpt-check] OpenAI APIキーが設定されていません');
      return res.status(200).json({
        success: false,
        status: 'ERROR',
        message: 'OpenAI APIキーが設定されていません',
        error: 'APIキーが未設定または無効です',
        details: {
          environment: process.env.NODE_ENV || 'development',
          apiKey: 'not_configured',
          model: 'not_available',
          client_initialized: !!openai
        },
        timestamp: new Date().toISOString()
      });
    }

    // 実際にOpenAI APIに接続テスト（タイムアウト付き）
    console.log('[gpt-check] OpenAI APIリクエスト開始');
    
    const timeout = 30000; // 30秒
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('OpenAI API connection timeout')), timeout);
    });

    const apiPromise = openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 5
    });

    const response = await Promise.race([apiPromise, timeoutPromise]);
    console.log('[gpt-check] OpenAI APIリクエスト成功');

    return res.status(200).json({
      success: true,
      status: 'OK',
      message: 'OpenAI API接続成功',
      details: {
        environment: process.env.NODE_ENV || 'development',
        apiKey: 'configured',
        model: response.model,
        client_initialized: !!openai
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[gpt-check] エラー発生:', {
      message: error.message,
      code: error.code,
      status: error.status,
      type: error.type,
      name: error.name
    });
    
    return res.status(200).json({
      success: false,
      status: 'ERROR',
      message: 'OpenAI API接続失敗',
      error: error.message,
      details: {
        environment: process.env.NODE_ENV || 'development',
        apiKey: 'configured_but_failed',
        error_type: error.constructor.name,
        error_code: error.code,
        error_status: error.status
      },
      timestamp: new Date().toISOString()
    });
  }
}
