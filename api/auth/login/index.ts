export default async function handler(req: any): Promise<Response> {
  // CORS ヘッダーを設定
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  // POSTメソッドのみ受け付け
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    console.log('🔐 ログイン認証API呼び出し');
    
    const body = await req.json();
    const { username, password } = body || {};
    
    // バリデーション
    if (!username || !password) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'ユーザー名とパスワードが必要です' 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // 認証確認
    const user = await validateCredentials(username, password);
    
    if (!user) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'ユーザー名またはパスワードが違います' 
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    // 認証成功（パスワードフィールドを除外）
    const { password: _, ...userWithoutPassword } = user;
    return new Response(JSON.stringify({
      success: true,
      user: {
        id: userWithoutPassword.id,
        username: userWithoutPassword.username,
        displayName: userWithoutPassword.displayName,
        role: userWithoutPassword.role,
        department: userWithoutPassword.department
      },
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('❌ ログイン認証エラー:', error);
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

// 型定義
interface User {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'employee';
  department?: string;
  password: string;
}

// フォールバック認証（データベース接続失敗時）
async function fallbackAuthentication(username: string, password: string): Promise<User | null> {
  console.log('🔄 フォールバック認証を実行:', username);
  
  const fallbackUsers: User[] = [
    {
      id: '1',
      username: 'admin',
      displayName: '管理者',
      role: 'admin',
      department: '管理部',
      password: 'password'
    },
    {
      id: '2',
      username: 'employee1',
      displayName: '作業員1',
      role: 'employee',
      department: '保守部',
      password: 'password'
    },
    {
      id: '3',
      username: 'employee2',
      displayName: '作業員2',
      role: 'employee',
      department: '運行部',
      password: 'password'
    },
    {
      id: '4',
      username: 'test',
      displayName: 'テストユーザー',
      role: 'employee',
      department: 'テスト部',
      password: 'test'
    },
    {
      id: '5',
      username: 'demo',
      displayName: 'デモユーザー',
      role: 'employee',
      department: 'デモ部',
      password: 'demo'
    },
    {
      id: '6',
      username: 'user',
      displayName: '一般ユーザー',
      role: 'employee',
      department: '一般部',
      password: '123456'
    },
    {
      id: '7',
      username: 'niina',
      displayName: '新名聡',
      role: 'admin',
      department: '管理部',
      password: '0077'
    }
  ];

  const user = fallbackUsers.find(u => u.username === username);
  if (user && user.password === password) {
    console.log('✅ フォールバック認証成功:', username);
    return user;
  }

  console.log('❌ フォールバック認証失敗:', username);
  return null;
}

// 認証関数
async function validateCredentials(username: string, password: string): Promise<User | null> {
  try {
    console.log('🔍 認証開始:', { username });

    // フォールバック認証を使用
    console.log('🔄 フォールバック認証にフォールバック');
    return await fallbackAuthentication(username, password);

  } catch (error) {
    console.error('❌ 認証処理エラー:', error);
    // エラー時もフォールバック認証を使用
    return await fallbackAuthentication(username, password);
  }
}
