import { AzureFunction } from "@azure/functions";

// 型定義
interface Context {
  log: {
    (message: string, ...optionalParams: any[]): void;
    error: (message: string, ...optionalParams: any[]) => void;
  };
  res?: {
    status?: number;
    headers?: { [key: string]: string };
    body?: any;
  };
}

interface HttpRequest {
  method?: string;
  url?: string;
  headers?: { [key: string]: string };
  query?: { [key: string]: string };
  params?: { [key: string]: string };
  body?: any;
}

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  // CORS ヘッダーを設定
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  // GETメソッドのみ受け付け
  if (req.method !== 'GET') {
    context.res = {
      status: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
    return;
  }

  try {
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: 'Azure Static Web Apps',
      apiVersion: '1.0.0',
      message: 'Emergency Assistance API is running'
    };

    context.res = {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify(healthData)
    };

  } catch (error) {
    context.log.error('Health check error:', error);
    context.res = {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        status: 'error',
        message: 'Health check failed',
        timestamp: new Date().toISOString()
      })
    };
  }
};

export default httpTrigger;
