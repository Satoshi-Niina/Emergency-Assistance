const { db } = require('../../db/index.js');

module.exports = async (context, request) => {
  try {
    context.log('Auth login HTTP trigger function processed a request.');

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

    // リクエストボディを取得
    let credentials;
    try {
      credentials = await request.json();
    } catch (parseError) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
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
          'Access-Control-Allow-Origin': '*',
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
      const users = await db.execute(
        `
                    SELECT id, username, password, display_name, role, department, description, created_at
                    FROM users
                    WHERE username = $1
                    LIMIT 1
                `,
        [username]
      );

      if (users.length === 0) {
        return {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            success: false,
            error: 'ユーザー名またはパスワードが間違っています',
          }),
        };
      }

      user = users[0];
      context.log('User found:', {
        id: user.id,
        username: user.username,
        role: user.role,
      });
    } catch (dbError) {
      context.log.error('Database query failed:', dbError);
      return {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'データベースエラーが発生しました',
          details: dbError.message,
        }),
      };
    }

    // パスワード検証（bcryptjs使用）
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      context.log('Password validation failed for user:', username);
      return {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
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
      displayName: user.display_name,
      role: user.role,
      department: user.department,
    };

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
        'Set-Cookie': `sessionId=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
      },
      body: JSON.stringify({
        success: true,
        user: userData,
        message: 'ログインに成功しました',
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    context.log.error('Error in auth login function:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'ログイン処理に失敗しました',
        details: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
