import { testDatabaseConnection } from './database.js';

export default async function handler(req: any): Promise<Response> {
  // CORS ヘッダーを設定
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  // GETメソッドのみ受け付け
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    // データベース接続テスト
    const dbStatus = await testDatabaseConnection();

    const debugInfo = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: 'Azure Static Web Apps',
      apiVersion: '2.0.0',
      message: 'Emergency Assistance Debug API - Production Ready',
      database: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        connectionTest: dbStatus ? 'success' : 'failed',
        hasNodeEnv: !!process.env.NODE_ENV,
        nodeEnv: process.env.NODE_ENV || 'undefined'
      },
      availableEndpoints: [
        '/api/health - ヘルスチェック',
        '/api/auth/login - ログイン認証（データベース連携）',
        '/api/auth/me - 認証状態確認',
        '/api/debug - デバッグ情報（このエンドポイント）'
      ],
      features: [
        'PostgreSQL データベース連携',
        'bcrypt パスワードハッシュ化',
        'フォールバック認証機能',
        '本番環境対応'
      ],
      testAccounts: [
        { username: 'admin', password: 'password', role: 'admin', note: 'データベース or フォールバック' },
        { username: 'employee1', password: 'password', role: 'employee', note: 'データベース or フォールバック' },
        { username: 'employee2', password: 'password', role: 'employee', note: 'データベース or フォールバック' },
        { username: 'test', password: 'test', role: 'employee', note: 'フォールバックのみ' },
        { username: 'demo', password: 'demo', role: 'employee', note: 'フォールバックのみ' },
        { username: 'user', password: '123456', role: 'employee', note: 'フォールバックのみ' }
      ]
    };

    return new Response(JSON.stringify(debugInfo, null, 2), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return new Response(JSON.stringify({ 
      status: 'error',
      message: 'Debug API failed',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
