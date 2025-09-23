import OpenAI from 'openai';
import { config } from 'dotenv';

// 環境変数を読み込み
config();

if (!process.env.OPENAI_API_KEY) {
  console.warn(
    '⚠️ OPENAI_API_KEY is not set. Embedding service will not work.'
  );
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
}

/**
 * テキストを埋め込みベクトルに変換
 * @param text 変換対象のテキスト
 * @returns 埋め込みベクトルとトークン数
 */
export async function embedText(text: string): Promise<EmbeddingResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  // テキストの長さ制限（OpenAI text-embedding-3-smallの制限）
  const MAX_TOKENS = 8192;
  const MAX_CHARS = MAX_TOKENS * 4; // 概算で文字数の4倍がトークン数

  if (text.length > MAX_CHARS) {
    console.warn(
      `Text is too long (${text.length} chars), truncating to ${MAX_CHARS} chars`
    );
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

    // ベクトルの次元数を検証
    if (embedding.length !== 1536) {
      throw new Error(
        `Unexpected embedding dimension: ${embedding.length}, expected 1536`
      );
    }

    return { embedding, tokenCount };
  } catch (error) {
    console.error('OpenAI embedding API error:', error);
    throw new Error(
      `Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * 複数のテキストを並行して埋め込みベクトルに変換
 * @param texts 変換対象のテキスト配列
 * @param batchSize バッチサイズ（デフォルト: 5）
 * @returns 埋め込み結果の配列
 */
export async function embedTexts(
  texts: string[],
  batchSize: number = 5
): Promise<EmbeddingResult[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }

  if (!texts || texts.length === 0) {
    return [];
  }

  const results: EmbeddingResult[] = [];

  // バッチ処理で並行実行
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchPromises = batch.map(text => embedText(text));

    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    } catch (error) {
      console.error(`Batch ${Math.floor(i / batchSize) + 1} failed:`, error);
      // 失敗したバッチの分は空の結果を追加
      const failedCount = batch.length;
      for (let j = 0; j < failedCount; j++) {
        results.push({
          embedding: new Array(1536).fill(0), // ゼロベクトル
          tokenCount: 0,
        });
      }
    }
  }

  return results;
}

/**
 * 長いテキストを安全に分割して埋め込みベクトルに変換
 * @param text 変換対象のテキスト
 * @param maxChunkSize 最大チャンクサイズ（文字数）
 * @returns 埋め込みベクトルの配列
 */
export async function embedLongText(
  text: string,
  maxChunkSize: number = 4000
): Promise<number[][]> {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // テキストをチャンクに分割
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxChunkSize;

    // チャンクの境界を調整（単語の境界で切る）
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

  // 各チャンクを埋め込みベクトルに変換
  const embeddings = await embedTexts(chunks);
  return embeddings.map(result => result.embedding);
}

/**
 * 埋め込みベクトルの類似度を計算（コサイン類似度）
 * @param vec1 ベクトル1
 * @param vec2 ベクトル2
 * @returns 類似度（0-1、1が完全一致）
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
