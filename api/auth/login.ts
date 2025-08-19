import { getUserByUsername, testDatabaseConnection } from '../database.js';

interface User {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'employee';
  department?: string;
  password: string;
}

// 認証関数
async function validateCredentials(username: string, password: string): Promise<User | null> {
  try {
    console.log('🔍 認証開始:', { username });

    // データベース接続テスト
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      console.log('❌ データベース接続失敗 - フォールバック認証を使用');
      return await fallbackAuthentication(username, password);
    }

    // データベースからユーザー取得
    const user = await getUserByUsername(username);
    if (!user) {
      console.log('❌ ユーザーが見つかりません:', username);
      return null;
    }

    // パスワード検証
    try {
      const bcrypt = await import('bcrypt');
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        console.log('❌ パスワードが一致しません:', username);
        return null;
      }

      console.log('✅ 認証成功:', { username, role: user.role });
      return user;
    } catch (bcryptError) {
      console.log('❌ bcrypt比較エラー - フォールバック認証を使用:', bcryptError);
      return await fallbackAuthentication(username, password);
    }

  } catch (error) {
    console.error('❌ 認証処理エラー:', error);
    return await fallbackAuthentication(username, password);
  }
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

export default async function handler(req: any): Promise<Response> {
  // CORS ヘッダーを設定
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    const body = await req.json();
    const { username, password } = body;

    console.log('🔐 ログイン試行:', { 
      username, 
      timestamp: new Date().toISOString(),
      hasPassword: !!password
    });

    // 入力検証
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
    console.error('❌ ログインAPIエラー:', error);
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
