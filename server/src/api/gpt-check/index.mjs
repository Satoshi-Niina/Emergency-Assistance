import { getOpenAIClient } from '../../infra/openai.mjs';

export default async function (req, res) {
  try {
    console.log('[gpt-check] GPT connection check request');

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

    // OpenAI APIキーの確認
    const apiKeyConfigured = process.env.OPENAI_API_KEY && 
      process.env.OPENAI_API_KEY !== 'dev-mock-key' &&
      process.env.OPENAI_API_KEY.startsWith('sk-');

    const openai = getOpenAIClient();

    if (!apiKeyConfigured || !openai) {
      console.warn('[gpt-check] OpenAI API key not configured');
      return res.status(200).json({
        success: false,
        status: 'ERROR',
        message: 'OpenAI APIキーが設定されていません',
        timestamp: new Date().toISOString()
      });
    }

    // 実際のOpenAI API接続テスト
    const timeout = 30000;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('OpenAI API connection timeout')), timeout);
    });

    const apiPromise = openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 5
    });

    const response = await Promise.race([apiPromise, timeoutPromise]);
    console.log('[gpt-check] OpenAI API connection successful');

    return res.status(200).json({
      success: true,
      status: 'OK',
      message: 'GPT API接続は正常です',
      model: response.model,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[gpt-check] Error:', error.message);
    return res.status(200).json({
      success: false,
      status: 'ERROR',
      message: 'GPT API接続に失敗しました',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
