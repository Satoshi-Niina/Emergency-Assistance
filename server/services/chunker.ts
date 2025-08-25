import crypto from 'crypto';

export interface Chunk {
  page: number;
  content: string;
  hash: string;
}

export interface ChunkOptions {
  size: number;
  overlap: number;
}

/**
 * 繝・く繧ｹ繝医ｒ繝√Ε繝ｳ繧ｯ縺ｫ蛻・牡縺吶ｋ
 * @param text 蛻・牡蟇ｾ雎｡縺ｮ繝・く繧ｹ繝・
 * @param options 繝√Ε繝ｳ繧ｯ繧ｵ繧､繧ｺ縺ｨ繧ｪ繝ｼ繝舌・繝ｩ繝・・險ｭ螳・
 * @returns 繝√Ε繝ｳ繧ｯ縺ｮ驟榊・
 */
export function chunkText(text: string, options: ChunkOptions = { size: 800, overlap: 80 }): Chunk[] {
  const { size, overlap } = options;
  
  // 蜈･蜉帶､懆ｨｼ
  if (!text || text.trim().length === 0) {
    return [];
  }
  
  if (size <= 0 || overlap < 0 || overlap >= size) {
    throw new Error('Invalid chunk options: size must be positive and overlap must be less than size');
  }
  
  // 繝・く繧ｹ繝医ｒ豁｣隕丞喧・域隼陦後ｒ遨ｺ逋ｽ縺ｫ螟画鋤縲・｣邯夂ｩｺ逋ｽ繧貞腰荳遨ｺ逋ｽ縺ｫ・・
  const normalizedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (normalizedText.length <= size) {
    // 繝・く繧ｹ繝医′繝√Ε繝ｳ繧ｯ繧ｵ繧､繧ｺ莉･荳九・蝣ｴ蜷医・縺昴・縺ｾ縺ｾ霑斐☆
    const hash = crypto.createHash('sha1').update(normalizedText).digest('hex');
    return [{
      page: 1,
      content: normalizedText,
      hash
    }];
  }
  
  const chunks: Chunk[] = [];
  let page = 1;
  let start = 0;
  
  while (start < normalizedText.length) {
    let end = start + size;
    
    // 繝√Ε繝ｳ繧ｯ縺ｮ蠅・阜繧定ｪｿ謨ｴ・亥腰隱槭・蠅・阜縺ｧ蛻・ｋ・・
    if (end < normalizedText.length) {
      // 谺｡縺ｮ遨ｺ逋ｽ繧呈爾縺・
      const nextSpace = normalizedText.indexOf(' ', end);
      if (nextSpace !== -1 && nextSpace - end < 50) { // 50譁・ｭ嶺ｻ･蜀・↓遨ｺ逋ｽ縺後≠繧後・隱ｿ謨ｴ
        end = nextSpace;
      }
    }
    
    const content = normalizedText.substring(start, end).trim();
    if (content.length > 0) {
      const hash = crypto.createHash('sha1').update(content).digest('hex');
      chunks.push({
        page,
        content,
        hash
      });
      page++;
    }
    
    // 谺｡縺ｮ髢句ｧ倶ｽ咲ｽｮ・医が繝ｼ繝舌・繝ｩ繝・・繧定・・・・
    start = Math.max(start + 1, end - overlap);
    
    // 辟｡髯舌Ν繝ｼ繝鈴亟豁｢
    if (start >= end) {
      break;
    }
  }
  
  return chunks;
}

/**
 * 繝√Ε繝ｳ繧ｯ縺ｮ邨ｱ險域ュ蝣ｱ繧貞叙蠕・
 * @param chunks 繝√Ε繝ｳ繧ｯ驟榊・
 * @returns 邨ｱ險域ュ蝣ｱ
 */
export function getChunkStats(chunks: Chunk[]) {
  if (chunks.length === 0) {
    return { count: 0, totalLength: 0, avgLength: 0, minLength: 0, maxLength: 0 };
  }
  
  const lengths = chunks.map(chunk => chunk.content.length);
  const totalLength = lengths.reduce((sum, len) => sum + len, 0);
  
  return {
    count: chunks.length,
    totalLength,
    avgLength: Math.round(totalLength / chunks.length),
    minLength: Math.min(...lengths),
    maxLength: Math.max(...lengths)
  };
}
