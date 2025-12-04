const { db } = require('../../db/index.js');
const { users } = require('../../db/schema.js');
const { eq } = require('drizzle-orm');
const bcrypt = require('bcryptjs');

module.exports = async (context, request) => {
  try {
    context.log('Auth login HTTP trigger function processed a request.');

    // OPTIONSリクエストの処理 (Global CORS middleware handles this, but keeping for safety if function runs isolated)
    if (request.method === 'OPTIONS') {
      return {
        status: 200,
        body: '',
      };
    }

    // リクエストボディを取得
    let credentials;
    try {
      credentials = await request.json();
    } catch (parseError) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          error: 'リクエストボディの解析に失敗しました',
          details: parseError.message,
        }),
      };
    }

    const { username, password } = credentials;

    if (!username || !password) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          error: 'ユーザー名とパスワードが必要です',
        }),
      };
    }

    context.log('Login attempt:', { username });

    // データベースからユーザーを検索（パスワードも含める）
    let user;
    try {
      const result = await db.select().from(users).where(eq(users.username, username)).limit(1);

      if (result.length === 0) {
        return {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'ユーザー名またはパスワードが間違っています',
          }),
        };
      }

      user = result[0];
      context.log('User found:', {
        id: user.id,
        username: user.username,
        role: user.role,
      });
    } catch (dbError) {
      context.log.error('Database query failed:', {
        message: dbError.message,
        stack: dbError.stack,
        name: dbError.name,
      });
      return {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          error: 'データベースエラーが発生しました',
          details: process.env.NODE_ENV === 'production'
            ? 'データベース接続に失敗しました。管理者にお問い合わせください。'
            : dbError.message,
          timestamp: new Date().toISOString(),
        }),
      };
    }

    // パスワード検証（bcryptjs使用）
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      context.log('Password validation failed for user:', username);
      return {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          error: 'ユーザー名またはパスワードが間違っています',
        }),
      };
    }

    context.log('Password validation passed for user:', username);

    // セッションIDを生成（簡易実装）
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const userData = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      department: user.department,
    };

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // 'Set-Cookie': `sessionId=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`, // Express session handles this
      },
      body: JSON.stringify({
        success: true,
        user: userData,
        message: 'ログインに成功しました',
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    context.log.error('Error in auth login function:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: 'ログイン処理に失敗しました',
        details: process.env.NODE_ENV === 'production'
          ? 'サーバーエラーが発生しました。しばらく時間をおいてから再度お試しください。'
          : error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
