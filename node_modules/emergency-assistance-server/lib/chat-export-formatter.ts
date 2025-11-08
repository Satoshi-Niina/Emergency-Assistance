import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
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
  console.warn(
    '[DEV] To enable AI-powered title and description generation, set OPENAI_API_KEY environment variable'
  );
  console.warn(
    '[DEV] The system will use fallback keyword-based generation instead'
  );
}

// 車両モデルのサンプルデータ
const vehicleModels = [
  {
    id: 'mt-100',
    name: 'MT-100型保線車',
    keywords: ['MT-100', 'MT100', 'MT 100'],
  },
  {
    id: 'mr-400',
    name: 'MR-400シリーズ',
    keywords: ['MR-400', 'MR400', 'MR 400'],
  },
  {
    id: 'tc-250',
    name: 'TC-250作業車',
    keywords: ['TC-250', 'TC250', 'TC 250'],
  },
  { id: 'ss-750', name: 'SS-750重機', keywords: ['SS-750', 'SS750', 'SS 750'] },
];

// 症状のサンプルデータ
const symptoms = [
  {
    id: 'engine-stop',
    description: 'エンジン停止',
    keywords: [
      'エンジン停止',
      'エンジンが止まる',
      'エンジン切れ',
      'エンジンが起動しない',
      'エンジンが始動しない',
    ],
  },
  {
    id: 'engine-noise',
    description: '異音',
    keywords: [
      '異音',
      '変な音',
      '音がする',
      'ノッキング',
      'バルブ音',
      'ピストン音',
    ],
  },
  {
    id: 'engine-overheat',
    description: 'オーバーヒート',
    keywords: ['オーバーヒート', '水温上昇', 'エンジンが熱い', '冷却水不足'],
  },
  {
    id: 'brake-failure',
    description: 'ブレーキ不良',
    keywords: [
      'ブレーキ不良',
      'ブレーキが効かない',
      'ブレーキ故障',
      'ブレーキが解放しない',
      'ブレーキが利かない',
    ],
  },
  {
    id: 'brake-noise',
    description: 'ブレーキ異音',
    keywords: ['ブレーキ異音', 'ブレーキから音', 'ブレーキ鳴き'],
  },
  {
    id: 'hydraulic-leak',
    description: '油圧漏れ',
    keywords: [
      '油圧漏れ',
      'オイル漏れ',
      '漏油',
      '油が漏れる',
      'オイルが漏れる',
    ],
  },
  {
    id: 'hydraulic-pressure',
    description: '油圧不足',
    keywords: ['油圧不足', '油圧が低い', '油圧警告', '油圧低下'],
  },
  {
    id: 'electrical-failure',
    description: '電気系統故障',
    keywords: ['電気系統', '電装品', '電気不良', '電気故障', '配線不良'],
  },
  {
    id: 'electrical-short',
    description: '電気ショート',
    keywords: ['電気ショート', 'ショート', '配線ショート', '電気火花'],
  },
  {
    id: 'transmission-failure',
    description: '変速機故障',
    keywords: [
      '変速機故障',
      'ギアが入らない',
      '変速不良',
      'トランスミッション故障',
    ],
  },
  {
    id: 'transmission-noise',
    description: '変速機異音',
    keywords: ['変速機異音', 'ギア音', '変速音'],
  },
  {
    id: 'air-pressure',
    description: '空気圧不足',
    keywords: [
      '空気圧不足',
      'エアーがたまらない',
      '空気圧警告',
      'エアー圧低下',
    ],
  },
  {
    id: 'battery-dead',
    description: 'バッテリー上がり',
    keywords: [
      'バッテリー上がり',
      'バッテリー切れ',
      'バッテリー不足',
      '電圧不足',
    ],
  },
  {
    id: 'warning-light',
    description: '警告灯点灯',
    keywords: ['警告灯', '警告ランプ', 'アラーム', '警告音'],
  },
  {
    id: 'operation-failure',
    description: '操作不良',
    keywords: ['操作不良', '操作できない', '動作しない', '反応しない'],
  },
  {
    id: 'vibration',
    description: '振動',
    keywords: ['振動', '揺れ', 'がたつき', '振動する'],
  },
  {
    id: 'smoke',
    description: '煙',
    keywords: ['煙', '白煙', '黒煙', '煙が出る'],
  },
  {
    id: 'fuel-problem',
    description: '燃料問題',
    keywords: ['燃料不足', '燃料切れ', 'ガソリン不足', '軽油不足'],
  },
  {
    id: 'cooling-problem',
    description: '冷却問題',
    keywords: ['冷却水不足', '冷却水漏れ', 'ラジエーター', '冷却不良'],
  },
];

// コンポーネントのサンプルデータ
const components = [
  {
    id: 'engine',
    name: 'エンジン',
    keywords: ['エンジン', 'engine', 'モーター', '原動機'],
  },
  {
    id: 'brake',
    name: 'ブレーキ',
    keywords: ['ブレーキ', 'brake', '制動装置', '制動器'],
  },
  {
    id: 'hydraulic',
    name: '油圧系統',
    keywords: ['油圧', 'hydraulic', 'オイル', '油', '油圧系統', '油圧装置'],
  },
  {
    id: 'electrical',
    name: '電気系統',
    keywords: ['電気', 'electrical', '電装', '配線', '電気系統', '電装品'],
  },
  {
    id: 'transmission',
    name: '変速機',
    keywords: [
      '変速機',
      'transmission',
      'ギア',
      'トランスミッション',
      '変速装置',
    ],
  },
  {
    id: 'air-system',
    name: '空気系統',
    keywords: ['空気', 'エアー', 'air', '空気系統', 'エアー系統'],
  },
  {
    id: 'battery',
    name: 'バッテリー',
    keywords: ['バッテリー', 'battery', '蓄電池', '電源'],
  },
  {
    id: 'cooling',
    name: '冷却系統',
    keywords: ['冷却', 'cooling', 'ラジエーター', '冷却水', '冷却系統'],
  },
  {
    id: 'fuel',
    name: '燃料系統',
    keywords: ['燃料', 'fuel', 'ガソリン', '軽油', '燃料系統'],
  },
  {
    id: 'pump',
    name: 'ポンプ',
    keywords: ['ポンプ', 'pump', '油圧ポンプ', '燃料ポンプ'],
  },
  {
    id: 'motor',
    name: 'モーター',
    keywords: ['モーター', 'motor', '電動機', '駆動モーター'],
  },
  {
    id: 'sensor',
    name: 'センサー',
    keywords: ['センサー', 'sensor', '検出器', '感知器'],
  },
  {
    id: 'valve',
    name: 'バルブ',
    keywords: ['バルブ', 'valve', '弁', '制御弁'],
  },
  {
    id: 'filter',
    name: 'フィルター',
    keywords: [
      'フィルター',
      'filter',
      '濾過器',
      'エアフィルター',
      'オイルフィルター',
    ],
  },
  {
    id: 'hose',
    name: 'ホース',
    keywords: ['ホース', 'hose', '配管', '油圧ホース', 'エアーホース'],
  },
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
      if (
        text.includes(keyword) &&
        !foundSymptoms.includes(symptom.description)
      ) {
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
 * 日本語タイトルを生成する（発生事象により近い具体的なタイトル）
 */
async function generateJapaneseTitle(
  userMessages: string,
  allMessages?: string
): Promise<string> {
  // 画像データ（Base64）が含まれている場合は除外してテキストのみを抽出
  const textOnlyMessages = userMessages
    .split('\n')
    .filter(line => !line.trim().startsWith('data:image/'))
    .join('\n')
    .trim();

  // テキストが残っていない場合は、画像が先に送信されたと判断
  // この場合は、全メッセージから発生事象を推測する
  if (!textOnlyMessages) {
    // 全メッセージ（AI応答も含む）から発生事象を推測
    if (allMessages) {
      const allTextOnly = allMessages
        .split('\n')
        .filter(line => !line.trim().startsWith('data:image/'))
        .join('\n')
        .trim();

      if (allTextOnly) {
        // 全メッセージからキーワードを抽出してタイトルを生成
        const extractedComponents = extractComponentKeywords(allTextOnly);
        const extractedSymptoms = extractSymptomKeywords(allTextOnly);

        if (extractedComponents.length > 0 && extractedSymptoms.length > 0) {
          const component = extractedComponents[0];
          const symptom = extractedSymptoms[0];

          // より具体的なタイトルを生成
          if (symptom.includes('故障') || symptom.includes('不良')) {
            return `${component}故障`;
          } else if (symptom.includes('停止') || symptom.includes('止ま')) {
            return `${component}停止`;
          } else if (symptom.includes('異音') || symptom.includes('音')) {
            return `${component}異音`;
          } else if (symptom.includes('漏れ') || symptom.includes('漏油')) {
            return `${component}漏れ`;
          } else if (symptom.includes('警告') || symptom.includes('アラーム')) {
            return `${component}警告`;
          } else if (
            symptom.includes('動作不良') ||
            symptom.includes('動作しない')
          ) {
            return `${component}動作不良`;
          } else if (
            symptom.includes('オーバーヒート') ||
            symptom.includes('熱い')
          ) {
            return `${component}オーバーヒート`;
          } else {
            return `${component}${symptom}`;
          }
        } else if (extractedComponents.length > 0) {
          // コンポーネントのみ抽出できた場合、一般的な故障タイトルを生成
          const component = extractedComponents[0];
          return `${component}故障`;
        } else if (extractedSymptoms.length > 0) {
          // 症状のみ抽出できた場合
          const symptom = extractedSymptoms[0];
          return `${symptom}発生`;
        }
      }
    }

    // 推測できない場合は、時間帯に応じた一般的なタイトルを生成
    const timestamp = new Date();
    const hour = timestamp.getHours();

    if (hour >= 6 && hour < 18) {
      return '作業中の故障報告';
    } else {
      return '緊急故障報告';
    }
  }

  // キーワード抽出機能を使用して発生事象の内容を分析
  const extractedComponents = extractComponentKeywords(textOnlyMessages);
  const extractedSymptoms = extractSymptomKeywords(textOnlyMessages);

  // コンポーネントと症状の両方が抽出できた場合
  if (extractedComponents.length > 0 && extractedSymptoms.length > 0) {
    const component = extractedComponents[0];
    const symptom = extractedSymptoms[0];

    // より具体的で発生事象に近いタイトルを生成
    let title = '';

    // 症状に応じて適切な表現を選択（より具体的に）
    if (symptom.includes('故障') || symptom.includes('不良')) {
      title = `${component}故障`;
    } else if (
      symptom.includes('停止') ||
      symptom.includes('止ま') ||
      symptom.includes('起動しない') ||
      symptom.includes('始動しない')
    ) {
      title = `${component}停止`;
    } else if (symptom.includes('急に停止') || symptom.includes('突然停止')) {
      title = `${component}急に停止`;
    } else if (
      symptom.includes('異音') ||
      symptom.includes('音') ||
      symptom.includes('ノッキング') ||
      symptom.includes('バルブ音')
    ) {
      title = `${component}異音`;
    } else if (
      symptom.includes('漏れ') ||
      symptom.includes('漏油') ||
      symptom.includes('油が漏れる')
    ) {
      title = `${component}漏れ`;
    } else if (
      symptom.includes('警告') ||
      symptom.includes('アラーム') ||
      symptom.includes('警告灯')
    ) {
      title = `${component}警告`;
    } else if (
      symptom.includes('動作不良') ||
      symptom.includes('動作しない') ||
      symptom.includes('操作不良') ||
      symptom.includes('反応しない')
    ) {
      title = `${component}動作不良`;
    } else if (
      symptom.includes('オーバーヒート') ||
      symptom.includes('水温上昇') ||
      symptom.includes('熱い')
    ) {
      title = `${component}オーバーヒート`;
    } else if (symptom.includes('不足') || symptom.includes('低下')) {
      title = `${component}不足`;
    } else if (
      symptom.includes('振動') ||
      symptom.includes('揺れ') ||
      symptom.includes('がたつき')
    ) {
      title = `${component}振動`;
    } else if (
      symptom.includes('煙') ||
      symptom.includes('白煙') ||
      symptom.includes('黒煙')
    ) {
      title = `${component}煙`;
    } else if (symptom.includes('解放しない') || symptom.includes('利かない')) {
      title = `${component}解放しない`;
    } else if (symptom.includes('たまらない') || symptom.includes('圧力不足')) {
      title = `${component}圧力不足`;
    } else {
      // より具体的な表現を試行
      const userWords = textOnlyMessages.toLowerCase();
      if (userWords.includes('急に') || userWords.includes('突然')) {
        title = `${component}急に${symptom}`;
      } else if (userWords.includes('完全に') || userWords.includes('全く')) {
        title = `${component}完全${symptom}`;
      } else {
        title = `${component}${symptom}`;
      }
    }

    // 長さ制限
    if (title.length > 35) {
      title = title.substring(0, 35);
    }

    return title;
  }

  // コンポーネントのみ抽出できた場合
  if (extractedComponents.length > 0) {
    const component = extractedComponents[0];
    // ユーザーメッセージから具体的な症状を探す
    const userWords = textOnlyMessages.toLowerCase();
    if (userWords.includes('停止') || userWords.includes('止ま')) {
      return `${component}停止`;
    } else if (userWords.includes('故障') || userWords.includes('不良')) {
      return `${component}故障`;
    } else if (userWords.includes('異音') || userWords.includes('音')) {
      return `${component}異音`;
    } else {
      return `${component}トラブル`;
    }
  }

  // 症状のみ抽出できた場合
  if (extractedSymptoms.length > 0) {
    const symptom = extractedSymptoms[0];
    return `${symptom}発生`;
  }

  // キーワード抽出ができない場合は、ユーザーメッセージの最初の行を使用
  const firstMessage = textOnlyMessages.split('\n')[0].trim();
  if (firstMessage && firstMessage.length > 0) {
    // 長すぎる場合は短縮
    if (firstMessage.length > 35) {
      return firstMessage.substring(0, 35);
    }
    return firstMessage;
  }

  // 最終フォールバック
  return '車両トラブル';
}

/**
 * チャット履歴を履歴管理UI用にフォーマットする
 */
export async function formatChatHistoryForHistoryUI(
  chat: any,
  messages: any,
  messageMedia: any,
  machineInfo: any
) {
  // ユーザーメッセージからテキストのみを抽出（画像を除外）
  const userMessages = messages.filter((m: any) => !m.isAiResponse);
  const userTextMessages = userMessages
    .map((m: any) => m.content)
    .filter(content => !content.trim().startsWith('data:image/'))
    .join('\n');

  const allText = messages.map((m: any) => m.content).join(' ');

  // 日本語タイトルを生成（画像のみの場合は全メッセージから推測）
  const title = await generateJapaneseTitle(userTextMessages, allText);

  // 問題の詳細説明を生成（GPTを使わずにユーザーメッセージをそのまま使用）
  const extractedComponents = extractComponentKeywords(allText);
  const extractedSymptoms = extractSymptomKeywords(allText);
  const possibleModels = detectPossibleModels(allText);

  // ユーザーメッセージをそのまま使用（画像を除外）
  let problemDescription = userTextMessages;

  // 長すぎる場合は短縮
  if (problemDescription.length > 200) {
    problemDescription = problemDescription.substring(0, 200) + '...';
  }

  // 空の場合はフォールバック
  if (!problemDescription || problemDescription.trim().length === 0) {
    problemDescription =
      extractedSymptoms.length > 0
        ? `${extractedSymptoms.join('と')}の症状が報告されています。`
        : '詳細な症状は報告されていません。';
  }

  // 会話履歴を簡潔に整理
  const conversationHistory = messages.map((message: any) => {
    // メディア情報を取得
    let mediaInfo = [];
    if (messageMedia && typeof messageMedia === 'object') {
      const messageMediaItems = messageMedia[message.id] || [];
      mediaInfo = messageMediaItems.map((media: any) => ({
        id: media.id,
        type: media.type,
        filename: media.filename,
        path: media.path,
      }));
    }

    return {
      id: message.id,
      content: message.content,
      isAiResponse: message.isAiResponse,
      timestamp: message.createdAt,
      media: mediaInfo,
    };
  });

  // 履歴管理UI用のデータ構造
  const historyData = {
    chat_id: chat.id,
    user_id: chat.userId,
    title: title,
    problem_description: problemDescription,
    machine_type: machineInfo?.machineTypeName || '',
    machine_number: machineInfo?.machineNumber || '',
    extracted_components: extractedComponents,
    extracted_symptoms: extractedSymptoms,
    possible_models: possibleModels,
    conversation_history: conversationHistory,
    export_timestamp: new Date().toISOString(),
    metadata: {
      total_messages: messages.length,
      user_messages: messages.filter((m: any) => !m.isAiResponse).length,
      ai_messages: messages.filter((m: any) => m.isAiResponse).length,
      total_media:
        typeof messageMedia === 'object'
          ? Object.values(messageMedia).flat().length
          : Array.isArray(messageMedia)
            ? messageMedia.length
            : 0,
      export_format_version: '2.0',
    },
  };

  return historyData;
}

/**
 * チャット履歴を外部システム用にフォーマットする（従来の形式）
 */
export async function formatChatHistoryForExternalSystem(
  chat: any,
  messages: any,
  messageMedia: any,
  lastExport: any
) {
  const allText = messages.map((m: any) => m.content).join(' ');
  const extractedComponents = extractComponentKeywords(allText);
  const extractedSymptoms = extractSymptomKeywords(allText);
  const possibleModels = detectPossibleModels(allText);

  let primaryProblem = '';
  let problemDescription = '';

  if (openai) {
    try {
      const userMessages = messages
        .filter((m: any) => !m.isAiResponse)
        .map((m: any) => m.content)
        .join('\n');
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
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const content =
        response.choices[0].message.content ||
        '{"primary_problem":"不明な問題","problem_description":"詳細情報なし"}';
      const result = JSON.parse(content);
      primaryProblem = result.primary_problem;
      problemDescription = result.problem_description;
    } catch (error) {
      console.error('問題抽出エラー:', error);
      // エラーが発生した場合はフォールバック処理に進む
    }
  }

  // OpenAIが利用できない場合やエラーの場合のフォールバック
  if (!primaryProblem || !problemDescription) {
    const extractedComponents = extractComponentKeywords(allText);
    const extractedSymptoms = extractSymptomKeywords(allText);

    primaryProblem =
      extractedComponents.length > 0 && extractedSymptoms.length > 0
        ? `${extractedComponents[0]}の${extractedSymptoms[0]}`
        : '車両トラブル';

    problemDescription =
      extractedSymptoms.length > 0
        ? `${extractedSymptoms.join('と')}の症状が報告されています。`
        : '詳細な症状は報告されていません。';
  }

  let environmentContext = '';
  if (openai) {
    try {
      const contextPrompt = `
以下は鉄道保守用車両のトラブルシューティングに関する会話です。
この会話から、車両の現在の状況や環境に関する情報を50-80文字程度で簡潔にまとめてください。
例えば「車両は○○の状態で△△の症状が発生している」といった形式です。

会話：
${messages
  .slice(0, 10)
  .map((m: any) => m.content)
  .join('\n')}
`;

      const contextResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: contextPrompt }],
      });

      environmentContext =
        contextResponse.choices[0].message.content?.trim() ||
        '会話内容から環境情報を抽出できませんでした。';
    } catch (error) {
      console.error('環境情報の生成中にエラーが発生しました:', error);
      environmentContext = '会話から環境情報を抽出できませんでした。';
    }
  } else {
    environmentContext =
      'OpenAI APIが利用できないため、環境情報を抽出できませんでした。';
  }

  const conversationHistory = messages.map((message: any) => {
    // コンテンツをそのまま使用（base64は使用しない）
    const updatedContent = message.content;

    // メディア情報を追加
    let mediaInfo = [];
    if (messageMedia && typeof messageMedia === 'object') {
      // messageMediaがオブジェクトの場合（メッセージIDをキーとする）
      const messageMediaItems = messageMedia[message.id] || [];
      mediaInfo = messageMediaItems.map((media: any) => ({
        id: media.id,
        type: media.type,
        filename: media.filename,
        path: media.path,
      }));
    } else if (Array.isArray(messageMedia)) {
      // messageMediaが配列の場合（従来の形式）
      const messageMediaItems = messageMedia.filter(
        (media: any) => media.messageId === message.id
      );
      mediaInfo = messageMediaItems.map((media: any) => ({
        id: media.id,
        type: media.type,
        filename: media.filename,
        path: media.path,
      }));
    }

    return {
      id: message.id,
      content: updatedContent,
      isAiResponse: message.isAiResponse,
      timestamp: message.createdAt,
      media: mediaInfo,
    };
  });

  // 最終的なエクスポートデータを構築
  const exportData = {
    chat_id: chat.id,
    user_id: chat.userId,
    export_timestamp: new Date().toISOString(),
    last_export_timestamp: lastExport
      ? lastExport.timestamp.toISOString()
      : null,
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
      total_media:
        typeof messageMedia === 'object'
          ? Object.values(messageMedia).flat().length
          : Array.isArray(messageMedia)
            ? messageMedia.length
            : 0,
      export_format_version: '1.0',
    },
  };

  return exportData;
}
