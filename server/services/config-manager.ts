import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { config } from 'dotenv';

// 環境変数を読み込み
config();

// RAG設定のスキーマ定義
export const RagConfigSchema = z.object({
  embedDim: z.number().min(1).max(4096).default(1536),
  chunkSize: z.number().min(100).max(2000).default(800),
  chunkOverlap: z.number().min(0).max(500).default(80),
  retrieveK: z.number().min(1).max(50).default(8),
  rerankTop: z.number().min(1).max(20).default(3),
  rerankMin: z.number().min(0).max(1).default(0.25),
  maxTextLength: z.number().min(1000).max(1000000).default(100000),
  batchSize: z.number().min(1).max(20).default(5),
  similarityThreshold: z.number().min(0).max(1).default(0.7),
});

export type RagConfig = z.infer<typeof RagConfigSchema>;

// 設定ファイルのパス
const CONFIG_DIR = path.join(process.cwd(), 'server', 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'rag.config.json');

// デフォルト設定
const DEFAULT_CONFIG: RagConfig = {
  embedDim: 1536,
  chunkSize: 800,
  chunkOverlap: 80,
  retrieveK: 8,
  rerankTop: 3,
  rerankMin: 0.25,
  maxTextLength: 100000,
  batchSize: 5,
  similarityThreshold: 0.7,
};

/**
 * 設定ファイルを読み込む
 * @returns RAG設定
 */
export async function loadRagConfig(): Promise<RagConfig> {
  try {
    // 設定ディレクトリが存在しない場合は作成
    await fs.mkdir(CONFIG_DIR, { recursive: true });

    // 設定ファイルが存在しない場合はデフォルト設定で作成
    try {
      await fs.access(CONFIG_FILE);
    } catch {
      console.log(
        '📝 RAG設定ファイルが存在しません。デフォルト設定で作成します。'
      );
      await saveRagConfig(DEFAULT_CONFIG);
      return DEFAULT_CONFIG;
    }

    // 設定ファイルを読み込み
    const configData = await fs.readFile(CONFIG_FILE, 'utf-8');
    const parsedConfig = JSON.parse(configData);

    // スキーマ検証
    const validatedConfig = RagConfigSchema.parse(parsedConfig);

    // 環境変数から値を上書き（.envが存在する場合）
    if (process.env.EMBED_DIM) {
      const embedDim = parseInt(process.env.EMBED_DIM);
      if (!isNaN(embedDim) && embedDim > 0) {
        validatedConfig.embedDim = embedDim;
        console.log(`🔧 EMBED_DIM環境変数から設定を読み込み: ${embedDim}`);
      }
    }

    console.log('✅ RAG設定を読み込みました:', validatedConfig);
    return validatedConfig;
  } catch (error) {
    console.error('❌ RAG設定の読み込みに失敗しました:', error);
    console.log('⚠️ デフォルト設定を使用します。');
    return DEFAULT_CONFIG;
  }
}

/**
 * 設定ファイルを保存する
 * @param config RAG設定
 */
export async function saveRagConfig(config: RagConfig): Promise<void> {
  try {
    // 設定ディレクトリが存在しない場合は作成
    await fs.mkdir(CONFIG_DIR, { recursive: true });

    // 設定を検証
    const validatedConfig = RagConfigSchema.parse(config);

    // 設定ファイルに保存
    await fs.writeFile(
      CONFIG_FILE,
      JSON.stringify(validatedConfig, null, 2),
      'utf-8'
    );

    console.log('✅ RAG設定を保存しました:', validatedConfig);
  } catch (error) {
    console.error('❌ RAG設定の保存に失敗しました:', error);
    throw new Error(
      `設定の保存に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * 設定を更新する（部分更新）
 * @param partialConfig 部分的な設定更新
 * @returns 更新後の設定
 */
export async function updateRagConfig(
  partialConfig: Partial<RagConfig>
): Promise<RagConfig> {
  try {
    const currentConfig = await loadRagConfig();
    const updatedConfig = { ...currentConfig, ...partialConfig };

    // 更新された設定を検証
    const validatedConfig = RagConfigSchema.parse(updatedConfig);

    // 設定を保存
    await saveRagConfig(validatedConfig);

    return validatedConfig;
  } catch (error) {
    console.error('❌ RAG設定の更新に失敗しました:', error);
    throw new Error(
      `設定の更新に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * 設定の検証を行う
 * @param config 検証対象の設定
 * @returns 検証結果
 */
export function validateRagConfig(config: unknown): {
  valid: boolean;
  errors: string[];
} {
  try {
    RagConfigSchema.parse(config);
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(
          err => `${err.path.join('.')}: ${err.message}`
        ),
      };
    }
    return {
      valid: false,
      errors: ['Unknown validation error'],
    };
  }
}

/**
 * 設定の差分を確認する
 * @param newConfig 新しい設定
 * @returns 変更された項目のリスト
 */
export async function getConfigDiff(
  newConfig: Partial<RagConfig>
): Promise<string[]> {
  try {
    const currentConfig = await loadRagConfig();
    const changes: string[] = [];

    for (const [key, value] of Object.entries(newConfig)) {
      if (currentConfig[key as keyof RagConfig] !== value) {
        changes.push(
          `${key}: ${currentConfig[key as keyof RagConfig]} → ${value}`
        );
      }
    }

    return changes;
  } catch (error) {
    console.error('❌ 設定差分の確認に失敗しました:', error);
    return [];
  }
}
