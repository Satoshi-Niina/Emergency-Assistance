import axios from 'axios';

// Perplexity API 縺ｮ蝙句ｮ夂ｾｩ
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
 * Perplexity API 繧剃ｽｿ逕ｨ縺励※雉ｪ蝠上↓蝗樒ｭ斐☆繧・
 * @param query 繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ雉ｪ蝠・
 * @param systemPrompt 繧ｷ繧ｹ繝・Β繝励Ο繝ｳ繝励ヨ
 * @param useKnowledgeBaseOnly 繝翫Ξ繝・ず繝吶・繧ｹ縺ｮ縺ｿ繧剃ｽｿ逕ｨ縺吶ｋ縺・
 * @returns Perplexity API縺九ｉ縺ｮ蠢懃ｭ・
 */
export async function getPerplexityAnswer(
  query: string,
  systemPrompt: string = "菫晏ｮ育畑霆翫・邱頑･蟇ｾ蠢懊↓髢｢縺吶ｋ雉ｪ蝠上↓蜈ｷ菴鍋噪縺ｫ蝗樒ｭ斐＠縺ｦ縺上□縺輔＞縲ょ屓遲斐・邁｡貎斐↓縺励※縺上□縺輔＞縲・,
  useKnowledgeBaseOnly: boolean = true
): Promise<{ content: string, citations: PerplexityCitation[] }> {
  try {
    // 繧ｵ繝ｼ繝舌・繧ｵ繧､繝峨〒螳溯｡後☆繧帰PI繝ｪ繧ｯ繧ｨ繧ｹ繝・
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
    console.error('Perplexity API 繧ｨ繝ｩ繝ｼ:', error);
    throw new Error('Perplexity API 縺九ｉ縺ｮ蠢懃ｭ斐↓螟ｱ謨励＠縺ｾ縺励◆');
  }
}


