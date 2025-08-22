import { AzureFunction } from "@azure/functions";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  vehicleId?: string;
  category?: string;
}

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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    const { message, history, vehicleId, category }: ChatRequest = req.body;

    context.log('💬 Chat API呼び出し:', { 
      message: message?.substring(0, 100) + '...', 
      hasHistory: !!history?.length,
      vehicleId,
      category
    });

    // 入力検証
    if (!message || message.trim().length === 0) {
      context.res = {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          success: false,
          error: 'メッセージが必要です' 
        })
      };
      return;
    }

    // OpenAI APIキーの確認
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      context.log.error('❌ OpenAI APIキーが設定されていません');
      context.res = {
        status: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          success: false,
          error: 'AI機能が利用できません。管理者にお問い合わせください。'
        })
      };
      return;
    }

    // OpenAI APIに送信するメッセージを構築
    const systemPrompt = `あなたは緊急時保守支援システムのAIアシスタントです。
建設機械や重機の保守・点検・故障診断に関する専門知識を持っています。
ユーザーからの質問に対して、正確で実用的なアドバイスを提供してください。

特に以下の点に注意してください：
- 安全を最優先に考えたアドバイスを提供する
- 具体的で実行可能な手順を説明する
- 必要に応じて専門技術者への相談を推奨する
- 日本語で回答する

${vehicleId ? `現在の対象車両ID: ${vehicleId}` : ''}
${category ? `現在のカテゴリ: ${category}` : ''}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []),
      { role: 'user', content: message }
    ];

    // OpenAI API呼び出し
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: messages,
        max_tokens: 1500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      context.log.error('❌ OpenAI APIエラー:', response.status, errorData);
      
      context.res = {
        status: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          success: false,
          error: 'AI応答の生成に失敗しました。しばらく後に再試行してください。'
        })
      };
      return;
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'エラー: 応答を生成できませんでした。';

    context.log('✅ AI応答生成成功');

    context.res = {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        response: aiResponse,
        timestamp: new Date().toISOString(),
        usage: data.usage || null
      })
    };

  } catch (error) {
    context.log.error('❌ Chat APIエラー:', error);
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
