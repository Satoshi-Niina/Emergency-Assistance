import OpenAI from "openai";
import dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM用__dirname定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .envファイルの読み込み（相対パスで指定）
dotenv.config({ path: path.resolve(__dirname, '../../server/.env') });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const OPENAI_MODEL = "gpt-4o";

// 複数の場所から.envファイルを読み込み
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../server/.env') });

// APIキーの取得
const apiKey = process.env.OPENAI_API_KEY;

// デバッグ用ログを有効化
console.log("[DEBUG] OpenAI initialization - API KEY exists:", apiKey ? "YES" : "NO");
console.log("[DEBUG] OpenAI API KEY prefix:", apiKey ? apiKey.substring(0, 10) + "..." : "NOT FOUND");
console.log("[DEBUG] Environment variables:", {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "SET" : "NOT SET",
  NODE_ENV: process.env.NODE_ENV,
  PWD: __dirname
});

// 開発環境ではAPIキーがなくても動作するように条件付き初期化
let openai: OpenAI | null = null;
if (apiKey && apiKey !== 'dev-mock-key' && apiKey !== 'your-openai-api-key-here' && apiKey.startsWith('sk-')) {
  try {
    openai = new OpenAI({
      apiKey: apiKey,
    });
    console.log("[DEBUG] OpenAI client initialized successfully");
  } catch (error) {
    console.error("[DEBUG] OpenAI client initialization failed:", error);
    openai = null;
  }
} else {
  console.log("[DEV] OpenAI client not initialized - API key not available or is mock key");
  console.log("[DEBUG] API Key validation:", {
    exists: !!apiKey,
    isMockKey: apiKey === 'dev-mock-key' || apiKey === 'your-openai-api-key-here',
    startsWithSk: apiKey ? apiKey.startsWith('sk-') : false,
    keyLength: apiKey ? apiKey.length : 0
  });
}

// デバッグ用：OpenAIクライアントの状態を確認
console.log("[DEBUG] Final OpenAI client status:", {
  clientExists: !!openai,
  apiKeyExists: !!apiKey,
  apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'NOT FOUND'
});

// OpenAIクライアントの状態を外部から確認する関数
export function getOpenAIClientStatus() {
  return {
    clientExists: !!openai,
    apiKeyExists: !!apiKey,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'NOT FOUND',
    apiKeyLength: apiKey ? apiKey.length : 0,
    isMockKey: apiKey === 'dev-mock-key' || apiKey === 'your-openai-api-key-here',
    startsWithSk: apiKey ? apiKey.startsWith('sk-') : false
  };
}

// 開発環境用のモックレスポンス
const getMockResponse = (prompt: string): string => {
  const lowerPrompt = prompt.toLowerCase();
  
  // 応急処置関連の質問に対するモックレスポンス
  if (lowerPrompt.includes('応急処置') || lowerPrompt.includes('緊急') || lowerPrompt.includes('故障')) {
    return `応急処置についてのご質問ですね。

現在は開発環境のため、実際のAI応答の代わりにモックレスポンスを返しています。

実際の運用では、以下のような応急処置手順を提供します：
1. 安全確認 - 作業環境の安全性を確認
2. 症状診断 - 故障の症状を詳しく確認
3. 応急対応 - 即座に実行可能な対応手順
4. 専門家連絡 - 必要に応じて専門家への連絡

本番環境では、OpenAI APIキーを設定することで、より詳細で正確な応急処置ガイダンスを提供できます。

何か他にご質問がございましたら、お気軽にお聞かせください。`;
  }
  
  // 一般的な質問に対するモックレスポンス
  if (lowerPrompt.includes('こんにちは') || lowerPrompt.includes('hello')) {
    return `こんにちは！応急処置チャットシステムです。

現在は開発環境で動作しており、実際のAI応答の代わりにモックレスポンスを返しています。

本番環境では、OpenAI APIキーを設定することで、より詳細で正確な応答を提供できます。

何かお手伝いできることがございましたら、お気軽にお聞かせください。`;
  }
  
  // デフォルトのモックレスポンス
  return `ご質問ありがとうございます。

現在は開発環境のため、実際のAI応答の代わりにモックレスポンスを返しています。

本番環境では、OpenAI APIキーを設定することで、より詳細で正確な応答を提供できます。

応急処置や技術的な質問について、より具体的にお聞かせいただければ、適切なガイダンスを提供いたします。`;
};

/**
 * OpenAI APIにリクエストを送信して応答を取得する関数
 * @param prompt プロンプト文字列
 * @param useKnowledgeBase ナレッジベースを使用するかどうか
 * @returns OpenAI APIからの応答テキスト
 */
export async function processOpenAIRequest(prompt: string, useKnowledgeBase: boolean = true): Promise<string> {
  try {
    // OpenAIクライアントが利用可能かチェック
    if (!openai) {
      console.log('[DEV] OpenAI client not available, returning development message');
      console.log('[DEBUG] OpenAI client status:', {
        clientExists: !!openai,
        apiKeyExists: !!process.env.OPENAI_API_KEY,
        apiKeyPrefix: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 'NOT FOUND'
      });
      return getMockResponse(prompt);
    }

    console.log('[DEBUG] OpenAI client is available, proceeding with API call');
    console.log('[DEBUG] API Key validation in processOpenAIRequest:', {
      apiKeyExists: !!process.env.OPENAI_API_KEY,
      apiKeyPrefix: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 'NOT FOUND',
      apiKeyLength: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0
    });

    // Remove detailed API call start logging
    // console.log(`OpenAI API呼び出し開始: useKnowledgeBase=${useKnowledgeBase}, message="${prompt}"`);

    // システムプロンプトを設定
    let systemPrompt = "あなたは保守用車支援システムの一部として機能するAIアシスタントです。ユーザーの質問に対して、正確で実用的な回答を提供してください。";

    // ナレッジベースから関連情報を取得して含める
    if (useKnowledgeBase) {
      try {
        const { generateSystemPromptWithKnowledge } = await import('./knowledge-base.js');
        systemPrompt = await generateSystemPromptWithKnowledge(prompt);
      } catch (error) {
        console.error('ナレッジベース初期化エラー:', error);
        // エラーが発生した場合は基本的なシステムプロンプトを使用
        systemPrompt = "あなたは保守用車支援システムの一部として機能するAIアシスタントです。ユーザーの質問に対して、正確で実用的な回答を提供してください。";
      }
    }

    // OpenAI API呼び出し
    // Remove API request sending logging
    // console.log('OpenAI APIリクエストを送信中...');
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      // JSON形式の強制は解除
    });

    // Remove detailed API response receiving logging
    // console.log('OpenAI APIレスポンス受信:', {
    //   id: response.id,
    //   model: response.model,
    //   usage: response.usage,
    //   choicesLength: response.choices?.length
    // });

    // レスポンスからテキストを抽出
    const responseText = response.choices[0].message.content || '';
    // Remove OpenAI response logging
    // console.log('OpenAI応答を受信しました:', responseText.substring(0, 100) + '...');
    return responseText;
  } catch (error) {
    console.error('OpenAI API Error Details:', {
      message: error.message,
      code: error.code,
      type: error.type,
      status: error.status,
      stack: error.stack
    });

    // 特定のエラータイプに応じたメッセージを返す
    if (error.code === 'insufficient_quota') {
      return 'OpenAI APIのクォータが不足しています。';
    } else if (error.code === 'invalid_api_key') {
      return 'OpenAI APIキーが無効です。';
    } else if (error.code === 'rate_limit_exceeded') {
      return 'OpenAI APIのリクエスト制限に達しました。しばらく待ってから再試行してください。';
    } else if (error.message?.includes('timeout')) {
      return 'OpenAI APIのリクエストがタイムアウトしました。';
    } else if (error.status === 401) {
      return 'OpenAI APIキーの認証に失敗しました。';
    } else if (error.status === 429) {
      return 'OpenAI APIのレート制限に達しました。';
    } else if (error.status >= 500) {
      return 'OpenAI APIサーバーでエラーが発生しました。';
    } else {
      return `OpenAI APIエラー: ${error.message || 'Unknown error'}`;
    }
  }
}

/**
 * テキストを要約するヘルパー関数
 * @param text 要約するテキスト
 * @returns 要約されたテキスト
 */
export async function summarizeText(text: string): Promise<string> {
  try {
    // OpenAIクライアントが利用可能かチェック
    if (!openai) {
      console.log('[DEV] OpenAI client not available for text summarization');
      return '開発環境ではテキスト要約機能が利用できません。';
    }

    // 長すぎるテキストを切り詰める
    const truncatedText = text.length > 4000 ? text.substring(0, 4000) + "..." : text;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { 
          role: "system", 
          content: "あなたは技術文書の要約を行う専門家です。文章の要点を保ちながら、簡潔に要約してください。" 
        },
        { 
          role: "user", 
          content: `以下のテキストを100語程度に要約してください:\n\n${truncatedText}` 
        }
      ],
      temperature: 0.3,
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('テキスト要約エラー:', error.message);
    return '要約の生成中にエラーが発生しました。';
  }
}

/**
 * キーワードを生成するヘルパー関数
 * @param text キーワードを生成するテキスト
 * @returns キーワードの配列
 */
export async function generateKeywords(text: string): Promise<string[]> {
  try {
    // OpenAIクライアントが利用可能かチェック
    if (!openai) {
      console.log('[DEV] OpenAI client not available for keyword generation');
      return ['開発環境', 'キーワード生成', '利用不可'];
    }

    // 長すぎるテキストを切り詰める
    const truncatedText = text.length > 4000 ? text.substring(0, 4004) + "..." : text;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { 
          role: "system", 
          content: "あなたは技術文書からキーワードを抽出する専門家です。与えられたテキストから、検索に役立つ重要なキーワードを抽出してください。" 
        },
        { 
          role: "user", 
          content: `以下のテキストから、最も重要な5〜10個のキーワードを抽出し、JSON配列形式で返してください。専門用語や固有名詞を優先してください:\n\n${truncatedText}` 
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }, // 強制的にJSONオブジェクトとして返す
    });

    const content = response.choices[0].message.content || '{"keywords": []}';
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.keywords)) {
        return parsed.keywords;
      } else if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch (e) {
      console.error('キーワード解析エラー:', e);
      return [];
    }
  } catch (error) {
    console.error('キーワード生成エラー:', error.message);
    return [];
  }
}

/**
 * 検索クエリを生成する関数
 * @param text 元のテキスト
 * @returns 最適化された検索クエリ
 */
/**
 * キーワードからステップ形式のレスポンスを生成する
 */
export async function generateStepResponse(keyword: string): Promise<{
  title: string;
  steps: { description: string }[];
}> {
  try {
    // OpenAIクライアントが利用可能かチェック
    if (!openai) {
      console.log('[DEV] OpenAI client not available for step response generation');
      return {
        title: keyword,
        steps: [{ description: "開発環境ではステップ生成機能が利用できません。" }]
      };
    }

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "あなたは保守用車の専門家です。キーワードに基づいて、具体的な手順を説明してください。"
        },
        {
          role: "user",
          content: `以下のキーワードに関する対応手順を、3-5つのステップに分けて説明してください:\n${keyword}`
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || '';
    const result = JSON.parse(content);
    return {
      title: result.title || keyword,
      steps: result.steps || []
    };
  } catch (error) {
    console.error('ステップレスポンス生成エラー:', error);
    return {
      title: keyword,
      steps: [{ description: "レスポンスの生成に失敗しました。" }]
    };
  }
}

export async function generateSearchQuery(text: string): Promise<string> {
  try {
    // OpenAIクライアントが利用可能かチェック
    if (!openai) {
      console.log('[DEV] OpenAI client not available for search query generation');
      return text.substring(0, 50); // 開発環境では元のテキストの一部を返す
    }

    // 長すぎるテキストを切り詰める
    const truncatedText = text.length > 200 ? text.substring(0, 200) + "..." : text;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { 
          role: "system", 
          content: "You are a search query optimization expert. Generate optimal search queries for search engines from user questions or text." 
        },
        { 
          role: "user", 
          content: `Extract optimal search keywords (5-10 words) from the following text for searching related technical documents. Prioritize technical terms and exclude unnecessary conjunctions and prepositions:\n\n${truncatedText}` 
        }
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    const query = response.choices[0].message.content?.trim() || truncatedText;
    return query;
  } catch (error) {
    console.error('Search query generation error:', error.message);
    // エラーが発生した場合は元のテキストを返す
    return text;
  }
}

/**
 * 車両画像を分析する関数
 * @param base64Image Base64エンコードされた画像データ
 * @returns 分析結果
 */
export async function analyzeVehicleImage(base64Image: string): Promise<any> {
  try {
    // OpenAIクライアントが利用可能かチェック
    if (!openai) {
      console.log('[DEV] OpenAI client not available for vehicle image analysis');
      return {
        analysis: '開発環境では画像分析機能が利用できません。',
        success: false,
        error: 'OpenAI client not available'
      };
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // ビジョン機能を持つモデルを使用
      messages: [
        {
          role: "system",
          content: "あなたは車両画像分析の専門家です。保守用車・作業用車両・特殊車両の画像を分析し、車両のタイプ、状態、特徴を詳細に説明してください。"
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "この車両の画像を分析して、車両の種類、状態、目立つ特徴、および考えられる用途について詳細に説明してください。保守用車の場合は、その種類（軌道モータカー、マルチプルタイタンパー、バラストレギュレーターなど）も特定してください。"
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      max_tokens: 1000,
    });

    return {
      analysis: response.choices[0].message.content || '',
      success: true
    };
  } catch (error) {
    console.error('車両画像分析エラー:', error.message);
    return {
      analysis: '画像の分析中にエラーが発生しました。',
      success: false,
      error: error.message
    };
  }
}