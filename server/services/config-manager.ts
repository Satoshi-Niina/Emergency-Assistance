import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { config } from 'dotenv';

// 迺ｰ蠅・､画焚繧定ｪｭ縺ｿ霎ｼ縺ｿ
config();

// RAG險ｭ螳壹・繧ｹ繧ｭ繝ｼ繝槫ｮ夂ｾｩ
export const RagConfigSchema = z.object({
  embedDim: z.number().min(1).max(4096).default(1536),
  chunkSize: z.number().min(100).max(2000).default(800),
  chunkOverlap: z.number().min(0).max(500).default(80),
  retrieveK: z.number().min(1).max(50).default(8),
  rerankTop: z.number().min(1).max(20).default(3),
  rerankMin: z.number().min(0).max(1).default(0.25),
  maxTextLength: z.number().min(1000).max(1000000).default(100000),
  batchSize: z.number().min(1).max(20).default(5),
  similarityThreshold: z.number().min(0).max(1).default(0.7)
});

export type RagConfig = z.infer<typeof RagConfigSchema>;

// 險ｭ螳壹ヵ繧｡繧､繝ｫ縺ｮ繝代せ
const CONFIG_DIR = path.join(process.cwd(), 'server', 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'rag.config.json');

// 繝・ヵ繧ｩ繝ｫ繝郁ｨｭ螳・
const DEFAULT_CONFIG: RagConfig = {
  embedDim: 1536,
  chunkSize: 800,
  chunkOverlap: 80,
  retrieveK: 8,
  rerankTop: 3,
  rerankMin: 0.25,
  maxTextLength: 100000,
  batchSize: 5,
  similarityThreshold: 0.7
};

/**
 * 險ｭ螳壹ヵ繧｡繧､繝ｫ繧定ｪｭ縺ｿ霎ｼ繧
 * @returns RAG險ｭ螳・
 */
export async function loadRagConfig(): Promise<RagConfig> {
  try {
    // 險ｭ螳壹ョ繧｣繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺励↑縺・ｴ蜷医・菴懈・
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    
    // 險ｭ螳壹ヵ繧｡繧､繝ｫ縺悟ｭ伜惠縺励↑縺・ｴ蜷医・繝・ヵ繧ｩ繝ｫ繝郁ｨｭ螳壹〒菴懈・
    try {
      await fs.access(CONFIG_FILE);
    } catch {
      console.log('統 RAG險ｭ螳壹ヵ繧｡繧､繝ｫ縺悟ｭ伜惠縺励∪縺帙ｓ縲ゅョ繝輔か繝ｫ繝郁ｨｭ螳壹〒菴懈・縺励∪縺吶・);
      await saveRagConfig(DEFAULT_CONFIG);
      return DEFAULT_CONFIG;
    }
    
    // 險ｭ螳壹ヵ繧｡繧､繝ｫ繧定ｪｭ縺ｿ霎ｼ縺ｿ
    const configData = await fs.readFile(CONFIG_FILE, 'utf-8');
    const parsedConfig = JSON.parse(configData);
    
    // 繧ｹ繧ｭ繝ｼ繝樊､懆ｨｼ
    const validatedConfig = RagConfigSchema.parse(parsedConfig);
    
    // 迺ｰ蠅・､画焚縺九ｉ蛟､繧剃ｸ頑嶌縺搾ｼ・env縺悟ｭ伜惠縺吶ｋ蝣ｴ蜷茨ｼ・
    if (process.env.EMBED_DIM) {
      const embedDim = parseInt(process.env.EMBED_DIM);
      if (!isNaN(embedDim) && embedDim > 0) {
        validatedConfig.embedDim = embedDim;
        console.log(`肌 EMBED_DIM迺ｰ蠅・､画焚縺九ｉ險ｭ螳壹ｒ隱ｭ縺ｿ霎ｼ縺ｿ: ${embedDim}`);
      }
    }
    
    console.log('笨・RAG險ｭ螳壹ｒ隱ｭ縺ｿ霎ｼ縺ｿ縺ｾ縺励◆:', validatedConfig);
    return validatedConfig;
    
  } catch (error) {
    console.error('笶・RAG險ｭ螳壹・隱ｭ縺ｿ霎ｼ縺ｿ縺ｫ螟ｱ謨励＠縺ｾ縺励◆:', error);
    console.log('笞・・繝・ヵ繧ｩ繝ｫ繝郁ｨｭ螳壹ｒ菴ｿ逕ｨ縺励∪縺吶・);
    return DEFAULT_CONFIG;
  }
}

/**
 * 險ｭ螳壹ヵ繧｡繧､繝ｫ繧剃ｿ晏ｭ倥☆繧・
 * @param config RAG險ｭ螳・
 */
export async function saveRagConfig(config: RagConfig): Promise<void> {
  try {
    // 險ｭ螳壹ョ繧｣繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺励↑縺・ｴ蜷医・菴懈・
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    
    // 險ｭ螳壹ｒ讀懆ｨｼ
    const validatedConfig = RagConfigSchema.parse(config);
    
    // 險ｭ螳壹ヵ繧｡繧､繝ｫ縺ｫ菫晏ｭ・
    await fs.writeFile(CONFIG_FILE, JSON.stringify(validatedConfig, null, 2), 'utf-8');
    
    console.log('笨・RAG險ｭ螳壹ｒ菫晏ｭ倥＠縺ｾ縺励◆:', validatedConfig);
    
  } catch (error) {
    console.error('笶・RAG險ｭ螳壹・菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆:', error);
    throw new Error(`險ｭ螳壹・菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 險ｭ螳壹ｒ譖ｴ譁ｰ縺吶ｋ・磯Κ蛻・峩譁ｰ・・
 * @param partialConfig 驛ｨ蛻・噪縺ｪ險ｭ螳壽峩譁ｰ
 * @returns 譖ｴ譁ｰ蠕後・險ｭ螳・
 */
export async function updateRagConfig(partialConfig: Partial<RagConfig>): Promise<RagConfig> {
  try {
    const currentConfig = await loadRagConfig();
    const updatedConfig = { ...currentConfig, ...partialConfig };
    
    // 譖ｴ譁ｰ縺輔ｌ縺溯ｨｭ螳壹ｒ讀懆ｨｼ
    const validatedConfig = RagConfigSchema.parse(updatedConfig);
    
    // 險ｭ螳壹ｒ菫晏ｭ・
    await saveRagConfig(validatedConfig);
    
    return validatedConfig;
    
  } catch (error) {
    console.error('笶・RAG險ｭ螳壹・譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆:', error);
    throw new Error(`險ｭ螳壹・譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 險ｭ螳壹・讀懆ｨｼ繧定｡後≧
 * @param config 讀懆ｨｼ蟇ｾ雎｡縺ｮ險ｭ螳・
 * @returns 讀懆ｨｼ邨先棡
 */
export function validateRagConfig(config: unknown): { valid: boolean; errors: string[] } {
  try {
    RagConfigSchema.parse(config);
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      };
    }
    return {
      valid: false,
      errors: ['Unknown validation error']
    };
  }
}

/**
 * 險ｭ螳壹・蟾ｮ蛻・ｒ遒ｺ隱阪☆繧・
 * @param newConfig 譁ｰ縺励＞險ｭ螳・
 * @returns 螟画峩縺輔ｌ縺滄・岼縺ｮ繝ｪ繧ｹ繝・
 */
export async function getConfigDiff(newConfig: Partial<RagConfig>): Promise<string[]> {
  try {
    const currentConfig = await loadRagConfig();
    const changes: string[] = [];
    
    for (const [key, value] of Object.entries(newConfig)) {
      if (currentConfig[key as keyof RagConfig] !== value) {
        changes.push(`${key}: ${currentConfig[key as keyof RagConfig]} 竊・${value}`);
      }
    }
    
    return changes;
  } catch (error) {
    console.error('笶・險ｭ螳壼ｷｮ蛻・・遒ｺ隱阪↓螟ｱ謨励＠縺ｾ縺励◆:', error);
    return [];
  }
}
