import OpenAI from 'openai';
import { config } from 'dotenv';

// 迺ｰ蠅・､画焚繧定ｪｭ縺ｿ霎ｼ縺ｿ
config();

if (!process.env.OPENAI_API_KEY) {
  console.warn('笞・・OPENAI_API_KEY is not set. Embedding service will not work.');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
}

/**
 * 繝・く繧ｹ繝医ｒ蝓九ａ霎ｼ縺ｿ繝吶け繝医Ν縺ｫ螟画鋤
 * @param text 螟画鋤蟇ｾ雎｡縺ｮ繝・く繧ｹ繝・
 * @returns 蝓九ａ霎ｼ縺ｿ繝吶け繝医Ν縺ｨ繝医・繧ｯ繝ｳ謨ｰ
 */
export async function embedText(text: string): Promise<EmbeddingResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }
  
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }
  
  // 繝・く繧ｹ繝医・髟ｷ縺募宛髯撰ｼ・penAI text-embedding-3-small縺ｮ蛻ｶ髯撰ｼ・
  const MAX_TOKENS = 8192;
  const MAX_CHARS = MAX_TOKENS * 4; // 讎らｮ励〒譁・ｭ玲焚縺ｮ4蛟阪′繝医・繧ｯ繝ｳ謨ｰ
  
  if (text.length > MAX_CHARS) {
    console.warn(`Text is too long (${text.length} chars), truncating to ${MAX_CHARS} chars`);
    text = text.substring(0, MAX_CHARS);
  }
  
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    });
    
    const embedding = response.data[0].embedding;
    const tokenCount = response.usage.total_tokens;
    
    // 繝吶け繝医Ν縺ｮ谺｡蜈・焚繧呈､懆ｨｼ
    if (embedding.length !== 1536) {
      throw new Error(`Unexpected embedding dimension: ${embedding.length}, expected 1536`);
    }
    
    return { embedding, tokenCount };
  } catch (error) {
    console.error('OpenAI embedding API error:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 隍・焚縺ｮ繝・く繧ｹ繝医ｒ荳ｦ陦後＠縺ｦ蝓九ａ霎ｼ縺ｿ繝吶け繝医Ν縺ｫ螟画鋤
 * @param texts 螟画鋤蟇ｾ雎｡縺ｮ繝・く繧ｹ繝磯・蛻・
 * @param batchSize 繝舌ャ繝√し繧､繧ｺ・医ョ繝輔か繝ｫ繝・ 5・・
 * @returns 蝓九ａ霎ｼ縺ｿ邨先棡縺ｮ驟榊・
 */
export async function embedTexts(texts: string[], batchSize: number = 5): Promise<EmbeddingResult[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }
  
  if (!texts || texts.length === 0) {
    return [];
  }
  
  const results: EmbeddingResult[] = [];
  
  // 繝舌ャ繝∝・逅・〒荳ｦ陦悟ｮ溯｡・
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchPromises = batch.map(text => embedText(text));
    
    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    } catch (error) {
      console.error(`Batch ${Math.floor(i / batchSize) + 1} failed:`, error);
      // 螟ｱ謨励＠縺溘ヰ繝・メ縺ｮ蛻・・遨ｺ縺ｮ邨先棡繧定ｿｽ蜉
      const failedCount = batch.length;
      for (let j = 0; j < failedCount; j++) {
        results.push({
          embedding: new Array(1536).fill(0), // 繧ｼ繝ｭ繝吶け繝医Ν
          tokenCount: 0
        });
      }
    }
  }
  
  return results;
}

/**
 * 髟ｷ縺・ユ繧ｭ繧ｹ繝医ｒ螳牙・縺ｫ蛻・牡縺励※蝓九ａ霎ｼ縺ｿ繝吶け繝医Ν縺ｫ螟画鋤
 * @param text 螟画鋤蟇ｾ雎｡縺ｮ繝・く繧ｹ繝・
 * @param maxChunkSize 譛螟ｧ繝√Ε繝ｳ繧ｯ繧ｵ繧､繧ｺ・域枚蟄玲焚・・
 * @returns 蝓九ａ霎ｼ縺ｿ繝吶け繝医Ν縺ｮ驟榊・
 */
export async function embedLongText(text: string, maxChunkSize: number = 4000): Promise<number[][]> {
  if (!text || text.trim().length === 0) {
    return [];
  }
  
  // 繝・く繧ｹ繝医ｒ繝√Ε繝ｳ繧ｯ縺ｫ蛻・牡
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + maxChunkSize;
    
    // 繝√Ε繝ｳ繧ｯ縺ｮ蠅・阜繧定ｪｿ謨ｴ・亥腰隱槭・蠅・阜縺ｧ蛻・ｋ・・
    if (end < text.length) {
      const nextSpace = text.indexOf(' ', end);
      if (nextSpace !== -1 && nextSpace - end < 100) {
        end = nextSpace;
      }
    }
    
    const chunk = text.substring(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    
    start = end;
  }
  
  // 蜷・メ繝｣繝ｳ繧ｯ繧貞沂繧∬ｾｼ縺ｿ繝吶け繝医Ν縺ｫ螟画鋤
  const embeddings = await embedTexts(chunks);
  return embeddings.map(result => result.embedding);
}

/**
 * 蝓九ａ霎ｼ縺ｿ繝吶け繝医Ν縺ｮ鬘樔ｼｼ蠎ｦ繧定ｨ育ｮ暦ｼ医さ繧ｵ繧､繝ｳ鬘樔ｼｼ蠎ｦ・・
 * @param vec1 繝吶け繝医Ν1
 * @param vec2 繝吶け繝医Ν2
 * @returns 鬘樔ｼｼ蠎ｦ・・-1縲・縺悟ｮ悟・荳閾ｴ・・
 */
export function calculateSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vector dimensions must match');
  }
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (denominator === 0) {
    return 0;
  }
  
  return dotProduct / denominator;
}
