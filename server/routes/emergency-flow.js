"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = __importStar(require("express"));
const openai_1 = __importDefault(require("openai"));
const zod_1 = require("zod");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const image_uploader_js_1 = require("../utils/image-uploader.js");
const crypto = __importStar(require("crypto"));
const url_1 = require("url");
// ESM用__dirname定義
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();
// 開発環境ではOpenAI APIキーがなくても動作するように条件付き初期化
let openai = null;
if (process.env.OPENAI_API_KEY &&
    process.env.OPENAI_API_KEY !== 'dev-mock-key') {
    openai = new openai_1.default({
        apiKey: process.env.OPENAI_API_KEY,
    });
}
else {
    console.log('[DEV] OpenAI client not initialized - API key not available');
}
const generateFlowSchema = zod_1.z.object({
    keyword: zod_1.z.string().min(1),
});
// テンプレートスキーマを適用する関数（仮実装）
function applyTemplateSchema(data) {
    // TODO: 実際のスキーマ適用ロジックを実装
    // 例：dataに必要なフィールドが存在しない場合にデフォルト値を追加する
    if (data && data.steps) {
        data.steps = data.steps.map((step) => {
            if (step.type === 'decision' && !step.options) {
                step.options = [
                    {
                        text: 'はい',
                        nextStepId: '',
                        condition: '',
                        isTerminal: false,
                        conditionType: 'yes',
                    },
                    {
                        text: 'いいえ',
                        nextStepId: '',
                        condition: '',
                        isTerminal: false,
                        conditionType: 'no',
                    },
                ];
            }
            return step;
        });
    }
    return data;
}
// POST /api/emergency-flow/update-step-title
router.post('/update-step-title', async (_req, res) => {
    try {
        const { flowId, stepId, title } = req.body;
        if (!flowId || !stepId || !title) {
            return res
                .status(400)
                .json({ error: 'flowId, stepId, title are required' });
        }
        // トラブルシューティングディレクトリから該当するJSONファイルを検索
        const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
        if (!fs.existsSync(troubleshootingDir)) {
            return res
                .status(404)
                .json({ error: 'トラブルシューティングディレクトリが見つかりません' });
        }
        const files = fs.readdirSync(troubleshootingDir);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        let flowData = null;
        let fileName = null;
        // IDに一致するファイルを検索
        for (const file of jsonFiles) {
            try {
                const filePath = path.join(troubleshootingDir, file);
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const data = JSON.parse(fileContent);
                if (data.id === flowId || file.replace('.json', '') === flowId) {
                    flowData = data;
                    fileName = file;
                    break;
                }
            }
            catch (error) {
                console.error(`❌ ファイル ${file} の読み込みエラー:`, error);
            }
        }
        if (!flowData) {
            return res.status(404).json({ error: 'フローが見つかりません' });
        }
        const steps = flowData.steps || [];
        // 指定されたステップのタイトルを更新
        const stepIndex = steps.findIndex(step => step.id === stepId);
        if (stepIndex === -1) {
            return res.status(404).json({ error: 'ステップが見つかりません' });
        }
        steps[stepIndex].title = title;
        flowData.steps = steps;
        flowData.updatedAt = new Date().toISOString();
        // JSONファイルを更新
        const filePath = path.join(troubleshootingDir, fileName);
        fs.writeFileSync(filePath, JSON.stringify(flowData, null, 2), 'utf-8');
        res.json({ success: true, message: 'タイトルが更新されました' });
    }
    catch (error) {
        console.error('タイトル更新エラー:', error);
        res.status(500).json({ error: 'タイトル更新に失敗しました' });
    }
});
// フローデータのスキーマ定義
const flowDataSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    steps: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        title: zod_1.z.string(),
        description: zod_1.z.string(),
        message: zod_1.z.string(),
        type: zod_1.z.enum(['start', 'step', 'decision', 'condition', 'end']),
        imageUrl: zod_1.z.string().optional(),
        options: zod_1.z
            .array(zod_1.z.object({
            text: zod_1.z.string(),
            nextStepId: zod_1.z.string(),
            isTerminal: zod_1.z.boolean(),
            conditionType: zod_1.z.enum(['yes', 'no', 'other']),
            condition: zod_1.z.string().optional(),
        }))
            .optional(),
    })),
    triggerKeywords: zod_1.z.array(zod_1.z.string()),
});
// フロー保存エンドポイント（新規作成・更新）
router.post('/', async (_req, res) => {
    try {
        const flowData = req.body;
        console.log('🔄 フロー保存開始:', {
            id: flowData.id,
            title: flowData.title,
        });
        // 必須フィールドの検証
        if (!flowData.title) {
            return res.status(400).json({
                success: false,
                error: 'タイトルは必須です',
            });
        }
        // IDが指定されていない場合は生成
        if (!flowData.id) {
            flowData.id = `flow_${Date.now()}`;
        }
        // タイムスタンプを設定
        flowData.createdAt = flowData.createdAt || new Date().toISOString();
        flowData.updatedAt = new Date().toISOString();
        // トラブルシューティングディレクトリに保存
        try {
            const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
            if (!fs.existsSync(troubleshootingDir)) {
                fs.mkdirSync(troubleshootingDir, { recursive: true });
            }
            const fileName = `${flowData.id}.json`;
            const filePath = path.join(troubleshootingDir, fileName);
            // 既存ファイルの確認
            const isExisting = fs.existsSync(filePath);
            // タイムスタンプを更新
            flowData.updatedAt = new Date().toISOString();
            if (!flowData.createdAt) {
                flowData.createdAt = new Date().toISOString();
            }
            // JSONファイルに保存
            fs.writeFileSync(filePath, JSON.stringify(flowData, null, 2), 'utf-8');
            if (isExisting) {
                console.log('✅ 既存フロー更新成功:', {
                    id: flowData.id,
                    title: flowData.title,
                    filePath: filePath,
                });
            }
            else {
                console.log('✅ 新規フロー作成成功:', {
                    id: flowData.id,
                    title: flowData.title,
                    filePath: filePath,
                });
            }
        }
        catch (fileError) {
            console.error('❌ ファイル保存エラー:', fileError);
            return res.status(500).json({
                success: false,
                error: 'ファイルへの保存に失敗しました',
                details: fileError instanceof Error ? fileError.message : 'Unknown file error',
            });
        }
        console.log('✅ フロー保存成功:', {
            id: flowData.id,
            title: flowData.title,
            stepsCount: flowData.steps?.length || 0,
        });
        res.json({
            success: true,
            data: flowData,
            message: 'フローが正常に保存されました',
        });
    }
    catch (error) {
        console.error('❌ フロー保存エラー:', error);
        res.status(500).json({
            success: false,
            error: 'フローの保存に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// フロー更新エンドポイント
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const flowData = req.body;
        console.log('🔄 フロー更新開始:', { id, title: flowData.title });
        // IDの一致確認
        if (id !== flowData.id) {
            return res.status(400).json({
                success: false,
                error: 'URLのIDとデータのIDが一致しません',
            });
        }
        // 必須フィールドの検証
        if (!flowData.title) {
            return res.status(400).json({
                success: false,
                error: 'タイトルは必須です',
            });
        }
        // トラブルシューティングディレクトリから該当するJSONファイルを検索
        const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
        if (!fs.existsSync(troubleshootingDir)) {
            return res.status(404).json({
                success: false,
                error: 'トラブルシューティングディレクトリが見つかりません',
            });
        }
        const files = fs.readdirSync(troubleshootingDir);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        let fileName = null;
        // IDに一致するファイルを検索
        for (const file of jsonFiles) {
            try {
                const filePath = path.join(troubleshootingDir, file);
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const data = JSON.parse(fileContent);
                if (data.id === id || file.replace('.json', '') === id) {
                    fileName = file;
                    break;
                }
            }
            catch (error) {
                console.error(`❌ ファイル ${file} の読み込みエラー:`, error);
            }
        }
        if (!fileName) {
            return res.status(404).json({
                success: false,
                error: '更新対象のフローが見つかりません',
            });
        }
        // 既存ファイルの読み込み
        const filePath = path.join(troubleshootingDir, fileName);
        let originalData = null;
        if (fs.existsSync(filePath)) {
            try {
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                originalData = JSON.parse(fileContent);
                console.log('📖 既存データ読み込み成功:', {
                    id: originalData.id,
                    title: originalData.title,
                    stepsCount: originalData.steps?.length || 0,
                    hasImages: originalData.steps?.some((step) => step.images && step.images.length > 0) || false
                });
            }
            catch (error) {
                console.error('❌ 既存ファイル読み込みエラー:', error);
                originalData = null;
            }
        }
        // 差分を適用して更新（深いマージ）
        const mergeData = (original, updates) => {
            const result = { ...original };
            for (const [key, value] of Object.entries(updates)) {
                if (value !== null &&
                    typeof value === 'object' &&
                    !Array.isArray(value)) {
                    // オブジェクトの場合は再帰的にマージ
                    result[key] = mergeData(result[key] || {}, value);
                }
                else if (Array.isArray(value) && key === 'steps') {
                    // steps配列の場合は特別な処理
                    if (result[key] && Array.isArray(result[key])) {
                        // 既存のstepsと新しいstepsをマージ
                        result[key] = value.map((newStep) => {
                            const existingStep = result[key].find((step) => step.id === newStep.id);
                            if (existingStep) {
                                // 既存のステップがある場合は、画像データを保持してマージ
                                return {
                                    ...existingStep,
                                    ...newStep,
                                    // 画像データは新しいデータを優先するが、既存の画像も保持
                                    images: newStep.images || existingStep.images || []
                                };
                            }
                            return newStep;
                        });
                    }
                    else {
                        result[key] = value;
                    }
                }
                else {
                    // プリミティブ値やその他の配列は直接代入
                    result[key] = value;
                }
            }
            return result;
        };
        // 画像情報の詳細ログと処理
        if (flowData.steps) {
            flowData.steps.forEach((step, index) => {
                // 画像配列が存在しない場合は空配列を設定
                if (!step.images) {
                    step.images = [];
                }
                // 画像配列が存在する場合の処理
                if (step.images && step.images.length > 0) {
                    console.log(`🖼️ ステップ[${index}]の画像情報:`, {
                        stepId: step.id,
                        stepTitle: step.title,
                        imagesCount: step.images.length,
                        images: step.images.map((img) => ({
                            fileName: img.fileName,
                            url: img.url?.substring(0, 100) + '...',
                            hasFile: !!img.file,
                            urlValid: img.url && img.url.trim() !== '',
                            fileNameValid: img.fileName && img.fileName.trim() !== ''
                        }))
                    });
                    // 画像情報の検証と修正
                    step.images = step.images.filter((img) => {
                        if (!img || !img.url || img.url.trim() === '') {
                            console.log(`❌ 無効な画像情報を除外:`, img);
                            return false;
                        }
                        // ファイル名が無い場合はURLから抽出
                        if (!img.fileName || img.fileName.trim() === '') {
                            if (img.url.includes('/')) {
                                img.fileName = img.url.split('/').pop() || '';
                            }
                            else if (img.url.includes('\\')) {
                                img.fileName = img.url.split('\\').pop() || '';
                            }
                            else {
                                img.fileName = img.url;
                            }
                            console.log(`📁 ファイル名を補完:`, { url: img.url, fileName: img.fileName });
                        }
                        return true;
                    });
                }
                else {
                    console.log(`📝 ステップ[${index}]に画像なし:`, {
                        stepId: step.id,
                        stepTitle: step.title,
                        imagesCount: 0
                    });
                }
            });
        }
        const updatedFlowData = mergeData(originalData || {}, {
            ...flowData,
            updatedAt: new Date().toISOString(),
            // 更新履歴を追加
            updateHistory: [
                ...(originalData?.updateHistory || []),
                {
                    timestamp: new Date().toISOString(),
                    updatedFields: Object.keys(flowData),
                    updatedBy: 'user', // 必要に応じて認証情報から取得
                },
            ],
        });
        // 画像データの最終的な検証と修正
        if (updatedFlowData.steps) {
            updatedFlowData.steps.forEach((step, index) => {
                if (step.images && Array.isArray(step.images)) {
                    // 画像配列の検証とクリーニング
                    step.images = step.images.filter((img) => {
                        if (!img || typeof img !== 'object') {
                            console.log(`❌ 無効な画像オブジェクトを除外:`, img);
                            return false;
                        }
                        if (!img.url || typeof img.url !== 'string' || img.url.trim() === '') {
                            console.log(`❌ URLが無効な画像を除外:`, img);
                            return false;
                        }
                        // ファイル名が無い場合はURLから抽出
                        if (!img.fileName || img.fileName.trim() === '') {
                            if (img.url.includes('/')) {
                                img.fileName = img.url.split('/').pop() || '';
                            }
                            else if (img.url.includes('\\')) {
                                img.fileName = img.url.split('\\').pop() || '';
                            }
                            else {
                                img.fileName = img.url;
                            }
                            console.log(`📁 ファイル名を補完:`, { url: img.url, fileName: img.fileName });
                        }
                        return true;
                    });
                    console.log(`🖼️ ステップ[${index}]の最終画像データ:`, {
                        stepId: step.id,
                        stepTitle: step.title,
                        imagesCount: step.images.length,
                        images: step.images.map((img) => ({
                            fileName: img.fileName,
                            url: img.url?.substring(0, 100) + '...',
                            urlValid: img.url && img.url.trim() !== ''
                        }))
                    });
                }
            });
        }
        // JSONファイルを更新
        fs.writeFileSync(filePath, JSON.stringify(updatedFlowData, null, 2), 'utf-8');
        console.log('✅ フロー更新成功:', {
            id: updatedFlowData.id,
            title: updatedFlowData.title,
            stepsCount: updatedFlowData.steps?.length || 0,
            stepsWithImages: updatedFlowData.steps?.filter((step) => step.images && step.images.length > 0).length || 0,
            allStepsImages: updatedFlowData.steps?.map((step) => ({
                stepId: step.id,
                stepTitle: step.title,
                imagesCount: step.images?.length || 0,
                images: step.images?.map((img) => ({
                    fileName: img.fileName,
                    url: img.url?.substring(0, 100) + '...'
                })) || []
            })) || [],
            filePath: filePath,
        });
        res.json({
            success: true,
            data: updatedFlowData,
            message: 'フローが正常に更新されました',
        });
    }
    catch (error) {
        console.error('❌ フロー更新エラー:', error);
        res.status(500).json({
            success: false,
            error: 'フローの更新に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// フロー一覧取得エンドポイント（ルートパス）
router.get('/', async (_req, res) => {
    try {
        // Content-Typeを明示的に設定
        res.setHeader('Content-Type', 'application/json');
        console.log('🔍 トラブルシューティングディレクトリからフロー一覧を取得中...');
        // トラブルシューティングディレクトリからJSONファイルを読み込み
        const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
        // サーバーディレクトリから起動されている場合の代替パス
        const alternativeDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
        console.log('🔍 トラブルシューティングディレクトリパス:', troubleshootingDir);
        console.log('🔍 現在の作業ディレクトリ:', process.cwd());
        console.log('🔍 絶対パス:', path.resolve(troubleshootingDir));
        // ディレクトリの存在確認と適切なパスの選択
        let targetDir = troubleshootingDir;
        if (!fs.existsSync(troubleshootingDir)) {
            console.log('❌ メインディレクトリが存在しません、代替パスを試行中...');
            if (fs.existsSync(alternativeDir)) {
                console.log(`✅ 代替パスが見つかりました: ${alternativeDir}`);
                targetDir = alternativeDir;
            }
            else {
                console.error('❌ どのパスでもディレクトリが見つかりませんでした');
                return res.json({
                    success: false,
                    error: 'トラブルシューティングディレクトリが見つかりません',
                    timestamp: new Date().toISOString(),
                });
            }
        }
        const fileList = await loadFromDirectory(targetDir);
        // 作成日時でソート
        fileList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        console.log('📋 最終的なフロー一覧:', fileList);
        res.json({
            success: true,
            data: fileList,
            total: fileList.length,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ フロー一覧取得エラー:', error);
        res.status(500).json({
            success: false,
            error: 'フロー一覧の取得に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
        });
    }
});
// 指定されたディレクトリからファイルを読み込む関数
async function loadFromDirectory(dirPath) {
    try {
        console.log(`📁 ディレクトリから読み込み中: ${dirPath}`);
        const files = fs.readdirSync(dirPath);
        console.log('📁 ディレクトリ内のファイル:', files);
        const jsonFiles = files.filter(file => {
            const isJson = file.endsWith('.json');
            const isNotBackup = !file.includes('.backup');
            const isNotTmp = !file.includes('.tmp');
            console.log(`📄 ファイル ${file}: JSON=${isJson}, バックアップ=${!isNotBackup}, 一時=${!isNotTmp}`);
            return isJson && isNotBackup && isNotTmp;
        });
        console.log('📄 処理対象のJSONファイル:', jsonFiles);
        const fileList = [];
        for (const file of jsonFiles) {
            try {
                const filePath = path.join(dirPath, file);
                console.log(`🔍 ファイル読み込み中: ${filePath}`);
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                console.log(`📄 ファイル ${file} のサイズ: ${fileContent.length} 文字`);
                const flowData = JSON.parse(fileContent);
                console.log(`✅ ファイル ${file} のJSON解析成功:`, {
                    id: flowData.id,
                    title: flowData.title,
                    hasDescription: !!flowData.description,
                    hasSteps: !!(flowData.steps && flowData.steps.length > 0),
                });
                let description = flowData.description || '';
                if (!description && flowData.steps && flowData.steps.length > 0) {
                    const firstStep = flowData.steps[0];
                    description = firstStep.description || firstStep.message || '';
                }
                // タイトルを複数のソースから取得
                let title = flowData.title ||
                    flowData.metadata?.title ||
                    flowData.metadata?.タイトル ||
                    flowData.name ||
                    flowData.problemDescription ||
                    'タイトルなし';
                const result = {
                    id: flowData.id || file.replace('.json', ''),
                    title: title,
                    description: description,
                    fileName: file,
                    filePath: `knowledge-base/troubleshooting/${file}`,
                    createdAt: flowData.createdAt || new Date().toISOString(),
                    updatedAt: flowData.updatedAt || new Date().toISOString(),
                    triggerKeywords: flowData.triggerKeywords || flowData.trigger || [],
                    category: flowData.category || '',
                    dataSource: 'file',
                };
                fileList.push(result);
                console.log(`✅ フロー ${result.id} 処理完了:`, result);
            }
            catch (error) {
                console.error(`❌ ファイル ${file} の解析中にエラーが発生しました:`, error);
                console.error(`🔍 エラーの詳細:`, {
                    message: error instanceof Error ? error.message : 'Unknown error',
                    stack: error instanceof Error ? error.stack : undefined,
                });
                // JSONファイルが破損している場合は、バックアップファイルを作成
                if (error instanceof SyntaxError && error.message.includes('JSON')) {
                    console.log(`🔄 破損したJSONファイルを検出: ${file}`);
                    // バックアップファイルを作成
                    const backupPath = path.join(dirPath, `${file}.backup.${Date.now()}`);
                    try {
                        fs.copyFileSync(filePath, backupPath);
                        console.log(`✅ バックアップファイルを作成: ${backupPath}`);
                    }
                    catch (backupError) {
                        console.error(`❌ バックアップファイル作成失敗:`, backupError);
                    }
                }
                continue; // エラーファイルをスキップして続行
            }
        }
        console.log(`📋 有効なファイル数: ${fileList.length}/${jsonFiles.length}`);
        // 有効なファイルがない場合は警告を出力
        if (fileList.length === 0) {
            console.warn(`⚠️ 有効なフローファイルが見つかりませんでした: ${dirPath}`);
        }
        return fileList;
    }
    catch (error) {
        console.error(`❌ ディレクトリ ${dirPath} からの読み込みエラー:`, error);
        return [];
    }
}
// フロー一覧取得エンドポイント（互換性のため残す）
router.get('/list', async (_req, res) => {
    try {
        console.log('🔍 応急処置フローディレクトリからフロー一覧を取得中（/list）...');
        // 応急処置フローディレクトリからJSONファイルを読み込み
        const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
        console.log('🔍 トラブルシューティングディレクトリパス:', troubleshootingDir);
        console.log('🔍 現在の作業ディレクトリ:', process.cwd());
        console.log('🔍 絶対パス:', path.resolve(troubleshootingDir));
        if (!fs.existsSync(troubleshootingDir)) {
            console.log('❌ トラブルシューティングディレクトリが存在しません');
            console.log('🔍 代替パスを試行中...');
            // 代替パスを試行
            const alternativePaths = [
                path.join(process.cwd(), 'knowledge-base', 'troubleshooting'),
                path.join(__dirname, '..', '..', 'knowledge-base', 'troubleshooting'),
                path.join(__dirname, '..', 'knowledge-base', 'troubleshooting'),
            ];
            for (const altPath of alternativePaths) {
                console.log(`🔍 代替パスをチェック中: ${altPath}`);
                if (fs.existsSync(altPath)) {
                    console.log(`✅ 代替パスが見つかりました: ${altPath}`);
                    const fileList = await loadFromDirectory(altPath);
                    return res.json({
                        success: true,
                        data: fileList,
                        total: fileList.length,
                        timestamp: new Date().toISOString(),
                    });
                }
            }
            console.error('❌ どのパスでもディレクトリが見つかりませんでした');
            return res.json({
                success: true,
                data: [],
                total: 0,
                timestamp: new Date().toISOString(),
            });
        }
        const fileList = await loadFromDirectory(troubleshootingDir);
        // 作成日時でソート
        fileList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        console.log('📋 最終的なフロー一覧:', fileList);
        res.json({
            success: true,
            data: fileList,
            total: fileList.length,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('❌ フロー一覧取得エラー:', error);
        res.status(500).json({
            success: false,
            error: 'フロー一覧の取得に失敗しました',
            details: error.message,
            timestamp: new Date().toISOString(),
        });
    }
});
// フロー詳細取得エンドポイント
router.get('/detail/:id', async (req, res) => {
    try {
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2);
        // キャッシュ制御ヘッダーを設定
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            Pragma: 'no-cache',
            Expires: 'Thu, 01 Jan 1970 00:00:00 GMT',
            'Last-Modified': new Date().toUTCString(),
            ETag: `"${timestamp}-${randomId}"`,
            'X-Accel-Expires': '0',
            'X-Requested-With': 'XMLHttpRequest',
        });
        const { id } = req.params;
        console.log(`🔄 [${timestamp}] フロー詳細取得開始: ID=${id}`);
        // トラブルシューティングディレクトリから該当するJSONファイルを検索
        const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
        if (!fs.existsSync(troubleshootingDir)) {
            console.log(`❌ トラブルシューティングディレクトリが見つかりません`);
            return res
                .status(404)
                .json({ error: 'トラブルシューティングディレクトリが見つかりません' });
        }
        const files = fs.readdirSync(troubleshootingDir);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        let flowData = null;
        let fileName = null;
        // IDに一致するファイルを検索
        console.log(`🔍 検索対象ファイル数: ${jsonFiles.length}`);
        console.log(`🔍 検索対象ファイル一覧:`, jsonFiles);
        for (const file of jsonFiles) {
            try {
                const filePath = path.join(troubleshootingDir, file);
                console.log(`🔍 ファイル読み込み中: ${filePath}`);
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const data = JSON.parse(fileContent);
                console.log(`🔍 ファイル ${file} のID: ${data.id}, 検索ID: ${id}`);
                if (data.id === id || file.replace('.json', '') === id) {
                    flowData = data;
                    fileName = file;
                    console.log(`✅ マッチするファイル発見: ${file}`);
                    break;
                }
            }
            catch (error) {
                console.error(`❌ ファイル ${file} の読み込みエラー:`, error);
            }
        }
        if (!flowData) {
            console.log(`❌ フローが見つかりません: ${id}`);
            return res.status(404).json({
                success: false,
                error: 'フローが見つかりません',
                details: `ID: ${id} のフローデータが見つかりませんでした`,
                timestamp: new Date().toISOString()
            });
        }
        // 画像情報の詳細ログ
        if (flowData.steps) {
            flowData.steps.forEach((step, index) => {
                if (step.images && step.images.length > 0) {
                    console.log(`🖼️ フロー詳細取得 - ステップ[${index}]の画像情報:`, {
                        stepId: step.id,
                        stepTitle: step.title,
                        imagesCount: step.images.length,
                        images: step.images.map((img) => ({
                            fileName: img.fileName,
                            url: img.url?.substring(0, 100) + '...',
                            hasFile: !!img.file
                        }))
                    });
                }
            });
        }
        console.log(`✅ フロー詳細読み込み成功: ${id}`, {
            id: flowData.id,
            title: flowData.title,
            hasSteps: !!flowData.steps,
            stepsCount: flowData.steps?.length || 0,
            fileName: fileName,
            stepsWithImages: flowData.steps?.filter((step) => step.images && step.images.length > 0).length || 0,
            allStepsImages: flowData.steps?.map((step) => ({
                stepId: step.id,
                stepTitle: step.title,
                imagesCount: step.images?.length || 0,
                images: step.images?.map((img) => ({
                    fileName: img.fileName,
                    url: img.url?.substring(0, 100) + '...'
                })) || []
            })) || []
        });
        // 条件分岐ステップの確認
        const decisionSteps = flowData.steps?.filter((step) => step.type === 'decision') || [];
        const conditionSteps = flowData.steps?.filter((step) => step.type === 'condition') || [];
        console.log(`🔀 条件分岐ステップの確認:`, {
            totalSteps: flowData.steps?.length || 0,
            decisionSteps: decisionSteps.length,
            conditionSteps: conditionSteps.length,
            decisionStepsDetail: decisionSteps.map(step => ({
                id: step.id,
                title: step.title,
                optionsCount: step.options?.length || 0,
            })),
            conditionStepsDetail: conditionSteps.map(step => ({
                id: step.id,
                title: step.title,
                conditionsCount: step.conditions?.length || 0,
            })),
        });
        // フローデータを整形
        const data = {
            id: flowData.id,
            title: flowData.title,
            description: flowData.description,
            steps: flowData.steps || [],
            triggerKeywords: flowData.triggerKeywords || flowData.trigger || [],
            category: flowData.category,
            createdAt: flowData.createdAt,
            updatedAt: flowData.updatedAt,
        };
        res.json({
            success: true,
            data: data,
            metadata: {
                requestId: `${timestamp}-${randomId}`,
                processedAt: new Date().toISOString(),
            },
        });
        console.log(`✅ 完全データ解析成功:`, {
            id: data.id,
            title: data.title,
            stepsCount: data.steps?.length || 0,
            decisionStepsCount: decisionSteps.length,
            conditionStepsCount: conditionSteps.length,
            responseSize: JSON.stringify(data).length,
            stepsWithImages: data.steps?.filter((step) => step.images && step.images.length > 0).length || 0,
            allStepsImages: data.steps?.map((step) => ({
                stepId: step.id,
                stepTitle: step.title,
                imagesCount: step.images?.length || 0,
                images: step.images?.map((img) => ({
                    fileName: img.fileName,
                    url: img.url?.substring(0, 100) + '...'
                })) || []
            })) || []
        });
    }
    catch (error) {
        console.error('❌ フロー詳細取得エラー:', error);
        res.status(500).json({
            success: false,
            error: 'フロー詳細の取得に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
// フロー削除エンドポイント
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🗑️ フロー削除開始: ID=${id}`);
        // 複数のパス候補を試す（他のエンドポイントと同様の方法）
        const cwd = process.cwd();
        const projectRoot = path.resolve(__dirname, '..', '..');
        // トラブルシューティングディレクトリのパス候補
        const troubleshootingPaths = [
            // プロジェクトルートから
            path.join(projectRoot, 'knowledge-base', 'troubleshooting'),
            // カレントディレクトリから
            path.join(cwd, 'knowledge-base', 'troubleshooting'),
            // サーバーディレクトリから起動されている場合
            path.join(cwd, '..', 'knowledge-base', 'troubleshooting'),
            // __dirnameから
            path.join(__dirname, '..', '..', 'knowledge-base', 'troubleshooting'),
        ].map(p => path.resolve(p));
        console.log('🔍 troubleshooting パス候補:', troubleshootingPaths);
        console.log('📁 現在の作業ディレクトリ:', cwd);
        console.log('📁 プロジェクトルート:', projectRoot);
        console.log('📁 __dirname:', __dirname);
        let targetDir = null;
        let fileName = null;
        // 各パス候補を試す
        for (const testDir of troubleshootingPaths) {
            if (!fs.existsSync(testDir)) {
                console.log(`⚠️ ディレクトリが存在しません: ${testDir}`);
                continue;
            }
            console.log(`🔍 ディレクトリを検索中: ${testDir}`);
            const files = fs.readdirSync(testDir);
            const jsonFiles = files.filter(file => file.endsWith('.json'));
            console.log(`📄 見つかったJSONファイル数: ${jsonFiles.length}`);
            // IDに一致するファイルを検索
            for (const file of jsonFiles) {
                try {
                    const filePath = path.join(testDir, file);
                    const fileContent = fs.readFileSync(filePath, 'utf-8');
                    const data = JSON.parse(fileContent);
                    if (data.id === id || file.replace('.json', '') === id) {
                        targetDir = testDir;
                        fileName = file;
                        console.log('✅ 削除対象のファイルを発見:', {
                            dir: targetDir,
                            file: fileName,
                            id
                        });
                        break;
                    }
                }
                catch (error) {
                    console.error(`❌ ファイル ${file} の読み込みエラー:`, error);
                }
            }
            if (fileName) {
                break;
            }
        }
        if (!fileName || !targetDir) {
            console.error('❌ 削除対象のフローが見つかりません:', {
                id,
                searchedPaths: troubleshootingPaths,
            });
            return res.status(404).json({
                success: false,
                error: '削除対象のフローが見つかりません',
                id,
                searchedPaths: troubleshootingPaths.map(p => ({
                    path: p,
                    exists: fs.existsSync(p),
                })),
            });
        }
        // JSONファイルを削除
        const filePath = path.join(targetDir, fileName);
        fs.unlinkSync(filePath);
        console.log(`🗑️ フロー削除完了: ${id}, ファイル: ${fileName}, パス: ${filePath}`);
        res.json({
            success: true,
            message: 'フローが削除されました',
            deletedId: id,
            deletedFile: fileName,
        });
    }
    catch (error) {
        console.error('❌ フロー削除エラー:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            id: req.params.id,
        });
        res.status(500).json({
            success: false,
            error: 'フローの削除に失敗しました',
            details: error instanceof Error ? error.message : String(error),
        });
    }
});
// フロー直接取得エンドポイント（キャッシュ制御付き）
router.get('/get/:id', async (_req, res) => {
    try {
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2);
        // キャッシュ制御ヘッダーを設定
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            Pragma: 'no-cache',
            Expires: 'Thu, 01 Jan 1970 00:00:00 GMT',
            'Last-Modified': new Date().toUTCString(),
            ETag: `"${timestamp}-${randomId}"`,
            'X-Accel-Expires': '0',
            'X-Requested-With': 'XMLHttpRequest',
        });
        const { id } = req.params;
        console.log(`🔄 [${timestamp}] フロー直接取得: ID=${id}`);
        // トラブルシューティングディレクトリから該当するJSONファイルを検索
        const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
        if (!fs.existsSync(troubleshootingDir)) {
            console.log(`❌ トラブルシューティングディレクトリが見つかりません`);
            return res
                .status(404)
                .json({ error: 'トラブルシューティングディレクトリが見つかりません' });
        }
        const files = fs.readdirSync(troubleshootingDir);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        let flowData = null;
        // IDに一致するファイルを検索
        for (const file of jsonFiles) {
            try {
                const filePath = path.join(troubleshootingDir, file);
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const data = JSON.parse(fileContent);
                if (data.id === id || file.replace('.json', '') === id) {
                    flowData = data;
                    break;
                }
            }
            catch (error) {
                console.error(`❌ ファイル ${file} の読み込みエラー:`, error);
            }
        }
        if (!flowData) {
            console.log(`❌ フローが見つかりません: ${id}`);
            return res.status(404).json({ error: 'フローが見つかりません' });
        }
        console.log(`📊 フロー情報:`, {
            id: flowData.id,
            title: flowData.title,
            hasSteps: !!flowData.steps,
            stepsCount: flowData.steps?.length || 0,
            stepsWithImages: flowData.steps?.filter((step) => step.images && step.images.length > 0).length || 0,
            allStepsImages: flowData.steps?.map((step) => ({
                stepId: step.id,
                stepTitle: step.title,
                imagesCount: step.images?.length || 0,
                images: step.images?.map((img) => ({
                    fileName: img.fileName,
                    url: img.url?.substring(0, 100) + '...'
                })) || []
            })) || []
        });
        // フローデータを整形
        const data = {
            id: flowData.id,
            title: flowData.title,
            description: flowData.description,
            steps: flowData.steps || [],
            triggerKeywords: flowData.triggerKeywords || flowData.trigger || [],
            category: flowData.category,
            createdAt: flowData.createdAt,
            updatedAt: flowData.updatedAt,
        };
        // 条件分岐ステップの確認
        const decisionSteps = data.steps?.filter((step) => step.type === 'decision') || [];
        const conditionSteps = data.steps?.filter((step) => step.type === 'condition') || [];
        console.log(`🔀 条件分岐ステップの確認:`, {
            totalSteps: data.steps?.length || 0,
            decisionSteps: decisionSteps.length,
            conditionSteps: conditionSteps.length,
        });
        res.json({
            ...data,
            metadata: {
                requestId: `${timestamp}-${randomId}`,
                processedAt: new Date().toISOString(),
            },
        });
        console.log(`✅ 直接データ取得成功:`, {
            id: data.id,
            title: data.title,
            stepsCount: data.steps?.length || 0,
            decisionStepsCount: decisionSteps.length,
            conditionStepsCount: conditionSteps.length,
            stepsWithImages: data.steps?.filter((step) => step.images && step.images.length > 0).length || 0,
            allStepsImages: data.steps?.map((step) => ({
                stepId: step.id,
                stepTitle: step.title,
                imagesCount: step.images?.length || 0,
                images: step.images?.map((img) => ({
                    fileName: img.fileName,
                    url: img.url?.substring(0, 100) + '...'
                })) || []
            })) || []
        });
    }
    catch (error) {
        console.error('❌ フロー直接取得エラー:', error);
        res.status(500).json({ error: 'フロー直接取得に失敗しました' });
    }
});
// GPTレスポンスから手順を抽出するフォールバック関数
function extractStepsFromResponse(response, keyword) {
    const steps = [];
    const lines = response.split('\n').filter(line => line.trim());
    // 段落ごとに手順として抽出
    let currentStep = null;
    let stepCount = 0;
    for (const line of lines) {
        const trimmedLine = line.trim();
        // 新しい段落の開始を検出
        if (trimmedLine &&
            !trimmedLine.startsWith('**') &&
            !trimmedLine.startsWith('例:') &&
            !trimmedLine.startsWith('タイトル：') &&
            !trimmedLine.startsWith('手順：') &&
            !trimmedLine.match(/^手順\d+：/) &&
            !trimmedLine.match(/^\d+\./)) {
            if (currentStep) {
                steps.push(currentStep);
            }
            stepCount++;
            currentStep = {
                id: `step_${stepCount}`,
                title: trimmedLine.substring(0, 50) + (trimmedLine.length > 50 ? '...' : ''),
                description: trimmedLine,
                message: trimmedLine,
                type: 'step',
                imageUrl: '',
                options: [],
            };
        }
        else if (currentStep && trimmedLine) {
            // 既存の手順に詳細を追加
            currentStep.description += '\n' + trimmedLine;
            currentStep.message += '\n' + trimmedLine;
        }
    }
    if (currentStep) {
        steps.push(currentStep);
    }
    // 手順が抽出できない場合は、キーワードベースでデフォルト手順を生成
    if (steps.length === 0) {
        steps.push({
            id: 'step_1',
            title: `${keyword}の安全確認`,
            description: `${keyword}の状況を安全に確認してください。作業現場の安全を確保し、必要に応じて緊急停止を行ってください。`,
            message: `${keyword}の状況を安全に確認してください。作業現場の安全を確保し、必要に応じて緊急停止を行ってください。`,
            type: 'step',
            imageUrl: '',
            options: [],
        });
        steps.push({
            id: 'step_2',
            title: `${keyword}の詳細点検`,
            description: `${keyword}の故障状況を詳細に点検し、問題の程度と範囲を確認してください。`,
            message: `${keyword}の故障状況を詳細に点検し、問題の程度と範囲を確認してください。`,
            type: 'step',
            imageUrl: '',
            options: [],
        });
        steps.push({
            id: 'step_3',
            title: '専門技術者への連絡',
            description: '安全で確実な対応のため、専門技術者に連絡して指示を仰いでください。',
            message: '安全で確実な対応のため、専門技術者に連絡して指示を仰いでください。',
            type: 'step',
            imageUrl: '',
            options: [],
        });
    }
    return steps;
}
// フロー生成エンドポイント
router.post('/generate', async (_req, res) => {
    try {
        const { keyword } = generateFlowSchema.parse(req.body);
        console.log(`🔄 フロー生成開始: キーワード=${keyword}`);
        // OpenAIクライアントが利用可能かチェック
        if (!openai) {
            return res.status(503).json({
                success: false,
                error: 'OpenAI APIが利用できません。開発環境ではAPIキーを設定してください。',
                details: 'OpenAI client not available',
            });
        }
        // AI支援カスタマイズ設定を読み込む
        let aiAssistSettings = null;
        try {
            const AI_ASSIST_SETTINGS_FILE = path.join(__dirname, '../data/ai-assist-settings.json');
            if (fs.existsSync(AI_ASSIST_SETTINGS_FILE)) {
                const settingsData = fs.readFileSync(AI_ASSIST_SETTINGS_FILE, 'utf-8');
                aiAssistSettings = JSON.parse(settingsData);
                console.log('✅ AI支援設定をフロー生成に適用しました');
            }
            else {
                // デフォルト設定
                aiAssistSettings = {
                    conversationStyle: 'frank',
                    customInstructions: '',
                    questionFlow: {
                        step1: '具体的な症状を教えてください',
                        step2: 'いつ頃から発生していますか？',
                        step3: '作業環境や状況を教えてください',
                        step4: '他に気になることはありますか？',
                        step5: '緊急度を教えてください'
                    },
                };
            }
        }
        catch (error) {
            console.warn('AI支援設定の読み込みに失敗しました。デフォルト値を使用します:', error);
            aiAssistSettings = {
                conversationStyle: 'frank',
                customInstructions: '',
                questionFlow: {
                    step1: '具体的な症状を教えてください',
                    step2: 'いつ頃から発生していますか？',
                    step3: '作業環境や状況を教えてください',
                    step4: '他に気になることはありますか？',
                    step5: '緊急度を教えてください'
                },
            };
        }
        // 会話スタイルに応じたトーンの調整
        let toneInstruction = '';
        if (aiAssistSettings.conversationStyle === 'business') {
            toneInstruction = '丁寧で正式なビジネス用語を使用し、専門的な表現を心がけてください。';
        }
        else if (aiAssistSettings.conversationStyle === 'technical') {
            toneInstruction = '専門用語を中心に、技術的な説明を重視してください。';
        }
        else {
            toneInstruction = '親しみやすく、わかりやすい表現で説明してください。';
        }
        // カスタム指示を追加
        let customInstructionText = '';
        if (aiAssistSettings.customInstructions) {
            customInstructionText = `\n\n【追加の指示事項】\n${aiAssistSettings.customInstructions}`;
        }
        // 質問フロー設定を参考にした構造化ガイド
        let questionFlowGuide = '';
        if (aiAssistSettings.questionFlow) {
            const flowSteps = Object.values(aiAssistSettings.questionFlow)
                .filter(q => q && q.trim())
                .map((q, idx) => `- ${q}`)
                .join('\n');
            if (flowSteps) {
                questionFlowGuide = `\n\n【推奨される情報収集フロー】\n以下の順序で情報を収集することを推奨します：\n${flowSteps}`;
            }
        }
        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: `あなたは、**鉄道の保守用車（軌道モーターカー）**に関する専門的な知識を持つAIアシスタントです。

【厳守事項】

回答の範囲: 回答は、あなたが保持している保守用車（軌道モーターカー）の仕様、機能、および故障事例に関するナレッジデータのみに基づいて行い、このナレッジにない情報については回答できません。

情報源の限定: インターネット検索や外部情報源を参照することは一切禁止します。

ナレッジの不足時の対応: 質問に対する情報がナレッジデータ内に存在しない場合は、「申し訳ありませんが、その情報（または、その詳細）は、現在の私の保守用車に関するナレッジデータには含まれておりません。」と明確に回答し、それ以上の推測や一般的な情報の提供は行わないでください。

【回答の品質】

専門性: 鉄道保守・車両工学の専門用語を用いて、正確かつ技術的な観点から回答してください。

構造化: 仕様、機能、故障のデータは、箇条書きや表を用いて、利用者が理解しやすいよう構造化して提示してください。

具体的なデータとの紐づけ: 可能な限り、具体的な仕様名、機能名称、故障コード、または特定の構成部品と紐づけて回答してください。

【タスク例】

特定の車種（例：〇〇型軌道モーターカー）のエンジン出力や最大牽引力の仕様を問い合わせられた場合。

油圧駆動システムの機能について説明を求められた場合。

特定の故障コード（例：E-123）が発生した場合の考えられる原因や一次的な対処法を問い合わせられた場合。

上記を厳守し、専門家として、ユーザーの質問に正確に回答してください。

---

あなたは鉄道保守用車（軌道モーターカー）の故障診断と応急処置の専門家です。
以下の形式で具体的で実用的な応急処置フローを生成してください：

**必須フォーマット:**
1. タイトル：[具体的な問題名]
2. 手順：
   - 手順1：[具体的な作業内容と手順]
   - 手順2：[具体的な作業内容と手順]
   - 手順3：[具体的な作業内容と手順]
   （必要に応じて4-6手順まで）

**重要な要求事項:**
- 各手順は具体的な作業内容を含む（「確認する」「点検する」だけではなく、何をどう確認・点検するかを明記）
- 安全上の注意事項を含める
- 必要な工具や部品があれば明記
- 専門技術者への連絡が必要な場合は明記
- 技術者でも素人でも実行可能なレベルで説明
${toneInstruction}${questionFlowGuide}${customInstructionText}

**例:**
手順1：エンジンルームの安全確認（エンジン停止、ブレーキ掛け、作業現場の安全確保）
手順2：バッテリー端子の点検（端子の緩み、腐食、接続状態を目視確認）
手順3：バッテリー電圧測定（テスターで12.6V以上あるか確認）`,
                },
                {
                    role: 'user',
                    content: `以下の故障状況に対する応急処置フローを生成してください：${keyword}`,
                },
            ],
            temperature: 0.7,
            max_tokens: 2000,
        });
        const generatedContent = completion.choices[0]?.message?.content;
        if (!generatedContent) {
            throw new Error('フロー生成に失敗しました');
        }
        // 生成されたコンテンツをパースしてフロー構造に変換
        console.log('🔍 GPTレスポンスの解析開始:', {
            contentLength: generatedContent.length,
            lineCount: generatedContent.split('\n').length,
        });
        const lines = generatedContent.split('\n').filter(line => line.trim());
        const title = lines
            .find(line => line.includes('タイトル：'))
            ?.replace('タイトル：', '')
            .trim() || keyword;
        console.log('📝 抽出されたタイトル:', title);
        const steps = [];
        let currentStep = null;
        for (const line of lines) {
            // 手順の開始を検出（手順：、手順1：、1. などのパターン）
            if (line.includes('手順：') ||
                line.match(/^手順\d+：/) ||
                line.match(/^\d+\./)) {
                if (currentStep) {
                    steps.push(currentStep);
                    console.log('✅ 手順を追加:', currentStep.title);
                }
                // 手順番号とタイトルを抽出
                const stepMatch = line.match(/^(?:手順)?(?:(\d+)：)?\s*(.+)/);
                if (stepMatch) {
                    const stepNumber = stepMatch[1] || steps.length + 1;
                    const stepTitle = stepMatch[2].trim();
                    currentStep = {
                        id: `step_${stepNumber}`,
                        title: stepTitle,
                        description: stepTitle,
                        message: stepTitle,
                        type: 'step',
                        imageUrl: '',
                        options: [],
                    };
                    console.log('🆕 新しい手順を作成:', {
                        id: currentStep.id,
                        title: stepTitle,
                    });
                }
            }
            else if (currentStep && line.trim()) {
                // 手順の詳細説明を追加
                const trimmedLine = line.trim();
                if (trimmedLine &&
                    !trimmedLine.startsWith('**') &&
                    !trimmedLine.startsWith('例:')) {
                    currentStep.description += '\n' + trimmedLine;
                    currentStep.message += '\n' + trimmedLine;
                }
            }
        }
        if (currentStep) {
            steps.push(currentStep);
            console.log('✅ 最後の手順を追加:', currentStep.title);
        }
        console.log('📊 手順抽出結果:', {
            totalSteps: steps.length,
            stepTitles: steps.map(s => s.title),
        });
        // 手順が生成されていない場合のフォールバック処理
        if (steps.length === 0) {
            console.log('⚠️ 手順が生成されていないため、フォールバック処理を実行');
            // GPTの生のレスポンスから手順を抽出
            const fallbackSteps = extractStepsFromResponse(generatedContent, keyword);
            steps.push(...fallbackSteps);
            console.log('🔄 フォールバック手順生成完了:', {
                fallbackStepsCount: fallbackSteps.length,
                totalStepsAfterFallback: steps.length,
            });
        }
        const flowData = {
            id: `flow_${Date.now()}`,
            title: title,
            description: `自動生成された${keyword}の応急処置フロー`,
            triggerKeywords: [keyword],
            steps: steps,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        // knowledge-base/troubleshootingフォルダに保存
        try {
            const troubleshootingDir = path.join(process.cwd(), '..', 'knowledge-base', 'troubleshooting');
            const filePath = path.join(troubleshootingDir, `${flowData.id}.json`);
            // ディレクトリが存在しない場合は作成
            if (!fs.existsSync(troubleshootingDir)) {
                fs.mkdirSync(troubleshootingDir, { recursive: true });
            }
            // ファイルに保存
            fs.writeFileSync(filePath, JSON.stringify(flowData, null, 2), 'utf8');
            console.log('✅ 生成フロー保存成功:', {
                id: flowData.id,
                title: flowData.title,
                stepsCount: flowData.steps.length,
                filePath: filePath,
            });
        }
        catch (fileError) {
            console.error('❌ ファイル保存エラー:', fileError);
            return res.status(500).json({
                success: false,
                error: 'ファイルへの保存に失敗しました',
                details: fileError instanceof Error ? fileError.message : 'Unknown file error',
            });
        }
        // 生成されたフローの詳細情報を含むレスポンス
        const responseData = {
            success: true,
            data: flowData,
            message: 'フローが正常に生成されました',
            generatedContent: generatedContent, // GPTの生のレスポンス
            extractedSteps: steps.map(step => ({
                id: step.id,
                title: step.title,
                description: step.description,
            })),
            summary: {
                totalSteps: steps.length,
                hasSpecificActions: steps.some(step => step.description.includes('確認') ||
                    step.description.includes('点検') ||
                    step.description.includes('測定') ||
                    step.description.includes('調整')),
                safetyNotes: steps.some(step => step.description.includes('安全') ||
                    step.description.includes('危険') ||
                    step.description.includes('停止')),
            },
        };
        res.json(responseData);
    }
    catch (error) {
        console.error('❌ フロー生成エラー:', error);
        res.status(500).json({
            success: false,
            error: 'フローの生成に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// フロー生成のテスト用エンドポイント（開発環境のみ）
if (process.env.NODE_ENV === 'development') {
    router.post('/test-generate', async (_req, res) => {
        try {
            const { keyword, testPrompt } = req.body;
            console.log(`🧪 テストフロー生成: キーワード=${keyword}`);
            if (!openai) {
                return res.status(503).json({
                    success: false,
                    error: 'OpenAI APIが利用できません',
                });
            }
            // テスト用のカスタムプロンプト
            const customPrompt = testPrompt ||
                `以下の故障状況に対する応急処置フローを生成してください：${keyword}`;
            const completion = await openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: `あなたは建設機械の故障診断と応急処置の専門家です。
以下の形式で具体的で実用的な応急処置フローを生成してください：

**必須フォーマット:**
1. タイトル：[具体的な問題名]
2. 手順：
   - 手順1：[具体的な作業内容と手順]
   - 手順2：[具体的な作業内容と手順]
   - 手順3：[具体的な作業内容と手順]
   （必要に応じて4-6手順まで）

**重要な要求事項:**
- 各手順は具体的な作業内容を含む（「確認する」「点検する」だけではなく、何をどう確認・点検するかを明記）
- 安全上の注意事項を含める
- 必要な工具や部品があれば明記
- 専門技術者への連絡が必要な場合は明記
- 技術者でも素人でも実行可能なレベルで説明

**例:**
手順1：エンジンルームの安全確認（エンジン停止、ブレーキ掛け、作業現場の安全確保）
手順2：バッテリー端子の点検（端子の緩み、腐食、接続状態を目視確認）
手順3：バッテリー電圧測定（テスターで12.6V以上あるか確認）`,
                    },
                    {
                        role: 'user',
                        content: customPrompt,
                    },
                ],
                temperature: 0.7,
                max_tokens: 2000,
            });
            const generatedContent = completion.choices[0]?.message?.content;
            if (!generatedContent) {
                throw new Error('テストフロー生成に失敗しました');
            }
            res.json({
                success: true,
                data: {
                    keyword,
                    generatedContent,
                    testPrompt: customPrompt,
                    timestamp: new Date().toISOString(),
                },
                message: 'テストフロー生成が完了しました',
            });
        }
        catch (error) {
            console.error('❌ テストフロー生成エラー:', error);
            res.status(500).json({
                success: false,
                error: 'テストフローの生成に失敗しました',
                details: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
}
// 画像アップロードエンドポイント
router.post('/upload-image', image_uploader_js_1.upload.single('image'), async (req, res) => {
    try {
        console.log('🖼️ 画像アップロードリクエスト受信:', {
            hasFile: !!req.file,
            fileSize: req.file?.size,
            fileName: req.file?.originalname,
            mimetype: req.file?.mimetype,
            body: req.body
        });
        if (!req.file) {
            console.log('❌ 画像ファイルが提供されていません');
            return res.status(400).json({
                success: false,
                error: '画像ファイルが提供されていません',
            });
        }
        // ファイル形式チェック
        const allowedMimes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
        ];
        if (!allowedMimes.includes(req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                error: '対応していないファイル形式です',
            });
        }
        // ファイルサイズチェック（10MB）
        if (req.file.size > 10 * 1024 * 1024) {
            return res.status(400).json({
                success: false,
                error: 'ファイルサイズは10MB以下にしてください',
            });
        }
        // ファイル名を生成（タイムスタンプ + オリジナル名）
        const timestamp = Date.now();
        const originalName = req.file.originalname;
        const extension = originalName.split('.').pop();
        const fileName = `emergency-flow-step${timestamp}.${extension}`;
        // 保存先ディレクトリを作成
        const uploadDir = path.join(process.cwd(), '..', 'knowledge-base', 'images', 'emergency-flows');
        console.log('📁 アップロードディレクトリ:', uploadDir);
        if (!fs.existsSync(uploadDir)) {
            console.log('📁 ディレクトリを作成中:', uploadDir);
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        console.log('📁 ディレクトリ確認:', {
            exists: fs.existsSync(uploadDir),
            isDirectory: fs.statSync(uploadDir).isDirectory(),
            canWrite: true // 基本的に作成できていれば書き込み可能
        });
        // ファイルの重複チェック
        let fileHash;
        try {
            fileHash = calculateFileHash(req.file.buffer);
            console.log('🔍 ファイルハッシュ計算:', { fileHash });
        }
        catch (hashError) {
            console.error('❌ ハッシュ計算エラー:', hashError);
            throw new Error(`ファイルハッシュの計算に失敗しました: ${hashError instanceof Error ? hashError.message : 'Unknown error'}`);
        }
        let existingFile = null;
        try {
            existingFile = findExistingImageByHash(uploadDir, fileHash);
        }
        catch (searchError) {
            console.warn('⚠️ 重複ファイル検索エラー（続行）:', searchError);
        }
        let finalFileName = fileName;
        let isDuplicate = false;
        if (existingFile) {
            console.log('🔄 重複画像を検出、既存ファイルを使用:', existingFile);
            finalFileName = existingFile;
            isDuplicate = true;
        }
        else {
            // 新しいファイルを保存
            const filePath = path.join(uploadDir, fileName);
            console.log('💾 ファイル保存中:', {
                filePath,
                fileSize: req.file.buffer.length,
                fileName,
                uploadDirExists: fs.existsSync(uploadDir)
            });
            try {
                // ディレクトリが存在しない場合は作成
                if (!fs.existsSync(uploadDir)) {
                    console.log('📁 ディレクトリを作成中:', uploadDir);
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
                fs.writeFileSync(filePath, req.file.buffer);
                console.log('✅ ファイル保存成功:', filePath);
            }
            catch (writeError) {
                console.error('❌ ファイル保存エラー:', writeError);
                throw new Error(`ファイルの保存に失敗しました: ${writeError instanceof Error ? writeError.message : 'Unknown error'}`);
            }
        }
        // APIエンドポイントのURLを生成
        const imageUrl = `/api/emergency-flow/image/${finalFileName}`;
        console.log('✅ 画像アップロード成功:', {
            fileName: finalFileName,
            imageUrl,
            fileSize: req.file.size,
            isDuplicate,
            details: {
                originalFileName: fileName,
                finalFileName: finalFileName,
                finalImageUrl: imageUrl,
            },
        });
        res.json({
            success: true,
            imageUrl,
            fileName: finalFileName,
            isDuplicate,
        });
    }
    catch (error) {
        console.error('❌ 画像アップロードエラー:', error);
        res.status(500).json({
            success: false,
            error: '応急処置フローの処理中にエラーが発生しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// URI暗号化関数
/*
function encryptUri(fileName: string): string {
  console.log('🔐 暗号化開始:', { fileName });
  const secret = process.env.ENCRYPTION_SECRET || 'default-secret-key';
  console.log('🔐 暗号化キー:', { secretLength: secret.length, secretPrefix: secret.substring(0, 10) + '...' });
  
  const cipher = crypto.createCipher('aes-256-cbc', secret);
  let encrypted = cipher.update(fileName, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  console.log('🔐 暗号化完了:', {
    originalFileName: fileName,
    encryptedFileName: encrypted,
    encryptedLength: encrypted.length
  });
  
  return encrypted;
}
*/
// URI復号化関数
/*
function decryptUri(encryptedFileName: string): string {
  const secret = process.env.ENCRYPTION_SECRET || 'default-secret-key';
  const decipher = crypto.createDecipher('aes-256-cbc', secret);
  let decrypted = decipher.update(encryptedFileName, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
*/
// 画像配信エンドポイント（knowledge-baseから直接配信）
router.get('/image/:fileName', async (req, res) => {
    try {
        const { fileName } = req.params;
        // CORSヘッダーを設定（本番環境対応）
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.header('Cross-Origin-Resource-Policy', 'cross-origin');
        // 大文字小文字を区別しないファイル検索関数
        const findFileCaseInsensitive = (dir, targetFileName) => {
            if (!fs.existsSync(dir)) {
                return null;
            }
            const files = fs.readdirSync(dir);
            const lowerTarget = targetFileName.toLowerCase();
            // 完全一致を優先
            if (files.includes(targetFileName)) {
                return path.join(dir, targetFileName);
            }
            // 大文字小文字を区別しない検索
            const foundFile = files.find(file => file.toLowerCase() === lowerTarget);
            if (foundFile) {
                console.log('✅ 大文字小文字を区別しない検索でファイルを発見:', {
                    requested: targetFileName,
                    found: foundFile
                });
                return path.join(dir, foundFile);
            }
            return null;
        };
        // 複数のパス候補を試す（他のエンドポイントと同様の方法）
        const cwd = process.cwd();
        const projectRoot = path.resolve(__dirname, '..', '..');
        // emergency-flowsディレクトリのパス候補
        const emergencyFlowsPaths = [
            // プロジェクトルートから
            path.join(projectRoot, 'knowledge-base', 'images', 'emergency-flows'),
            // カレントディレクトリから
            path.join(cwd, 'knowledge-base', 'images', 'emergency-flows'),
            // サーバーディレクトリから起動されている場合
            path.join(cwd, '..', 'knowledge-base', 'images', 'emergency-flows'),
            // __dirnameから
            path.join(__dirname, '..', '..', 'knowledge-base', 'images', 'emergency-flows'),
        ].map(p => path.resolve(p));
        console.log('🔍 emergency-flows パス候補:', emergencyFlowsPaths);
        console.log('📁 現在の作業ディレクトリ:', cwd);
        console.log('📁 プロジェクトルート:', projectRoot);
        console.log('📁 __dirname:', __dirname);
        let uploadDir = null;
        let filePath = null;
        // emergency-flowsディレクトリを検索
        for (const testDir of emergencyFlowsPaths) {
            if (!fs.existsSync(testDir)) {
                console.log(`⚠️ ディレクトリが存在しません: ${testDir}`);
                continue;
            }
            const foundPath = findFileCaseInsensitive(testDir, fileName);
            if (foundPath) {
                uploadDir = testDir;
                filePath = foundPath;
                console.log('✅ emergency-flowsディレクトリとファイルを発見:', {
                    dir: uploadDir,
                    file: filePath,
                    fileName
                });
                break;
            }
        }
        // emergency-flows にファイルがない場合は chat-exports を確認
        if (!filePath) {
            const chatExportsPaths = [
                path.join(projectRoot, 'knowledge-base', 'images', 'chat-exports'),
                path.join(cwd, 'knowledge-base', 'images', 'chat-exports'),
                path.join(cwd, '..', 'knowledge-base', 'images', 'chat-exports'),
                path.join(__dirname, '..', '..', 'knowledge-base', 'images', 'chat-exports'),
            ].map(p => path.resolve(p));
            console.log('🔄 emergency-flows にファイルが見つからないため、chat-exports を確認:', {
                fileName,
                chatExportsPaths,
            });
            for (const testDir of chatExportsPaths) {
                if (!fs.existsSync(testDir)) {
                    continue;
                }
                const foundPath = findFileCaseInsensitive(testDir, fileName);
                if (foundPath) {
                    uploadDir = testDir;
                    filePath = foundPath;
                    console.log('✅ chat-exportsディレクトリとファイルを発見:', {
                        dir: uploadDir,
                        file: filePath,
                        fileName
                    });
                    break;
                }
            }
        }
        // デバッグログ強化
        console.log('🖼️ 画像リクエスト:', {
            fileName,
            uploadDir,
            filePath,
            exists: !!filePath,
            filesInDir: fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : [],
        });
        if (!filePath) {
            // デバッグ情報をより詳細に収集
            const debugInfo = {
                error: 'ファイルが存在しません',
                fileName,
                searchedPaths: {
                    emergencyFlows: emergencyFlowsPaths.map(p => ({
                        path: p,
                        exists: fs.existsSync(p),
                        files: fs.existsSync(p) ? fs.readdirSync(p).slice(0, 10) : [],
                    })),
                    chatExports: chatExportsPaths.map(p => ({
                        path: p,
                        exists: fs.existsSync(p),
                        files: fs.existsSync(p) ? fs.readdirSync(p).slice(0, 10) : [],
                    })),
                },
                currentWorkingDirectory: cwd,
                projectRoot,
                __dirname,
            };
            console.error('❌ 画像ファイルが見つかりません:', debugInfo);
            return res.status(404).json(debugInfo);
        }
        // ファイルのMIMEタイプを判定
        const ext = path.extname(fileName).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        // ファイルを読み込んでレスポンス
        const fileBuffer = fs.readFileSync(filePath);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1年間キャッシュ
        res.send(fileBuffer);
        console.log('✅ 画像配信成功:', {
            requestedFileName: fileName,
            actualFilePath: filePath,
            contentType,
            fileSize: fileBuffer.length,
            sourceDir: uploadDir.includes('emergency-flows')
                ? 'emergency-flows'
                : 'chat-exports',
        });
    }
    catch (error) {
        console.error('❌ 画像配信エラー:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            fileName: req.params.fileName,
        });
        res.status(500).json({
            success: false,
            error: '画像の配信に失敗しました',
        });
    }
});
// ファイルのハッシュを計算する関数
function calculateFileHash(buffer) {
    return crypto.createHash('md5').update(buffer).digest('hex');
}
// 既存の画像ファイルから同じハッシュのファイルを探す関数
function findExistingImageByHash(uploadDir, fileHash) {
    try {
        // ディレクトリが存在しない場合はnullを返す
        if (!fs.existsSync(uploadDir)) {
            console.log(`📁 ディレクトリが存在しません: ${uploadDir}`);
            return null;
        }
        const files = fs.readdirSync(uploadDir);
        console.log(`🔍 ディレクトリ内のファイル数: ${files.length}`, { uploadDir, files });
        for (const file of files) {
            if (file.endsWith('.jpg') ||
                file.endsWith('.jpeg') ||
                file.endsWith('.png') ||
                file.endsWith('.gif') ||
                file.endsWith('.webp')) {
                try {
                    const filePath = path.join(uploadDir, file);
                    const fileBuffer = fs.readFileSync(filePath);
                    const existingHash = calculateFileHash(fileBuffer);
                    if (existingHash === fileHash) {
                        console.log(`🔄 同じハッシュの画像を発見: ${file}`);
                        return file;
                    }
                }
                catch (fileError) {
                    console.warn(`ファイル読み込みエラー (${file}):`, fileError);
                    continue;
                }
            }
        }
    }
    catch (error) {
        console.error('既存ファイル検索エラー:', error);
    }
    return null;
}
// フロー取得エンドポイント（/:id）
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🔄 フロー取得開始: ID=${id}`);
        const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
        console.log(`📁 トラブルシューティングディレクトリ: ${troubleshootingDir}`);
        if (!fs.existsSync(troubleshootingDir)) {
            console.log(`❌ トラブルシューティングディレクトリが見つかりません: ${troubleshootingDir}`);
            return res.status(404).json({ error: 'トラブルシューティングディレクトリが見つかりません' });
        }
        const files = fs.readdirSync(troubleshootingDir);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        console.log(`🔍 利用可能なJSONファイル:`, jsonFiles);
        let flowData = null;
        let fileName = null;
        // IDに一致するファイルを検索
        for (const file of jsonFiles) {
            try {
                const filePath = path.join(troubleshootingDir, file);
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const data = JSON.parse(fileContent);
                console.log(`🔍 ファイル ${file} のID: ${data.id}, 検索ID: ${id}`);
                if (data.id === id || file.replace('.json', '') === id) {
                    flowData = data;
                    fileName = file;
                    console.log(`✅ マッチするファイル発見: ${file}`);
                    break;
                }
            }
            catch (error) {
                console.error(`❌ ファイル ${file} の読み込みエラー:`, error);
            }
        }
        if (!flowData) {
            console.log(`❌ フローが見つかりません: ${id}`);
            return res.status(404).json({
                error: 'フローファイルが見つかりません',
                details: `ID: ${id} のフローデータが見つかりませんでした`,
                availableFiles: jsonFiles
            });
        }
        console.log(`✅ フロー取得成功:`, {
            id: flowData.id,
            title: flowData.title,
            stepsCount: flowData.steps?.length || 0,
            stepsWithImages: flowData.steps?.filter((step) => step.images && step.images.length > 0).length || 0,
            allStepsImages: flowData.steps?.map((step) => ({
                stepId: step.id,
                stepTitle: step.title,
                imagesCount: step.images?.length || 0,
                images: step.images?.map((img) => ({
                    fileName: img.fileName,
                    url: img.url?.substring(0, 100) + '...'
                })) || []
            })) || []
        });
        res.json(flowData);
    }
    catch (error) {
        console.error('❌ フロー取得エラー:', error);
        res.status(500).json({ error: 'フローの取得に失敗しました' });
    }
});
// エラーハンドリングミドルウェア
router.use((err, _req, res, _next) => {
    console.error('応急処置フローエラー:', err);
    // Content-Typeを明示的に設定
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({
        success: false,
        error: '応急処置フローの処理中にエラーが発生しました',
        details: err.message || 'Unknown error',
        timestamp: new Date().toISOString(),
    });
});
// 404ハンドリング
router.use('*', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(404).json({
        success: false,
        error: '応急処置フローのエンドポイントが見つかりません',
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
    });
});
exports.default = router;
