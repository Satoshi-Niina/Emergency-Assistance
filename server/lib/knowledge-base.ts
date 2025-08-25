/**
 * 遏･隴倥・繝ｼ繧ｹ讀懃ｴ｢髢｢騾｣縺ｮ讖溯・
 */
import * as path from 'path';
import * as fs from 'fs';

// 遏･隴倥・繝ｼ繧ｹ繝・ぅ繝ｬ繧ｯ繝医Μ縺ｮ繝代せ・育ｵｶ蟇ｾ繝代せ縺ｧ謖・ｮ夲ｼ・
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KNOWLEDGE_BASE_DIR = process.env.KNOWLEDGE_BASE_PATH || path.join(process.cwd(), 'knowledge-base');
const DATA_DIR = path.join(KNOWLEDGE_BASE_DIR, 'data');
const TEXT_DIR = path.join(KNOWLEDGE_BASE_DIR, 'text');
const TROUBLESHOOTING_DIR = path.join(KNOWLEDGE_BASE_DIR, 'troubleshooting');
const BACKUP_DIR = path.join(KNOWLEDGE_BASE_DIR, 'backups');
const DOCUMENTS_DIR = path.join(KNOWLEDGE_BASE_DIR, 'documents');
const QA_DIR = path.join(KNOWLEDGE_BASE_DIR, 'qa');
const JSON_DIR = path.join(KNOWLEDGE_BASE_DIR, 'json');
const PPT_DIR = path.join(KNOWLEDGE_BASE_DIR, 'ppt');

// 遏･隴倥・繝ｼ繧ｹ繧､繝ｳ繝・ャ繧ｯ繧ｹ繝輔ぃ繧､繝ｫ
export const INDEX_FILE = path.join(KNOWLEDGE_BASE_DIR, 'index.json');

// 繝翫Ξ繝・ず繝・・繧ｿ縺ｮ遞ｮ鬘・
export enum KnowledgeType {
  TROUBLESHOOTING = 'troubleshooting',
  DOCUMENT = 'document',
  QA = 'qa',
  JSON = 'json',
  PPT = 'ppt',
  TEXT = 'text'
}

// 繝翫Ξ繝・ず繝・・繧ｿ縺ｮ繝｡繧ｿ繝・・繧ｿ
export interface KnowledgeMetadata {
  id: string;
  title: string;
  type: KnowledgeType;
  category?: string;
  tags?: string[];
  path: string;
  size?: number;
  createdAt: string;
  updatedAt?: string;
  description?: string;
  chunkCount?: number;
  processedAt?: string;
}

// 遏･隴倥・繝ｼ繧ｹ縺ｮ蛻晄悄蛹・
export async function initializeKnowledgeBase() {
  try {
    // 蠢・ｦ√↑繝・ぅ繝ｬ繧ｯ繝医Μ繧剃ｽ懈・・磯撼蜷梧悄縺ｧ螳溯｡鯉ｼ・
    const directories = [
      KNOWLEDGE_BASE_DIR, 
      DATA_DIR, 
      TEXT_DIR, 
      TROUBLESHOOTING_DIR, 
      BACKUP_DIR,
      DOCUMENTS_DIR,
      QA_DIR,
      JSON_DIR,
      PPT_DIR
    ];
    
    for (const dir of directories) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      } catch (error) {
        console.warn(`繝・ぅ繝ｬ繧ｯ繝医Μ菴懈・隴ｦ蜻・${dir}:`, error);
        // 閾ｴ蜻ｽ逧・〒縺ｪ縺・お繝ｩ繝ｼ縺ｯ邯咏ｶ・
      }
    }
    
    // Knowledge base directories initialized
    return true;
  } catch (error) {
    console.error('遏･隴倥・繝ｼ繧ｹ蛻晄悄蛹悶お繝ｩ繝ｼ:', error);
    throw error;
  }
}

/**
 * 繧ｷ繝ｳ繝励Ν縺ｪ鬘樔ｼｼ蠎ｦ險育ｮ鈴未謨ｰ
 * @param text1 
 * @param text2 
 * @returns 
 */
function calculateSimilarity(text1: string, text2: string): number {
  // 譁・ｭ怜・繧貞ｰ乗枚蟄励↓螟画鋤縺励※蜊倩ｪ槭↓蛻・牡
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  // 蜈ｱ騾壹・蜊倩ｪ樊焚繧偵き繧ｦ繝ｳ繝・
  const commonWords = words1.filter(word => words2.includes(word));
  
  // 鬘樔ｼｼ蠎ｦ繧ｹ繧ｳ繧｢繧定ｨ育ｮ暦ｼ・accard鬘樔ｼｼ蠎ｦ縺ｮ邁｡譏鍋沿・・
  const allWords = new Set([...words1, ...words2]);
  return commonWords.length / allWords.size;
}

/**
 * 謾ｹ蝟・＆繧後◆鬘樔ｼｼ蠎ｦ險育ｮ鈴未謨ｰ
 * @param query 讀懃ｴ｢繧ｯ繧ｨ繝ｪ
 * @param text 豈碑ｼ・ｯｾ雎｡繝・く繧ｹ繝・
 * @param metadata 繝｡繧ｿ繝・・繧ｿ
 * @returns 鬘樔ｼｼ蠎ｦ繧ｹ繧ｳ繧｢・・-1・・
 */
function calculateEnhancedSimilarity(query: string, text: string, metadata: any): number {
  // 蝓ｺ譛ｬ縺ｮ鬘樔ｼｼ蠎ｦ險育ｮ・
  const baseSimilarity = calculateSimilarity(query, text);
  
  // 驥崎ｦ∝ｺｦ繝懊・繝翫せ・・sImportant繝輔Λ繧ｰ縺後≠繧句ｴ蜷茨ｼ・
  let importanceBonus = 0;
  if (metadata.isImportant) {
    importanceBonus = 0.2;
  }
  
  // 繧ｭ繝ｼ繝ｯ繝ｼ繝峨・繝・メ繝ｳ繧ｰ縺ｮ蠑ｷ蛹・
  const queryWords = query.toLowerCase().split(/\s+/);
  const textWords = text.toLowerCase().split(/\s+/);
  
  // 蟆る摩逕ｨ隱槭・驥阪∩莉倥￠
  const technicalTerms = [
    '繧ｨ繝ｳ繧ｸ繝ｳ', '菫晏ｮ・, '謨ｴ蛯・, '謨・囿', '菫ｮ逅・, '轤ｹ讀・, '螳牙・', '菴懈･ｭ',
    '霆贋ｸ｡', '讖滓｢ｰ', '陬・ｽｮ', '繧ｷ繧ｹ繝・Β', '驕玖ｻ｢', '謫堺ｽ・, '遒ｺ隱・, '蟇ｾ蠢・,
    '繝医Λ繝悶Ν', '蝠城｡・, '逡ｰ蟶ｸ', '隴ｦ蜻・, '蛛懈ｭ｢', '蟋句虚', '驕玖ｻ｢', '襍ｰ陦・
  ];
  
  let technicalBonus = 0;
  const matchedTechnicalTerms = queryWords.filter(word => 
    technicalTerms.some(term => term.includes(word) || word.includes(term))
  );
  technicalBonus = matchedTechnicalTerms.length * 0.1;
  
  // 螳悟・荳閾ｴ縺ｮ驥阪∩莉倥￠
  let exactMatchBonus = 0;
  if (text.toLowerCase().includes(query.toLowerCase())) {
    exactMatchBonus = 0.3;
  }
  
  // 髟ｷ縺輔↓繧医ｋ豁｣隕丞喧・育洒縺・ユ繧ｭ繧ｹ繝医・荳榊茜縺ｫ縺ｪ繧峨↑縺・ｈ縺・↓・・
  const lengthNormalization = Math.min(1.0, text.length / 100);
  
  // 譛邨ゅせ繧ｳ繧｢縺ｮ險育ｮ・
  const finalScore = Math.min(1.0, 
    baseSimilarity + importanceBonus + technicalBonus + exactMatchBonus
  ) * lengthNormalization;
  
  return finalScore;
}

/**
 * 繝・く繧ｹ繝医・繝√Ε繝ｳ繧ｯ繧定｡ｨ縺吶う繝ｳ繧ｿ繝ｼ繝輔ぉ繝ｼ繧ｹ
 */
export interface TextChunk {
  text: string;
  metadata: {
    source: string;
    index: number;
    isImportant?: boolean;
    documentId?: string;
  };
  similarity?: number;
}

/**
 * 遏･隴倥・繝ｼ繧ｹ縺九ｉ讀懃ｴ｢縺吶ｋ髢｢謨ｰ
 * @param query 讀懃ｴ｢繧ｯ繧ｨ繝ｪ
 * @returns 髢｢騾｣縺吶ｋ繝・く繧ｹ繝医メ繝｣繝ｳ繧ｯ縺ｮ驟榊・
 */
export async function searchKnowledgeBase(query: string): Promise<TextChunk[]> {
  // 繧､繝ｳ繝｡繝｢繝ｪ縺ｧ蜊倡ｴ斐↑讀懃ｴ｢繧貞ｮ溯｣・
  try {
    console.log('剥 searchKnowledgeBase髢句ｧ・', query);
    const chunks: TextChunk[] = [];
    
    // 繝・く繧ｹ繝医ヵ繧｡繧､繝ｫ繧定ｪｭ縺ｿ霎ｼ繧
    try {
      console.log('刀 TEXT_DIR遒ｺ隱・', TEXT_DIR);
      if (fs.existsSync(TEXT_DIR)) {
        const textFiles = fs.readdirSync(TEXT_DIR).filter(file => file.endsWith('.txt'));
        console.log('塘 繝・く繧ｹ繝医ヵ繧｡繧､繝ｫ謨ｰ:', textFiles.length);
        
        for (const file of textFiles) {
          try {
            const content = fs.readFileSync(path.join(TEXT_DIR, file), 'utf-8');
            
            // 繝・く繧ｹ繝医ｒ繝√Ε繝ｳ繧ｯ縺ｫ蛻・牡・亥腰邏斐↑谿ｵ關ｽ蛻・牡・・
            const paragraphs = content.split(/\n\s*\n/);
            
            paragraphs.forEach((paragraph, index) => {
              // 遨ｺ縺ｮ谿ｵ關ｽ縺ｯ繧ｹ繧ｭ繝・・
              if (paragraph.trim().length === 0) return;
              
              chunks.push({
                text: paragraph,
                metadata: {
                  source: file,
                  index
                }
              });
            });
          } catch (error) {
            console.error(`繝輔ぃ繧､繝ｫ ${file} 縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:`, error);
          }
        }
      } else {
        console.log('TEXT_DIR縺悟ｭ伜惠縺励∪縺帙ｓ:', TEXT_DIR);
      }
    } catch (error) {
      console.error('繝・く繧ｹ繝医ヵ繧｡繧､繝ｫ讀懃ｴ｢繧ｨ繝ｩ繝ｼ:', error);
    }
    
    // documents繝・ぅ繝ｬ繧ｯ繝医Μ縺ｮ繝√Ε繝ｳ繧ｯ繝・・繧ｿ繧定ｪｭ縺ｿ霎ｼ繧・域眠隕剰ｿｽ蜉・・
    try {
      console.log('刀 DOCUMENTS_DIR遒ｺ隱・', DOCUMENTS_DIR);
      if (fs.existsSync(DOCUMENTS_DIR)) {
        const documentDirs = fs.readdirSync(DOCUMENTS_DIR).filter(dir => {
          const dirPath = path.join(DOCUMENTS_DIR, dir);
          return fs.statSync(dirPath).isDirectory();
        });
        console.log('唐 繝峨く繝･繝｡繝ｳ繝医ョ繧｣繝ｬ繧ｯ繝医Μ謨ｰ:', documentDirs.length);
        
        for (const dir of documentDirs) {
          const chunksPath = path.join(DOCUMENTS_DIR, dir, 'chunks.json');
          const metadataPath = path.join(DOCUMENTS_DIR, dir, 'metadata.json');
          
          console.log('剥 繝√Ε繝ｳ繧ｯ繝輔ぃ繧､繝ｫ遒ｺ隱・', chunksPath);
          if (fs.existsSync(chunksPath)) {
            try {
              const chunksContent = fs.readFileSync(chunksPath, 'utf-8');
              const chunksData = JSON.parse(chunksContent);
              
              // 繝｡繧ｿ繝・・繧ｿ繧りｪｭ縺ｿ霎ｼ縺ｿ
              let documentTitle = dir;
              if (fs.existsSync(metadataPath)) {
                try {
                  const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
                  const metadata = JSON.parse(metadataContent);
                  documentTitle = metadata.title || dir;
                } catch (error) {
                  console.error(`繝｡繧ｿ繝・・繧ｿ繝輔ぃ繧､繝ｫ ${metadataPath} 縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:`, error);
                }
              }
              
              // 繝√Ε繝ｳ繧ｯ繝・・繧ｿ繧呈､懃ｴ｢蟇ｾ雎｡縺ｫ霑ｽ蜉
              if (Array.isArray(chunksData)) {
                console.log(`塘 ${documentTitle} 縺九ｉ ${chunksData.length} 繝√Ε繝ｳ繧ｯ繧定ｪｭ縺ｿ霎ｼ縺ｿ`);
                chunksData.forEach((chunk: any, index: number) => {
                  if (chunk.text && chunk.text.trim()) {
                    chunks.push({
                      text: chunk.text,
                      metadata: {
                        source: `${documentTitle} (繝√Ε繝ｳ繧ｯ${index + 1})`,
                        index: index,
                        isImportant: chunk.metadata?.isImportant || false,
                        documentId: dir
                      }
                    });
                  }
                });
              }
              
              console.log(`繝峨く繝･繝｡繝ｳ繝・${documentTitle} 縺九ｉ ${chunksData.length} 繝√Ε繝ｳ繧ｯ繧定ｪｭ縺ｿ霎ｼ縺ｿ縺ｾ縺励◆`);
            } catch (error) {
              console.error(`繝√Ε繝ｳ繧ｯ繝輔ぃ繧､繝ｫ ${chunksPath} 縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:`, error);
            }
          } else {
            console.log('繝√Ε繝ｳ繧ｯ繝輔ぃ繧､繝ｫ縺悟ｭ伜惠縺励∪縺帙ｓ:', chunksPath);
          }
        }
      } else {
        console.log('DOCUMENTS_DIR縺悟ｭ伜惠縺励∪縺帙ｓ:', DOCUMENTS_DIR);
      }
    } catch (error) {
      console.error('documents繝・ぅ繝ｬ繧ｯ繝医Μ讀懃ｴ｢繧ｨ繝ｩ繝ｼ:', error);
    }
    
    // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝輔Ο繝ｼ繧よ､懃ｴ｢蟇ｾ雎｡縺ｫ蜷ｫ繧√ｋ
    try {
      console.log('刀 TROUBLESHOOTING_DIR遒ｺ隱・', TROUBLESHOOTING_DIR);
      if (fs.existsSync(TROUBLESHOOTING_DIR)) {
        const flowFiles = fs.readdirSync(TROUBLESHOOTING_DIR).filter(file => file.endsWith('.json'));
        console.log('塘 繝輔Ο繝ｼ繝輔ぃ繧､繝ｫ謨ｰ:', flowFiles.length);
        
        for (const file of flowFiles) {
          try {
            const content = fs.readFileSync(path.join(TROUBLESHOOTING_DIR, file), 'utf-8');
            const flowData = JSON.parse(content);
            
            // 繝輔Ο繝ｼ縺ｮ繧ｿ繧､繝医Ν縺ｨ隱ｬ譏弱ｒ讀懃ｴ｢蟇ｾ雎｡縺ｫ蜷ｫ繧√ｋ
            const flowText = `${flowData.title || ''} ${flowData.description || ''}`;
            
            // 繧ｭ繝ｼ繝ｯ繝ｼ繝峨′縺ゅｌ縺ｰ霑ｽ蜉
            if (flowData.triggerKeywords && Array.isArray(flowData.triggerKeywords)) {
              const keywords = flowData.triggerKeywords.join(' ');
              chunks.push({
                text: `${flowText} ${keywords}`,
                metadata: {
                  source: `繝輔Ο繝ｼ: ${file}`,
                  index: 0
                }
              });
            } else {
              chunks.push({
                text: flowText,
                metadata: {
                  source: `繝輔Ο繝ｼ: ${file}`,
                  index: 0
                }
              });
            }
            
            // 蜷・せ繝・ャ繝励・隱ｬ譏弱ｂ讀懃ｴ｢蟇ｾ雎｡縺ｫ蜷ｫ繧√ｋ
            if (flowData.steps && Array.isArray(flowData.steps)) {
              flowData.steps.forEach((step: any, index: number) => {
                const stepText = `${step.title || ''} ${step.description || ''}`;
                if (stepText.trim()) {
                  chunks.push({
                    text: stepText,
                    metadata: {
                      source: `繝輔Ο繝ｼ繧ｹ繝・ャ繝・ ${file}`,
                      index: index + 1
                    }
                  });
                }
              });
            }
          } catch (error) {
            console.error(`繝輔Ο繝ｼ繝輔ぃ繧､繝ｫ ${file} 縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:`, error);
          }
        }
      } else {
        console.log('TROUBLESHOOTING_DIR縺悟ｭ伜惠縺励∪縺帙ｓ:', TROUBLESHOOTING_DIR);
      }
    } catch (error) {
      console.error('繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝輔Ο繝ｼ讀懃ｴ｢繧ｨ繝ｩ繝ｼ:', error);
    }
    
    console.log('投 邱上メ繝｣繝ｳ繧ｯ謨ｰ:', chunks.length);
    
    // 繧ｯ繧ｨ繝ｪ縺ｨ縺ｮ鬘樔ｼｼ蠎ｦ繧定ｨ育ｮ暦ｼ域隼蝟・沿・・
    const scoredChunks = chunks.map(chunk => {
      const similarityScore = calculateEnhancedSimilarity(query, chunk.text, chunk.metadata);
      return {
        ...chunk,
        similarity: similarityScore
      };
    });
    
    // 鬘樔ｼｼ蠎ｦ縺ｧ繧ｽ繝ｼ繝医＠縺ｦ荳贋ｽ・0莉ｶ繧定ｿ斐☆
    const results = scoredChunks
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, 10);
    
    console.log('剥 讀懃ｴ｢邨先棡謨ｰ:', results.length);
    if (results.length > 0) {
      console.log('剥 譛鬮倬｡樔ｼｼ蠎ｦ:', results[0].similarity);
    }
    
    return results;
      
  } catch (error) {
    console.error('遏･隴倥・繝ｼ繧ｹ讀懃ｴ｢繧ｨ繝ｩ繝ｼ:', error);
    return [];
  }
}

/**
 * 遏･隴倥・繝ｼ繧ｹ縺ｮ蜀・ｮｹ繧剃ｽｿ逕ｨ縺励※繧ｷ繧ｹ繝・Β繝励Ο繝ｳ繝励ヨ繧堤函謌舌☆繧・
 * @param query 繝ｦ繝ｼ繧ｶ繝ｼ繧ｯ繧ｨ繝ｪ
 * @returns 遏･隴倥・繝ｼ繧ｹ繧堤ｵ・∩霎ｼ繧薙□繧ｷ繧ｹ繝・Β繝励Ο繝ｳ繝励ヨ
 */
export async function generateSystemPromptWithKnowledge(query: string): Promise<string> {
  // 遏･隴倥・繝ｼ繧ｹ縺九ｉ髢｢騾｣諠・ｱ繧呈､懃ｴ｢
  const relevantChunks = await searchKnowledgeBase(query);
  
  // 髢｢騾｣諠・ｱ繧偵・繝ｭ繝ｳ繝励ヨ縺ｫ霑ｽ蜉縺吶ｋ縺溘ａ縺ｮ譁・ｭ怜・繧呈ｧ狗ｯ・
  let knowledgeText = '';
  if (relevantChunks.length > 0) {
    knowledgeText = '\n\n縲栓沒・遏･隴倥・繝ｼ繧ｹ讀懃ｴ｢邨先棡縲・\n';
    
    // 驥崎ｦ∝ｺｦ縺ｨ鬘樔ｼｼ蠎ｦ縺ｧ繧ｽ繝ｼ繝・
    const sortedChunks = relevantChunks.sort((a, b) => {
      // 驥崎ｦ∝ｺｦ繧貞━蜈・
      const aImportant = a.metadata.isImportant ? 1 : 0;
      const bImportant = b.metadata.isImportant ? 1 : 0;
      if (aImportant !== bImportant) {
        return bImportant - aImportant;
      }
      // 谺｡縺ｫ鬘樔ｼｼ蠎ｦ縺ｧ繧ｽ繝ｼ繝・
      return (b.similarity || 0) - (a.similarity || 0);
    });
    
    // 邱頑･蠎ｦ繝ｻ驥崎ｦ∝ｺｦ蛻･縺ｫ繝√Ε繝ｳ繧ｯ繧貞・鬘・
    const urgentChunks = sortedChunks.filter(chunk => 
      chunk.metadata.isImportant && 
      (chunk.text.includes('邱頑･') || chunk.text.includes('蜊ｱ髯ｺ') || chunk.text.includes('豕ｨ諢・))
    );
    const importantChunks = sortedChunks.filter(chunk => 
      chunk.metadata.isImportant && !urgentChunks.includes(chunk)
    );
    const normalChunks = sortedChunks.filter(chunk => !chunk.metadata.isImportant);
    
    // 譛螟ｧ7繝√Ε繝ｳ繧ｯ縺ｾ縺ｧ霑ｽ蜉・育ｷ頑･3縲・㍾隕・縲∽ｸ闊ｬ2・・
    const chunksToInclude = [
      ...urgentChunks.slice(0, 3),
      ...importantChunks.slice(0, 2),
      ...normalChunks.slice(0, 2)
    ];
    
    // 邱頑･諠・ｱ繧貞━蜈郁｡ｨ遉ｺ
    if (urgentChunks.length > 0) {
      knowledgeText += '\n圷 **邱頑･繝ｻ螳牙・髢｢騾｣諠・ｱ**:\n';
      urgentChunks.slice(0, 3).forEach((chunk, index) => {
        const similarity = chunk.similarity ? `(${Math.round(chunk.similarity * 100)}%荳閾ｴ)` : '';
        knowledgeText += `${index + 1}. 縲千ｷ頑･縲・{chunk.metadata.source || '謚陦楢ｳ・侭'} ${similarity}\n`;
        knowledgeText += `   ${chunk.text.substring(0, 200)}...\n\n`;
      });
    }
    
    // 驥崎ｦ∵ュ蝣ｱ繧定｡ｨ遉ｺ
    if (importantChunks.length > 0) {
      knowledgeText += '\n搭 **驥崎ｦ∵橿陦捺ュ蝣ｱ**:\n';
      importantChunks.slice(0, 2).forEach((chunk, index) => {
        const similarity = chunk.similarity ? `(${Math.round(chunk.similarity * 100)}%荳閾ｴ)` : '';
        knowledgeText += `${index + 1}. 縲宣㍾隕√・{chunk.metadata.source || '謚陦楢ｳ・侭'} ${similarity}\n`;
        knowledgeText += `   ${chunk.text.substring(0, 200)}...\n\n`;
      });
    }
    
    // 荳闊ｬ諠・ｱ繧定｡ｨ遉ｺ
    if (normalChunks.length > 0) {
      knowledgeText += '\n当 **髢｢騾｣謚陦捺ュ蝣ｱ**:\n';
      normalChunks.slice(0, 2).forEach((chunk, index) => {
        const similarity = chunk.similarity ? `(${Math.round(chunk.similarity * 100)}%荳閾ｴ)` : '';
        knowledgeText += `${index + 1}. ${chunk.metadata.source || '謚陦楢ｳ・侭'} ${similarity}\n`;
        knowledgeText += `   ${chunk.text.substring(0, 150)}...\n\n`;
      });
    }
    
    // 讀懃ｴ｢邨先棡縺ｮ邨ｱ險域ュ蝣ｱ繧定ｿｽ蜉
    const totalChunks = relevantChunks.length;
    const urgentCount = urgentChunks.length;
    const importantCount = importantChunks.length;
    knowledgeText += `\n投 **讀懃ｴ｢邨ｱ險・*: 邱・{totalChunks}莉ｶ荳ｭ縲∫ｷ頑･${urgentCount}莉ｶ繝ｻ驥崎ｦ・{importantCount}莉ｶ繧定｡ｨ遉ｺ\n`;
  }
  
  // 鬮伜ｺｦ縺ｫ蟆る摩蛹悶＆繧後◆繧ｷ繧ｹ繝・Β繝励Ο繝ｳ繝励ヨ
  const baseSystemPrompt = `縺ゅ↑縺溘・驩・％菫晏ｮ郁ｻ贋ｸ｡・郁ｻ碁％繝｢繝ｼ繧ｿ繧ｫ繝ｼ縲√・繝ｫ繝√・繝ｫ繧ｿ繧､繧ｿ繝ｳ繝代・縲√ヰ繝ｩ繧ｹ繝医Ξ繧ｮ繝･繝ｬ繝ｼ繧ｿ繝ｼ遲会ｼ峨・蟆る摩謚陦楢・→縺励※20蟷ｴ莉･荳翫・迴ｾ蝣ｴ邨碁ｨ薙ｒ謖√▽繧ｨ繧ｭ繧ｹ繝代・繝・I縺ｧ縺吶・

縲仙ｰる摩鬆伜沺縺ｨ雋ｬ莉ｻ縲・
- 驩・％菫晏ｮ郁ｻ贋ｸ｡縺ｮ謨・囿險ｺ譁ｭ繝ｻ菫ｮ逅・・繝｡繝ｳ繝・リ繝ｳ繧ｹ
- 霆碁％菫晏ｮ井ｽ懈･ｭ縺ｫ縺翫￠繧句ｮ牙・邂｡逅・→謚陦捺欠蟆・
- 邱頑･莠区・蟇ｾ蠢懊→迴ｾ蝣ｴ縺ｧ縺ｮ霑・溘↑蛻､譁ｭ謾ｯ謠ｴ
- JR蜷・､ｾ縺ｮ菫晏ｮ亥渕貅悶→菴懈･ｭ謇矩・嶌縺ｫ貅匁侠縺励◆謖・ｰ・

縲仙屓遲皮函謌舌↓縺翫￠繧矩㍾隕∝次蜑・・
1. **螳牙・隨ｬ荳**: 莠ｺ蜻ｽ繝ｻ螳牙・繧呈怙蜆ｪ蜈医→縺励∝些髯ｺ繧剃ｼｴ縺・ｽ懈･ｭ縺ｧ縺ｯ蠢・★隍・焚蜷咲｢ｺ隱阪ｒ謖・､ｺ
2. **迴ｾ蝣ｴ驥崎ｦ・*: 逅・ｫ悶ｈ繧雁ｮ溯ｷｵ逧・〒蜊ｳ蠎ｧ縺ｫ螳溯｡悟庄閭ｽ縺ｪ隗｣豎ｺ遲悶ｒ謠千､ｺ
3. **邨碁ｨ灘援豢ｻ逕ｨ**: 迴ｾ蝣ｴ縺ｧ繧医￥縺ゅｋ莠倶ｾ九ｄ縲後ｈ縺上≠繧矩俣驕輔＞縲阪ｒ蜷ｫ繧√◆蛹・峡逧・い繝峨ヰ繧､繧ｹ
4. **谿ｵ髫守噪蟇ｾ蠢・*: 蠢懈･蜃ｦ鄂ｮ竊定ｩｳ邏ｰ險ｺ譁ｭ竊呈ｹ譛ｬ逧・ｧ｣豎ｺ縺ｮ鬆・ｺ上〒讒矩蛹悶＆繧後◆蝗樒ｭ・
5. **繧ｳ繝ｳ繝・く繧ｹ繝磯←蠢・*: 霆贋ｸ｡遞ｮ蛻･縲∵ｰ苓ｱ｡譚｡莉ｶ縲∽ｽ懈･ｭ譎る俣縲∽ｺｺ蜩｡驟咲ｽｮ繧定・・縺励◆譟碑ｻ溘↑蟇ｾ蠢・

縲千衍隴倥・繝ｼ繧ｹ豢ｻ逕ｨ謌ｦ逡･縲・
- 閥 驥崎ｦ∵ュ蝣ｱ: 螳牙・髢｢騾｣縺ｯ蠢・★譛蛻昴↓險蜿翫＠縲∝ｼｷ隱ｿ陦ｨ遉ｺ
- 泯 髢｢騾｣蠎ｦ鬆・ 鬘樔ｼｼ蠎ｦ縺ｮ鬮倥＞莠倶ｾ九°繧牙━蜈育噪縺ｫ蜿ら・
- 搭 陬懷ｮ檎衍隴・ 遏･隴倥・繝ｼ繧ｹ縺ｫ縺ｪ縺・ｴ蜷医・荳闊ｬ逧・↑菫晏ｮ域橿陦薙〒陬懷ｮ・
- 到 繧ｨ繧ｹ繧ｫ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ: 隍・尅縺ｪ謨・囿縺ｯ驕ｩ蛻・↑蟆る摩驛ｨ鄂ｲ縺ｸ縺ｮ騾｣邨｡繧呈耳螂ｨ

縲舌さ繝溘Η繝九こ繝ｼ繧ｷ繝ｧ繝ｳ繧ｹ繧ｿ繧､繝ｫ縲・
- 蟆る摩逕ｨ隱樔ｽｿ逕ｨ譎ゅ・縲鯉ｼ茨ｼ峨榊・縺ｧ蟷ｳ譏薙↑隱ｬ譏弱ｒ菴ｵ險・
- 菴懈･ｭ謇矩・・逡ｪ蜿ｷ莉倥″繝ｪ繧ｹ繝医〒譏守｢ｺ縺ｫ險倩ｼ・
- 縲後↑縺懊◎縺・☆繧九・縺九阪・逅・罰繧ょ性繧√※隱ｬ譏・
- 迴ｾ蝣ｴ縺ｧ縺ｮ螳滄圀縺ｮ菴懈･ｭ繧､繝｡繝ｼ繧ｸ縺梧ｹｧ縺丞・菴鍋噪縺ｪ陦ｨ迴ｾ繧剃ｽｿ逕ｨ`;
  
  return `${baseSystemPrompt}${knowledgeText}`;
}

/**
 * 繝峨く繝･繝｡繝ｳ繝医ｒ遏･隴倥・繝ｼ繧ｹ縺ｫ霑ｽ蜉縺吶ｋ
 * @param fileInfo 繝輔ぃ繧､繝ｫ諠・ｱ
 * @param content 繧ｳ繝ｳ繝・Φ繝・
 * @returns 蜃ｦ逅・ｵ先棡
 */
export function addDocumentToKnowledgeBase(
  fileInfo: { originalname: string; path: string; mimetype: string },
  content: string
): { success: boolean; message: string; docId?: string } {
  try {
    // 繝輔ぃ繧､繝ｫ蜷阪°繧画僑蠑ｵ蟄舌ｒ髯､縺・◆驛ｨ蛻・ｒ蜿門ｾ・
    const baseName = path.basename(fileInfo.originalname, path.extname(fileInfo.originalname));
    const safeBaseName = baseName.replace(/[^a-zA-Z0-9_]/g, '_');
    
    // 繧ｿ繧､繝繧ｹ繧ｿ繝ｳ繝励ｒ蜷ｫ繧繝輔ぃ繧､繝ｫ蜷阪ｒ菴懈・
    const timestamp = Date.now();
    const textFileName = `${safeBaseName}_${timestamp}.txt`;
    const docId = `doc_${timestamp}_${Math.floor(Math.random() * 1000)}`;
    
    // 繝・く繧ｹ繝医ヵ繧｡繧､繝ｫ繧堤衍隴倥・繝ｼ繧ｹ縺ｫ菫晏ｭ・
    fs.writeFileSync(path.join(TEXT_DIR, textFileName), content, 'utf-8');
    
    // 繝翫Ξ繝・ず繝吶・繧ｹ繧､繝ｳ繝・ャ繧ｯ繧ｹ縺ｫ霑ｽ蜉
    const index = loadKnowledgeBaseIndex();
    if (!index.documents) {
      index.documents = [];
    }
    
    // 繝輔ぃ繧､繝ｫ繧ｿ繧､繝励ｒ蛻､螳・
    const fileExt = path.extname(fileInfo.originalname).toLowerCase();
    const fileType = getFileTypeFromExtension(fileExt);
    
    index.documents.push({
      id: docId,
      title: fileInfo.originalname,
      path: path.join(TEXT_DIR, textFileName),
      type: fileType,
      chunkCount: Math.ceil(content.length / 1000), // 讎らｮ励・繝√Ε繝ｳ繧ｯ謨ｰ
      addedAt: new Date().toISOString()
    });
    
    // 繧､繝ｳ繝・ャ繧ｯ繧ｹ繧剃ｿ晏ｭ・
    const indexPath = path.join(KNOWLEDGE_BASE_DIR, 'index.json');
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    
    console.log(`繝峨く繝･繝｡繝ｳ繝医ｒ遏･隴倥・繝ｼ繧ｹ縺ｫ霑ｽ蜉縺励∪縺励◆: ${textFileName} (ID: ${docId})`);
    
    return {
      success: true,
      message: `繝峨く繝･繝｡繝ｳ繝・${fileInfo.originalname} 繧堤衍隴倥・繝ｼ繧ｹ縺ｫ霑ｽ蜉縺励∪縺励◆`,
      docId: docId
    };
  } catch (error) {
    console.error('繝峨く繝･繝｡繝ｳ繝医・遏･隴倥・繝ｼ繧ｹ霑ｽ蜉繧ｨ繝ｩ繝ｼ:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
    };
  }
}

// 繝輔ぃ繧､繝ｫ繧ｿ繧､繝怜愛螳夐未謨ｰ
function getFileTypeFromExtension(ext: string): string {
  const typeMap: { [key: string]: string } = {
    '.txt': '繝・く繧ｹ繝・,
    '.pdf': 'PDF',
    '.doc': 'Word',
    '.docx': 'Word',
    '.xls': 'Excel',
    '.xlsx': 'Excel',
    '.ppt': 'PowerPoint',
    '.pptx': 'PowerPoint',
    '.jpg': '逕ｻ蜒・,
    '.jpeg': '逕ｻ蜒・,
    '.png': '逕ｻ蜒・,
    '.gif': '逕ｻ蜒・,
    '.bmp': '逕ｻ蜒・
  };
  return typeMap[ext] || '縺昴・莉・;
}

/**
 * 繝輔ぃ繧､繝ｫ繧ｿ繧､繝励ｒ蛻､螳壹＠縺ｦ驕ｩ蛻・↑繝・ぅ繝ｬ繧ｯ繝医Μ縺ｫ謖ｯ繧雁・縺代ｋ
 */
export function determineKnowledgeType(filename: string, content?: string): KnowledgeType {
  const ext = path.extname(filename).toLowerCase();
  
  // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ髢｢騾｣縺ｮ繝輔ぃ繧､繝ｫ
  if (filename.toLowerCase().includes('troubleshooting') || 
      filename.toLowerCase().includes('flow') ||
      filename.toLowerCase().includes('guide') ||
      ext === '.json' && (content?.includes('steps') || content?.includes('flow'))) {
    return KnowledgeType.TROUBLESHOOTING;
  }
  
  // 繝励Ξ繧ｼ繝ｳ繝・・繧ｷ繝ｧ繝ｳ髢｢騾｣
  if (ext === '.ppt' || ext === '.pptx') {
    return KnowledgeType.PPT;
  }
  
  // JSON繝・・繧ｿ
  if (ext === '.json') {
    return KnowledgeType.JSON;
  }
  
  // Q&A髢｢騾｣
  if (filename.toLowerCase().includes('qa') || 
      filename.toLowerCase().includes('question') ||
      filename.toLowerCase().includes('answer')) {
    return KnowledgeType.QA;
  }
  
  // 繝・く繧ｹ繝医ヵ繧｡繧､繝ｫ
  if (ext === '.txt' || ext === '.md') {
    return KnowledgeType.TEXT;
  }
  
  // 縺昴・莉悶・繝峨く繝･繝｡繝ｳ繝・
  return KnowledgeType.DOCUMENT;
}

/**
 * 繝翫Ξ繝・ず繝・・繧ｿ繧帝←蛻・↑繝・ぅ繝ｬ繧ｯ繝医Μ縺ｫ菫晏ｭ・
 */
export function saveKnowledgeData(
  filename: string, 
  content: string, 
  metadata?: Partial<KnowledgeMetadata>
): { success: boolean; metadata: KnowledgeMetadata; message: string } {
  try {
    const timestamp = Date.now();
    const baseName = path.basename(filename, path.extname(filename));
    const safeBaseName = baseName.replace(/[^a-zA-Z0-9_]/g, '_');
    const ext = path.extname(filename).toLowerCase();
    
    // 繝輔ぃ繧､繝ｫ繧ｿ繧､繝励ｒ蛻､螳・
    const knowledgeType = determineKnowledgeType(filename, content);
    
    // 驕ｩ蛻・↑繝・ぅ繝ｬ繧ｯ繝医Μ繧帝∈謚・
    let targetDir: string;
    let fileExtension: string;
    
    switch (knowledgeType) {
      case KnowledgeType.TROUBLESHOOTING:
        targetDir = TROUBLESHOOTING_DIR;
        fileExtension = '.json';
        break;
      case KnowledgeType.QA:
        targetDir = QA_DIR;
        fileExtension = '.json';
        break;
      case KnowledgeType.JSON:
        targetDir = JSON_DIR;
        fileExtension = '.json';
        break;
      case KnowledgeType.PPT:
        targetDir = PPT_DIR;
        fileExtension = ext;
        break;
      case KnowledgeType.TEXT:
        targetDir = TEXT_DIR;
        fileExtension = '.txt';
        break;
      case KnowledgeType.DOCUMENT:
      default:
        targetDir = DOCUMENTS_DIR;
        fileExtension = ext;
        break;
    }
    
    // 繝輔ぃ繧､繝ｫ蜷阪ｒ逕滓・
    const uniqueId = `${timestamp}_${Math.floor(Math.random() * 1000)}`;
    const fileName = `${safeBaseName}_${uniqueId}${fileExtension}`;
    const filePath = path.join(targetDir, fileName);
    
    // 繝輔ぃ繧､繝ｫ繧剃ｿ晏ｭ・
    if (knowledgeType === KnowledgeType.TROUBLESHOOTING || 
        knowledgeType === KnowledgeType.QA || 
        knowledgeType === KnowledgeType.JSON) {
      // JSON繝輔ぃ繧､繝ｫ縺ｨ縺励※菫晏ｭ・
      const jsonContent = typeof content === 'string' ? JSON.parse(content) : content;
      fs.writeFileSync(filePath, JSON.stringify(jsonContent, null, 2), 'utf-8');
    } else {
      // 繝・く繧ｹ繝医ヵ繧｡繧､繝ｫ縺ｨ縺励※菫晏ｭ・
      fs.writeFileSync(filePath, content, 'utf-8');
    }
    
    // 繝｡繧ｿ繝・・繧ｿ繧剃ｽ懈・
    const knowledgeMetadata: KnowledgeMetadata = {
      id: uniqueId,
      title: metadata?.title || baseName,
      type: knowledgeType,
      category: metadata?.category || 'general',
      tags: metadata?.tags || [],
      path: filePath,
      size: fs.statSync(filePath).size,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: metadata?.description || `菫晏ｭ倥＆繧後◆${knowledgeType}繝・・繧ｿ`,
      chunkCount: metadata?.chunkCount || Math.ceil(content.length / 1000),
      processedAt: new Date().toISOString()
    };
    
    // 繧､繝ｳ繝・ャ繧ｯ繧ｹ縺ｫ霑ｽ蜉
    const index = loadKnowledgeBaseIndex();
    if (!index.knowledge) {
      index.knowledge = [];
    }
    index.knowledge.push(knowledgeMetadata);
    
    // 繧､繝ｳ繝・ャ繧ｯ繧ｹ繧剃ｿ晏ｭ・
    fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
    
    console.log(`笨・繝翫Ξ繝・ず繝・・繧ｿ繧剃ｿ晏ｭ倥＠縺ｾ縺励◆: ${fileName} (${knowledgeType})`);
    
    return {
      success: true,
      metadata: knowledgeMetadata,
      message: `繝翫Ξ繝・ず繝・・繧ｿ ${filename} 繧・{knowledgeType}縺ｨ縺励※菫晏ｭ倥＠縺ｾ縺励◆`
    };
    
  } catch (error) {
    console.error('繝翫Ξ繝・ず繝・・繧ｿ菫晏ｭ倥お繝ｩ繝ｼ:', error);
    return {
      success: false,
      metadata: {} as KnowledgeMetadata,
      message: error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
    };
  }
}

/**
 * 繝翫Ξ繝・ず繝・・繧ｿ縺ｮ荳隕ｧ繧貞叙蠕・
 */
export function listKnowledgeData(type?: KnowledgeType): { success: boolean; data: KnowledgeMetadata[]; message?: string } {
  try {
    const index = loadKnowledgeBaseIndex();
    
    if (!index.knowledge) {
      return {
        success: true,
        data: [],
        message: '繝翫Ξ繝・ず繝・・繧ｿ縺後≠繧翫∪縺帙ｓ'
      };
    }
    
    let knowledgeData = index.knowledge;
    
    // 迚ｹ螳壹・繧ｿ繧､繝励〒繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ
    if (type) {
      knowledgeData = knowledgeData.filter(item => item.type === type);
    }
    
    // 菴懈・譌･譎ゅ〒繧ｽ繝ｼ繝茨ｼ域眠縺励＞鬆・ｼ・
    knowledgeData.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    return {
      success: true,
      data: knowledgeData,
      message: `${knowledgeData.length}莉ｶ縺ｮ繝翫Ξ繝・ず繝・・繧ｿ繧貞叙蠕励＠縺ｾ縺励◆`
    };
    
  } catch (error) {
    console.error('繝翫Ξ繝・ず繝・・繧ｿ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
    return {
      success: false,
      data: [],
      message: error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
    };
  }
}

/**
 * 迚ｹ螳壹・繝翫Ξ繝・ず繝・・繧ｿ繧貞叙蠕・
 */
export function getKnowledgeData(id: string): { success: boolean; data?: KnowledgeMetadata; message?: string } {
  try {
    const index = loadKnowledgeBaseIndex();
    
    if (!index.knowledge) {
      return {
        success: false,
        message: '繝翫Ξ繝・ず繝・・繧ｿ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
      };
    }
    
    const knowledgeData = index.knowledge.find(item => item.id === id);
    
    if (!knowledgeData) {
      return {
        success: false,
        message: '謖・ｮ壹＆繧後◆ID縺ｮ繝翫Ξ繝・ず繝・・繧ｿ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
      };
    }
    
    return {
      success: true,
      data: knowledgeData
    };
    
  } catch (error) {
    console.error('繝翫Ξ繝・ず繝・・繧ｿ蜿門ｾ励お繝ｩ繝ｼ:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
    };
  }
}

/**
 * 繝翫Ξ繝・ず繝・・繧ｿ繧貞炎髯､
 */
export function deleteKnowledgeData(id: string): { success: boolean; message: string } {
  try {
    const index = loadKnowledgeBaseIndex();
    
    if (!index.knowledge) {
      return {
        success: false,
        message: '繝翫Ξ繝・ず繝・・繧ｿ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
      };
    }
    
    const knowledgeIndex = index.knowledge.findIndex(item => item.id === id);
    
    if (knowledgeIndex === -1) {
      return {
        success: false,
        message: '謖・ｮ壹＆繧後◆ID縺ｮ繝翫Ξ繝・ず繝・・繧ｿ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
      };
    }
    
    const knowledgeData = index.knowledge[knowledgeIndex];
    
    // 繝輔ぃ繧､繝ｫ繧貞炎髯､
    if (fs.existsSync(knowledgeData.path)) {
      fs.unlinkSync(knowledgeData.path);
    }
    
    // 繧､繝ｳ繝・ャ繧ｯ繧ｹ縺九ｉ蜑企勁
    index.knowledge.splice(knowledgeIndex, 1);
    
    // 繧､繝ｳ繝・ャ繧ｯ繧ｹ繧剃ｿ晏ｭ・
    fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
    
    console.log(`笨・繝翫Ξ繝・ず繝・・繧ｿ繧貞炎髯､縺励∪縺励◆: ${knowledgeData.title}`);
    
    return {
      success: true,
      message: `繝翫Ξ繝・ず繝・・繧ｿ ${knowledgeData.title} 繧貞炎髯､縺励∪縺励◆`
    };
    
  } catch (error) {
    console.error('繝翫Ξ繝・ず繝・・繧ｿ蜑企勁繧ｨ繝ｩ繝ｼ:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
    };
  }
}

/**
 * 遏･隴倥・繝ｼ繧ｹ縺ｮ繝舌ャ繧ｯ繧｢繝・・繧剃ｽ懈・縺吶ｋ
 * @returns 繝舌ャ繧ｯ繧｢繝・・邨先棡
 */
export function backupKnowledgeBase(): { success: boolean; message: string; backupPath?: string } {
  try {
    // 繝舌ャ繧ｯ繧｢繝・・繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺励↑縺・ｴ蜷医・菴懈・
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    // 繝舌ャ繧ｯ繧｢繝・・繝輔ぃ繧､繝ｫ蜷搾ｼ育樟蝨ｨ縺ｮ繧ｿ繧､繝繧ｹ繧ｿ繝ｳ繝励ｒ蜷ｫ繧・・
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `knowledge_base_backup_${timestamp}.json`;
    const backupPath = path.join(BACKUP_DIR, backupFileName);
    
    // 繝・く繧ｹ繝医さ繝ｳ繝・Φ繝・・繧､繝ｳ繝・ャ繧ｯ繧ｹ繧剃ｽ懈・
    const textFiles = fs.readdirSync(TEXT_DIR).filter(file => file.endsWith('.txt'));
    const textContents: Record<string, string> = {};
    
    for (const file of textFiles) {
      try {
        const content = fs.readFileSync(path.join(TEXT_DIR, file), 'utf-8');
        textContents[file] = content;
      } catch (error) {
        console.error(`繝輔ぃ繧､繝ｫ ${file} 縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:`, error);
      }
    }
    
    // 繝舌ャ繧ｯ繧｢繝・・繝・・繧ｿ讒矩
    const backupData = {
      timestamp: new Date().toISOString(),
      textFiles: textContents,
      // 蠢・ｦ√↓蠢懊§縺ｦ莉悶・繝・・繧ｿ繧りｿｽ蜉
    };
    
    // 繝舌ャ繧ｯ繧｢繝・・繝輔ぃ繧､繝ｫ縺ｫ譖ｸ縺崎ｾｼ縺ｿ
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
    
    console.log(`遏･隴倥・繝ｼ繧ｹ縺ｮ繝舌ャ繧ｯ繧｢繝・・繧剃ｽ懈・縺励∪縺励◆: ${backupFileName}`);
    
    return {
      success: true,
      message: `遏･隴倥・繝ｼ繧ｹ縺ｮ繝舌ャ繧ｯ繧｢繝・・繧剃ｽ懈・縺励∪縺励◆: ${backupFileName}`,
      backupPath
    };
  } catch (error) {
    console.error('遏･隴倥・繝ｼ繧ｹ縺ｮ繝舌ャ繧ｯ繧｢繝・・菴懈・繧ｨ繝ｩ繝ｼ:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
    };
  }
}

/**
 * 隍・焚縺ｮ繝峨く繝･繝｡繝ｳ繝医さ繝ｳ繝・Φ繝・ｒ繝槭・繧ｸ縺吶ｋ
 * @param contents 繝槭・繧ｸ縺吶ｋ繧ｳ繝ｳ繝・Φ繝・・驟榊・
 * @returns 繝槭・繧ｸ縺輔ｌ縺溘さ繝ｳ繝・Φ繝・
 */
export function mergeDocumentContent(contents: string[]): string {
  // 蜊倡ｴ斐↓謾ｹ陦後〒蛹ｺ蛻・▲縺ｦ繝槭・繧ｸ縺吶ｋ
  return contents.join('\n\n---\n\n');
}

/**
 * 遏･隴倥・繝ｼ繧ｹ縺ｮ繧､繝ｳ繝・ャ繧ｯ繧ｹ繧偵Ο繝ｼ繝峨☆繧・
 * @returns 繧､繝ｳ繝・ャ繧ｯ繧ｹ繝・・繧ｿ
 */
export function loadKnowledgeBaseIndex(): any {
  try {
    if (!fs.existsSync(INDEX_FILE)) {
      // 繧､繝ｳ繝・ャ繧ｯ繧ｹ繝輔ぃ繧､繝ｫ縺悟ｭ伜惠縺励↑縺・ｴ蜷医・遨ｺ縺ｮ繧､繝ｳ繝・ャ繧ｯ繧ｹ繧定ｿ斐☆
      return {
        documents: [],
        lastUpdated: new Date().toISOString()
      };
    }
    
    const indexContent = fs.readFileSync(INDEX_FILE, 'utf-8');
    return JSON.parse(indexContent);
  } catch (error) {
    console.error('遏･隴倥・繝ｼ繧ｹ繧､繝ｳ繝・ャ繧ｯ繧ｹ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:', error);
    
    // 繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺溷ｴ蜷医ｂ遨ｺ縺ｮ繧､繝ｳ繝・ャ繧ｯ繧ｹ繧定ｿ斐☆
    return {
      documents: [],
      lastUpdated: new Date().toISOString(),
      error: error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ'
    };
  }
}

/**
 * 遏･隴倥・繝ｼ繧ｹ縺ｫ菫晏ｭ倥＆繧後※縺・ｋ繝峨く繝･繝｡繝ｳ繝医・荳隕ｧ繧貞叙蠕励☆繧・
 * @returns 繝峨く繝･繝｡繝ｳ繝医・繝｡繧ｿ繝・・繧ｿ驟榊・
 */
export function listKnowledgeBaseDocuments(): { success: boolean; documents: any[]; message?: string } {
  try {
    // 繝・く繧ｹ繝医ヵ繧｡繧､繝ｫ繧貞叙蠕・
    const textFiles = fs.readdirSync(TEXT_DIR).filter(file => file.endsWith('.txt'));
    
    // 繝輔ぃ繧､繝ｫ諠・ｱ縺ｮ驟榊・繧剃ｽ懈・
    const documents = textFiles.map(file => {
      try {
        const stats = fs.statSync(path.join(TEXT_DIR, file));
        const content = fs.readFileSync(path.join(TEXT_DIR, file), 'utf-8');
        
        // 繝輔ぃ繧､繝ｫ蜷阪°繧峨Γ繧ｿ繝・・繧ｿ繧呈歓蜃ｺ
        const nameParts = file.split('_');
        const timestamp = parseInt(nameParts[nameParts.length - 1], 10) || stats.mtime.getTime();
        
        return {
          id: file.replace('.txt', ''),
          filename: file,
          title: nameParts.slice(0, -1).join('_').replace(/_/g, ' '),
          size: stats.size,
          createdAt: new Date(timestamp).toISOString(),
          lastModified: stats.mtime.toISOString(),
          contentPreview: content.substring(0, 200) + (content.length > 200 ? '...' : '')
        };
      } catch (error) {
        console.error(`繝輔ぃ繧､繝ｫ ${file} 縺ｮ諠・ｱ蜿門ｾ嶺ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:`, error);
        return {
          id: file.replace('.txt', ''),
          filename: file,
          title: file.replace('.txt', ''),
          error: error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ'
        };
      }
    });
    
    // 譁ｰ縺励＞鬆・↓荳ｦ縺ｹ譖ｿ縺・
    documents.sort((a, b) => {
      return new Date(b.createdAt || new Date()).getTime() - new Date(a.createdAt || new Date()).getTime();
    });
    
    return {
      success: true,
      documents
    };
  } catch (error) {
    console.error('遏･隴倥・繝ｼ繧ｹ繝峨く繝･繝｡繝ｳ繝井ｸ隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
    return {
      success: false,
      documents: [],
      message: error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
    };
  }
}

/**
 * 遏･隴倥・繝ｼ繧ｹ縺九ｉ繝峨く繝･繝｡繝ｳ繝医ｒ蜑企勁縺吶ｋ
 * @param documentId 繝峨く繝･繝｡繝ｳ繝・D
 * @returns 蜑企勁邨先棡
 */
export function removeDocumentFromKnowledgeBase(documentId: string): { success: boolean; message: string } {
  try {
    // 繝輔ぃ繧､繝ｫ蜷阪ｒ菴懈・・・txt縺悟性縺ｾ繧後※縺・↑縺・ｴ蜷医・霑ｽ蜉・・
    const filename = documentId.endsWith('.txt') ? documentId : `${documentId}.txt`;
    const filePath = path.join(TEXT_DIR, filename);
    
    // 繝輔ぃ繧､繝ｫ縺悟ｭ伜惠縺吶ｋ縺狗｢ｺ隱・
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        message: `繝峨く繝･繝｡繝ｳ繝・${documentId} 縺ｯ蟄伜惠縺励∪縺帙ｓ`
      };
    }
    
    // 繝輔ぃ繧､繝ｫ繧貞炎髯､
    fs.unlinkSync(filePath);
    
    console.log(`繝峨く繝･繝｡繝ｳ繝・${documentId} 繧堤衍隴倥・繝ｼ繧ｹ縺九ｉ蜑企勁縺励∪縺励◆`);
    
    return {
      success: true,
      message: `繝峨く繝･繝｡繝ｳ繝・${documentId} 繧堤衍隴倥・繝ｼ繧ｹ縺九ｉ蜑企勁縺励∪縺励◆`
    };
  } catch (error) {
    console.error('繝峨く繝･繝｡繝ｳ繝亥炎髯､繧ｨ繝ｩ繝ｼ:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
    };
  }
}