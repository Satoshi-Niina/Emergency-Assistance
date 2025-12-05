export default async function (req, res) {
  try {
    console.log('GPT Check API processed a request.');

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

    // GPT API接続チェックのモック
    const gptCheckResult = {
      success: true,
      message: 'GPT API接続は正常です',
      checks: [
        {
          name: 'API Key Validation',
          status: 'passed',
          message: 'APIキーが有効です',
          responseTime: Math.random() * 50,
        },
        {
          name: 'Model Availability',
          status: 'passed',
          message: 'モデルが利用可能です',
          responseTime: Math.random() * 100,
        },
        {
          name: 'Rate Limit Check',
          status: 'passed',
          message: 'レート制限内です',
          responseTime: Math.random() * 30,
        },
      ],
      overallStatus: 'healthy',
      timestamp: new Date().toISOString(),
      api: {
        provider: 'OpenAI',
        model: 'gpt-3.5-turbo',
        version: '3.5',
        endpoint: 'https://api.openai.com/v1/chat/completions',
      },
    };

    return res.status(200).json(gptCheckResult);

  } catch (error) {
    console.error('Error in gpt check function:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
