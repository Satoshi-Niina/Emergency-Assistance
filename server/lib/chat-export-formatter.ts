import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from 'url';

// ESM用__dirname定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// OpenAIクライアントの初期化（環境変数が存在する場合のみ）
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} else {
    console.warn('[DEV] OpenAI client not initialized - API key not available');
}

// 車両モデルのサンプルデータ
const vehicleModels = [
    { id: 'mt-100', name: 'MT-100型保線車', keywords: ['MT-100', 'MT100', 'MT 100'] },
    { id: 'mr-400', name: 'MR-400シリーズ', keywords: ['MR-400', 'MR400', 'MR 400'] },
    { id: 'tc-250', name: 'TC-250作業車', keywords: ['TC-250', 'TC250', 'TC 250'] },
    { id: 'ss-750', name: 'SS-750重機', keywords: ['SS-750', 'SS750', 'SS 750'] },
];

// 症状のサンプルデータ
const symptoms = [
    { id: 'engine-stop', description: 'エンジン停止', keywords: ['エンジン停止', 'エンジンが止まる', 'エンジン切れ'] },
    { id: 'engine-noise', description: '異音', keywords: ['異音', '変な音', '音がする'] },
    { id: 'brake-failure', description: 'ブレーキ不良', keywords: ['ブレーキ不良', 'ブレーキが効かない', 'ブレーキ故障'] },
    { id: 'hydraulic-leak', description: '油圧漏れ', keywords: ['油圧漏れ', 'オイル漏れ', '漏油'] },
    { id: 'electrical-failure', description: '電気系統故障', keywords: ['電気系統', '電装品', '電気不良'] },
];

// コンポーネントのサンプルデータ
const components = [
    { id: 'engine', name: 'エンジン', keywords: ['エンジン', 'engine', 'モーター'] },
    { id: 'brake', name: 'ブレーキ', keywords: ['ブレーキ', 'brake', '制動装置'] },
    { id: 'hydraulic', name: '油圧系統', keywords: ['油圧', 'hydraulic', 'オイル', '油'] },
    { id: 'electrical', name: '電気系統', keywords: ['電気', 'electrical', '電装', '配線'] },
    { id: 'transmission', name: '変速機', keywords: ['変速機', 'transmission', 'ギア', 'トランスミッション'] },
];

/**
 * テキストからコンポーネント関連のキーワードを抽出する
 */
export function extractComponentKeywords(text: string): string[] {
    const foundComponents: string[] = [];
    for (const component of components) {
        for (const keyword of component.keywords) {
            if (text.includes(keyword) && !foundComponents.includes(component.name)) {
                foundComponents.push(component.name);
                break;
            }
        }
    }
    return foundComponents;
}

/**
 * テキストから症状関連のキーワードを抽出する
 */
export function extractSymptomKeywords(text: string): string[] {
    const foundSymptoms: string[] = [];
    for (const symptom of symptoms) {
        for (const keyword of symptom.keywords) {
            if (text.includes(keyword) && !foundSymptoms.includes(symptom.description)) {
                foundSymptoms.push(symptom.description);
                break;
            }
        }
    }
    return foundSymptoms;
}

/**
 * テキストから可能性のある機種モデルを判別する
 */
export function detectPossibleModels(text: string): string[] {
    const foundModels: string[] = [];
    for (const model of vehicleModels) {
        for (const keyword of model.keywords) {
            if (text.includes(keyword) && !foundModels.includes(model.name)) {
                foundModels.push(model.name);
                break;
            }
        }
    }
    return foundModels;
}

/**
 * チャット履歴を外部システム用にフォーマットする
 */
export async function formatChatHistoryForExternalSystem(chat: any, messages: any, messageMedia: any, lastExport: any) {
    const allText = messages.map((m: any) => m.content).join(' ');
    const extractedComponents = extractComponentKeywords(allText);
    const extractedSymptoms = extractSymptomKeywords(allText);
    const possibleModels = detectPossibleModels(allText);

    let primaryProblem = '';
    let problemDescription = '';

    if (openai) {
        try {
            const userMessages = messages.filter((m: any) => !m.isAiResponse).map((m: any) => m.content).join('\n');
            const prompt = `
以下は鉄道保守用車両のトラブルシューティングに関する会話です。
この会話から、主要な問題と問題の詳細な説明を日本語で抽出してください。
抽出結果は以下のJSONフォーマットで返してください：
{
  "primary_problem": "簡潔な問題のタイトル（15-20文字程度）",
  "problem_description": "問題の詳細説明（50-100文字程度）"
}

会話：
${userMessages}
`;

            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            });

            const content = response.choices[0].message.content || '{"primary_problem":"不明な問題","problem_description":"詳細情報なし"}';
            const result = JSON.parse(content);
            primaryProblem = result.primary_problem;
            problemDescription = result.problem_description;
        } catch (error) {
            console.error('OpenAI APIでの分析中にエラーが発生しました:', error);
            // エラーが発生した場合は単純な抽出結果を使用
            primaryProblem = extractedComponents.length > 0 ?
                `${extractedComponents[0]}に関する問題` : '不明な問題';
            problemDescription = extractedSymptoms.length > 0 ?
                `${extractedSymptoms.join('と')}の症状が報告されています。` : '詳細な症状は報告されていません。';
        }
    } else {
        // OpenAIクライアントが利用できない場合は単純な抽出結果を使用
        primaryProblem = extractedComponents.length > 0 ?
            `${extractedComponents[0]}に関する問題` : '不明な問題';
        problemDescription = extractedSymptoms.length > 0 ?
            `${extractedSymptoms.join('と')}の症状が報告されています。` : '詳細な症状は報告されていません。';
    }

    let environmentContext = '';
    if (openai) {
        try {
            const contextPrompt = `
以下は鉄道保守用車両のトラブルシューティングに関する会話です。
この会話から、車両の現在の状況や環境に関する情報を50-80文字程度で簡潔にまとめてください。
例えば「車両は○○の状態で△△の症状が発生している」といった形式です。

会話：
${messages.slice(0, 10).map((m: any) => m.content).join('\n')}
`;

            const contextResponse = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "user", content: contextPrompt }],
            });

            environmentContext = contextResponse.choices[0].message.content?.trim() || '会話内容から環境情報を抽出できませんでした。';
        } catch (error) {
            console.error('環境情報の生成中にエラーが発生しました:', error);
            environmentContext = '会話から環境情報を抽出できませんでした。';
        }
    } else {
        environmentContext = 'OpenAI APIが利用できないため、環境情報を抽出できませんでした。';
    }

    const conversationHistory = messages.map((message: any) => {
        // コンテンツ内の画像パスを検出
        let updatedContent = message.content;
        
        // 画像パスを正規表現で抽出 - パターンを拡張して相対パスと絶対パスの両方に対応
        const imagePathRegex = /(\/|\.\/)?(knowledge-base|public)\/images\/[^)\s"'\n]+\.(svg|png|jpg|jpeg)/g;
        const imagePaths = message.content.match(imagePathRegex) || [];
        
        console.log(`メッセージID ${message.id}: ${imagePaths.length}個の画像パスを検出`);
        
        // Base64エンコードした画像データを保持するマップ
        const base64Images: { [key: string]: string } = {};
        
        // 各画像パスに対してBase64エンコードを実行
        for (const imagePath of imagePaths) {
            try {
                // パスを正規化
                const normalizedPath = imagePath.startsWith('./') ? imagePath.slice(2) : imagePath;
                const fullPath = path.join(__dirname, '../../', normalizedPath);
                
                if (fs.existsSync(fullPath)) {
                    const imageBuffer = fs.readFileSync(fullPath);
                    const base64Data = imageBuffer.toString('base64');
                    const fileExtension = path.extname(imagePath).slice(1);
                    const mimeType = fileExtension === 'svg' ? 'image/svg+xml' : `image/${fileExtension}`;
                    base64Images[imagePath] = `data:${mimeType};base64,${base64Data}`;
                    console.log(`画像をBase64エンコード: ${imagePath}`);
                } else {
                    console.warn(`画像ファイルが見つかりません: ${fullPath}`);
                }
            } catch (error) {
                console.error(`画像のBase64エンコード中にエラー: ${imagePath}`, error);
            }
        }
        
        // メディア情報を追加
        const messageMediaItems = messageMedia.filter((media: any) => media.messageId === message.id);
        const mediaInfo = messageMediaItems.map((media: any) => ({
            id: media.id,
            type: media.type,
            filename: media.filename,
            path: media.path
        }));
        
        return {
            id: message.id,
            content: updatedContent,
            isAiResponse: message.isAiResponse,
            timestamp: message.createdAt,
            media: mediaInfo,
            base64Images: Object.keys(base64Images).length > 0 ? base64Images : undefined
        };
    });

    // 最終的なエクスポートデータを構築
    const exportData = {
        chat_id: chat.id,
        user_id: chat.userId,
        export_timestamp: new Date().toISOString(),
        last_export_timestamp: lastExport ? lastExport.timestamp.toISOString() : null,
        primary_problem: primaryProblem,
        problem_description: problemDescription,
        extracted_components: extractedComponents,
        extracted_symptoms: extractedSymptoms,
        possible_models: possibleModels,
        environment_context: environmentContext,
        conversation_history: conversationHistory,
        metadata: {
            total_messages: messages.length,
            user_messages: messages.filter((m: any) => !m.isAiResponse).length,
            ai_messages: messages.filter((m: any) => m.isAiResponse).length,
            total_media: messageMedia.length,
            export_format_version: "1.0"
        }
    };

    return exportData;
} 