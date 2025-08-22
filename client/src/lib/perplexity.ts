import axios from 'axios';

// Perplexity API の型定義
export interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PerplexityRequestOptions {
  model: string;
  messages: PerplexityMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  search_domain_filter?: string[];
  return_images?: boolean;
  return_related_questions?: boolean;
  search_recency_filter?: string;
  top_k?: number;
  stream?: boolean;
  presence_penalty?: number;
  frequency_penalty?: number;
}

export interface PerplexityCitation {
  url: string;
  text?: string;
}

export interface PerplexityResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  citations: PerplexityCitation[];
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta?: {
      role: string;
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Perplexity API を使用して質問に回答すめE
 * @param query ユーザーの質啁E
 * @param systemPrompt シスチE��プロンプト
 * @param useKnowledgeBaseOnly ナレチE��ベ�Eスのみを使用するぁE
 * @returns Perplexity APIからの応筁E
 */
export async function getPerplexityAnswer(
  query: string,
  systemPrompt: string = "保守用車�E緊急対応に関する質問に具体的に回答してください。回答�E簡潔にしてください、E,
  useKnowledgeBaseOnly: boolean = true
): Promise<{ content: string, citations: PerplexityCitation[] }> {
  try {
    // サーバ�Eサイドで実行するAPIリクエスチE
    const response = await axios.post('/api/perplexity', {
      query,
      systemPrompt,
      useKnowledgeBaseOnly
    });

    return {
      content: response.data.content,
      citations: response.data.citations || []
    };
  } catch (error) {
    console.error('Perplexity API エラー:', error);
    throw new Error('Perplexity API からの応答に失敗しました');
  }
}
