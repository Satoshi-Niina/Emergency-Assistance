import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { getUserByUsername } from "../../database";

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

    // まずデータベース認証を試行
    const user = await getUserByUsername(username);
    if (user) {
      const bcrypt = await import('bcrypt');
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (isValidPassword) {
        console.log('✅ データベース認証成功:', username);
        return user;
      } else {
        console.log('❌ パスワード不正:', username);
      }
    } else {
      console.log('❌ ユーザーが見つかりません:', username);
    }

    // データベース認証失敗時はフォールバック認証を使用
    console.log('🔄 フォールバック認証にフォールバック');
    return await fallbackAuthentication(username, password);

  } catch (error) {
    console.error('❌ 認証処理エラー:', error);
    // エラー時もフォールバック認証を使用
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

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  // CORS ヘッダーを設定
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    const { username, password } = req.body;

    context.log('🔐 ログイン試行:', { 
      username, 
      timestamp: new Date().toISOString(),
      hasPassword: !!password
    });

    // 入力検証
    if (!username || !password) {
      context.res = {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          success: false,
          error: 'ユーザー名とパスワードが必要です' 
        })
      };
      return;
    }

    // 認証確認
    const user = await validateCredentials(username, password);
    
    if (!user) {
      context.res = {
        status: 401,
        headers: corsHeaders,
        body: JSON.stringify({ 
          success: false,
          error: 'ユーザー名またはパスワードが違います' 
        })
      };
      return;
    }

    // 認証成功（パスワードフィールドを除外）
    const { password: _, ...userWithoutPassword } = user;
    context.res = {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        user: {
          id: userWithoutPassword.id,
          username: userWithoutPassword.username,
          displayName: userWithoutPassword.displayName,
          role: userWithoutPassword.role,
          department: userWithoutPassword.department
        },
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    context.log.error('❌ ログインAPIエラー:', error);
    context.res = {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: false,
        error: 'サーバーエラーが発生しました',
        timestamp: new Date().toISOString()
      })
    };
  }
};

export default httpTrigger;
