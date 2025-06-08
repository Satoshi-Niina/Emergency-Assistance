import OpenAI from "openai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .envファイルの読み込み
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const OPENAI_MODEL = "gpt-4o";

// 複数の場所から.envファイルを読み込み
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

// APIキーの取得（Replitシークレットも考慮）
const apiKey = process.env.OPENAI_API_KEY || process.env.REPLIT_SECRET_OPENAI_API_KEY;

// Remove detailed API key logging
// console.log("[DEBUG] OpenAI initialization - API KEY exists:", apiKey ? "YES" : "NO");
// console.log("[DEBUG] OpenAI API KEY prefix:", apiKey ? apiKey.substring(0, 10) + "..." : "NOT FOUND");

if (!apiKey) {
  console.error("[ERROR] OpenAI API Key not found in environment variables");
  throw new Error("OpenAI API Key not configured");
}

const openai = new OpenAI({
  apiKey: apiKey,
});

// APIキーが存在するか確認
// Remove detailed API key existence logging
// console.log("[DEBUG] OpenAI API KEY exists:", process.env.OPENAI_API_KEY ? "YES" : "NO");

/**
 * OpenAI APIにリクエストを送信して応答を取得する関数
 * @param prompt プロンプト文字列
 * @param useKnowledgeBase ナレッジベースを使用するかどうか
 * @returns OpenAI APIからの応答テキスト
 */
export async function processOpenAIRequest(prompt: string, useKnowledgeBase: boolean = true): Promise<string> {
  try {
    // Remove detailed API call start logging
    // console.log(`OpenAI API呼び出し開始: useKnowledgeBase=${useKnowledgeBase}, message="${prompt}"`);

    const apiKey = process.env.OPENAI_API_KEY || process.env.REPLIT_SECRET_OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OpenAI API key not found');
      return 'OpenAI APIキーが設定されていません。';
    }

    // Remove API key existence and prefix logging
    // console.log('OpenAI API Key exists:', !!apiKey);
    // console.log('OpenAI API Key prefix:', apiKey.substring(0, 10) + '...');

    // システムプロンプトを設定
    let systemPrompt = "あなたは保守用車支援システムの一部として機能するAIアシスタントです。ユーザーの質問に対して、正確で実用的な回答を提供してください。";

    // ナレッジベースから関連情報を取得して含める
    if (useKnowledgeBase) {
      const { generateSystemPromptWithKnowledge } = await import('./knowledge-base');
      systemPrompt = await generateSystemPromptWithKnowledge(prompt);
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
  } catch (error: any) {
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
  } catch (error: any) {
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
    // 長すぎるテキストを切り詰める
    const truncatedText = text.length > 4000 ? text.substring(0, 4000) + "..." : text;

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
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
    console.error('車両画像分析エラー:', error.message);
    return {
      analysis: '画像の分析中にエラーが発生しました。',
      success: false,
      error: error.message
    };
  }
}