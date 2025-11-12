"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RagConfigSchema = void 0;
exports.loadRagConfig = loadRagConfig;
exports.saveRagConfig = saveRagConfig;
exports.updateRagConfig = updateRagConfig;
exports.validateRagConfig = validateRagConfig;
exports.getConfigDiff = getConfigDiff;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
const dotenv_1 = require("dotenv");
// 環境変数を読み込み
(0, dotenv_1.config)();
// RAG設定のスキーマ定義
exports.RagConfigSchema = zod_1.z.object({
    embedDim: zod_1.z.number().min(1).max(4096).default(1536),
    chunkSize: zod_1.z.number().min(100).max(2000).default(800),
    chunkOverlap: zod_1.z.number().min(0).max(500).default(80),
    retrieveK: zod_1.z.number().min(1).max(50).default(8),
    rerankTop: zod_1.z.number().min(1).max(20).default(3),
    rerankMin: zod_1.z.number().min(0).max(1).default(0.25),
    maxTextLength: zod_1.z.number().min(1000).max(1000000).default(100000),
    batchSize: zod_1.z.number().min(1).max(20).default(5),
    similarityThreshold: zod_1.z.number().min(0).max(1).default(0.7),
});
// 設定ファイルのパス
const CONFIG_DIR = path_1.default.join(process.cwd(), 'server', 'config');
const CONFIG_FILE = path_1.default.join(CONFIG_DIR, 'rag.config.json');
// デフォルト設定
const DEFAULT_CONFIG = {
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
async function loadRagConfig() {
    try {
        // 設定ディレクトリが存在しない場合は作成
        await promises_1.default.mkdir(CONFIG_DIR, { recursive: true });
        // 設定ファイルが存在しない場合はデフォルト設定で作成
        try {
            await promises_1.default.access(CONFIG_FILE);
        }
        catch {
            console.log('📝 RAG設定ファイルが存在しません。デフォルト設定で作成します。');
            await saveRagConfig(DEFAULT_CONFIG);
            return DEFAULT_CONFIG;
        }
        // 設定ファイルを読み込み
        const configData = await promises_1.default.readFile(CONFIG_FILE, 'utf-8');
        const parsedConfig = JSON.parse(configData);
        // スキーマ検証
        const validatedConfig = exports.RagConfigSchema.parse(parsedConfig);
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
    }
    catch (error) {
        console.error('❌ RAG設定の読み込みに失敗しました:', error);
        console.log('⚠️ デフォルト設定を使用します。');
        return DEFAULT_CONFIG;
    }
}
/**
 * 設定ファイルを保存する
 * @param config RAG設定
 */
async function saveRagConfig(config) {
    try {
        // 設定ディレクトリが存在しない場合は作成
        await promises_1.default.mkdir(CONFIG_DIR, { recursive: true });
        // 設定を検証
        const validatedConfig = exports.RagConfigSchema.parse(config);
        // 設定ファイルに保存
        await promises_1.default.writeFile(CONFIG_FILE, JSON.stringify(validatedConfig, null, 2), 'utf-8');
        console.log('✅ RAG設定を保存しました:', validatedConfig);
    }
    catch (error) {
        console.error('❌ RAG設定の保存に失敗しました:', error);
        throw new Error(`設定の保存に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * 設定を更新する（部分更新）
 * @param partialConfig 部分的な設定更新
 * @returns 更新後の設定
 */
async function updateRagConfig(partialConfig) {
    try {
        const currentConfig = await loadRagConfig();
        const updatedConfig = { ...currentConfig, ...partialConfig };
        // 更新された設定を検証
        const validatedConfig = exports.RagConfigSchema.parse(updatedConfig);
        // 設定を保存
        await saveRagConfig(validatedConfig);
        return validatedConfig;
    }
    catch (error) {
        console.error('❌ RAG設定の更新に失敗しました:', error);
        throw new Error(`設定の更新に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * 設定の検証を行う
 * @param config 検証対象の設定
 * @returns 検証結果
 */
function validateRagConfig(config) {
    try {
        exports.RagConfigSchema.parse(config);
        return { valid: true, errors: [] };
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return {
                valid: false,
                errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
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
async function getConfigDiff(newConfig) {
    try {
        const currentConfig = await loadRagConfig();
        const changes = [];
        for (const [key, value] of Object.entries(newConfig)) {
            if (currentConfig[key] !== value) {
                changes.push(`${key}: ${currentConfig[key]} → ${value}`);
            }
        }
        return changes;
    }
    catch (error) {
        console.error('❌ 設定差分の確認に失敗しました:', error);
        return [];
    }
}
