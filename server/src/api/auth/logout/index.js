module.exports = async (context, request) => {
  try {
    context.log('Auth logout HTTP trigger function processed a request.');

    // OPTIONSリクエストの処理
    if (request.method === 'OPTIONS') {
      return {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
          'Access-Control-Max-Age': '86400',
        },
        body: '',
      };
    }

    // セッションクッキーを無効化
    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
        'Set-Cookie': 'sessionId=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
      },
      body: JSON.stringify({
        success: true,
        message: 'ログアウトしました',
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    context.log.error('Error in auth logout function:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'ログアウト処理に失敗しました',
        details: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
