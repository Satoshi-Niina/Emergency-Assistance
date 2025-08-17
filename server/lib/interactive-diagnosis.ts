/**
 * インタラクティブ故障診断システム
 * ユーザーの回答に基づいて動的に次の質問や処置を決定する
 */

export interface DiagnosisState {
  phase: 'initial' | 'investigation' | 'diagnosis' | 'action' | 'verification' | 'completed';
  collectedInfo: {
    symptoms: string[];
    vehicleType: string | null;
    safetyStatus: string | null;
    timing: string | null;
    tools: string | null;
    environment: string | null;
    urgency: 'low' | 'medium' | 'high' | 'critical';
  };
  suspectedCauses: string[];
  currentFocus: string | null;
  nextActions: string[];
  confidence: number;
}

export interface InteractiveResponse {
  message: string;
  nextQuestion?: string;
  suggestedActions?: string[];
  options?: string[];
  priority: 'safety' | 'diagnosis' | 'action' | 'info';
  requiresInput: boolean;
  phase: DiagnosisState['phase'];
}

/**
 * ユーザーの回答から故障診断状態を更新
 */
export function updateDiagnosisState(
  currentState: DiagnosisState,
  userResponse: string
): DiagnosisState {
  const response = userResponse.toLowerCase();
  const newState = { ...currentState };

  // 症状の分析と追加
  const detectedSymptoms = extractSymptoms(response);
  newState.collectedInfo.symptoms = [
    ...new Set([...newState.collectedInfo.symptoms, ...detectedSymptoms])
  ];

  // 車両タイプの特定
  if (!newState.collectedInfo.vehicleType) {
    newState.collectedInfo.vehicleType = detectVehicleType(response);
  }

  // 安全状況の確認
  if (!newState.collectedInfo.safetyStatus) {
    newState.collectedInfo.safetyStatus = detectSafetyStatus(response);
  }

  // 緊急度の更新
  newState.collectedInfo.urgency = assessUrgency(newState.collectedInfo);

  // 疑われる原因の更新
  newState.suspectedCauses = generateSuspectedCauses(newState.collectedInfo);

  // フェーズの更新
  newState.phase = determineNextPhase(newState);

  // 信頼度の計算
  newState.confidence = calculateDiagnosisConfidence(newState);

  return newState;
}

/**
 * 現在の診断状態に基づいて次のインタラクティブな応答を生成
 */
export function generateInteractiveResponse(
  state: DiagnosisState,
  userResponse?: string
): InteractiveResponse {
  
  // 安全確認が最優先
  if (state.collectedInfo.urgency === 'critical' && !state.collectedInfo.safetyStatus) {
    return {
      message: "🚨 **緊急安全確認**\n\n現在の状況は緊急性が高いと判断されます。",
      nextQuestion: "作業現場は安全ですか？周囲に人はいませんか？機械は完全に停止していますか？",
      priority: 'safety',
      requiresInput: true,
      phase: 'investigation'
    };
  }

  switch (state.phase) {
    case 'initial':
      return generateInitialResponse(state);
    
    case 'investigation':
      return generateInvestigationResponse(state, userResponse);
    
    case 'diagnosis':
      return generateDiagnosisResponse(state);
    
    case 'action':
      return generateActionResponse(state);
    
    case 'verification':
      return generateVerificationResponse(state);
    
    default:
      return generateCompletedResponse(state);
  }
}

function generateInitialResponse(state: DiagnosisState): InteractiveResponse {
  return {
    message: `🔧 **故障診断サポート開始**

現在の状況を教えてください。どのような症状が発生していますか？

例：
• エンジンが始動しない
• 異音がする
• 作業装置が動かない
• 警告灯が点灯している`,
    nextQuestion: "具体的にどのような症状が発生していますか？",
    priority: 'info',
    requiresInput: true,
    phase: 'investigation'
  };
}

function generateInvestigationResponse(state: DiagnosisState, userResponse?: string): InteractiveResponse {
  const { symptoms, vehicleType, safetyStatus, urgency } = state.collectedInfo;
  
  // 安全確認が未完了で緊急度が高い場合
  if (!safetyStatus && urgency !== 'low') {
    return {
      message: "⚠️ **安全確認**\n\n症状を確認しました。安全な作業環境の確保が重要です。",
      nextQuestion: "現在、作業現場は安全な状態ですか？機械は停止していますか？",
      priority: 'safety',
      requiresInput: true,
      phase: 'investigation'
    };
  }

  // 車両タイプが不明な場合
  if (!vehicleType && symptoms.length > 0) {
    return {
      message: `📋 **車両情報確認**\n\n${symptoms.join('、')}の症状を確認しました。\n\n車両の詳細情報が必要です。`,
      nextQuestion: "使用している保守用車の種類を教えてください（例：軌道モータカー、マルチプルタイタンパー、バラストレギュレーター等）",
      priority: 'info',
      requiresInput: true,
      phase: 'investigation'
    };
  }

  // 症状に基づく具体的な調査
  if (symptoms.length > 0 && vehicleType) {
    const specificQuestions = generateSpecificQuestions(symptoms, vehicleType);
    if (specificQuestions.length > 0) {
      return {
        message: `🔍 **詳細診断**\n\n${vehicleType}の${symptoms.join('、')}について詳しく調査します。`,
        nextQuestion: specificQuestions[0],
        priority: 'diagnosis',
        requiresInput: true,
        phase: 'diagnosis'
      };
    }
  }

  // デフォルトの調査継続
  return {
    message: "🔎 **追加情報収集**\n\n現在の情報から原因を特定するため、もう少し詳しく教えてください。",
    nextQuestion: "症状が発生したタイミングや、直前に行っていた作業について教えてください。",
    priority: 'info',
    requiresInput: true,
    phase: 'investigation'
  };
}

function generateDiagnosisResponse(state: DiagnosisState): InteractiveResponse {
  const { suspectedCauses, confidence } = state;
  
  if (confidence >= 0.7 && suspectedCauses.length > 0) {
    const primaryCause = suspectedCauses[0];
    return {
      message: `💡 **診断結果**\n\n収集した情報から、**${primaryCause}**の可能性が高いと判断されます。\n\n信頼度: ${Math.round(confidence * 100)}%`,
      nextQuestion: "この診断に基づいて応急処置を開始しますか？",
      suggestedActions: generateInitialActions(primaryCause),
      options: ["はい、処置を開始", "もう少し詳しく調査", "専門家に連絡"],
      priority: 'action',
      requiresInput: true,
      phase: 'action'
    };
  } else {
    return {
      message: `🤔 **診断継続**\n\n複数の原因が考えられます：\n${suspectedCauses.map((cause, i) => `${i + 1}. ${cause}`).join('\n')}`,
      nextQuestion: "どの項目について詳しく確認しますか？",
      options: suspectedCauses.slice(0, 3),
      priority: 'diagnosis',
      requiresInput: true,
      phase: 'investigation'
    };
  }
}

function generateActionResponse(state: DiagnosisState): InteractiveResponse {
  const { suspectedCauses, collectedInfo } = state;
  const primaryCause = suspectedCauses[0];
  
  const stepByStepActions = generateStepByStepActions(primaryCause, collectedInfo.vehicleType);
  
  return {
    message: `🛠️ **応急処置手順**\n\n**対象**: ${primaryCause}\n\n**ステップ1**: ${stepByStepActions[0]}`,
    nextQuestion: "ステップ1は完了しましたか？結果を教えてください。",
    suggestedActions: stepByStepActions,
    priority: 'action',
    requiresInput: true,
    phase: 'verification'
  };
}

function generateVerificationResponse(state: DiagnosisState): InteractiveResponse {
  return {
    message: `✅ **処置確認**\n\n実行した処置の結果を確認します。`,
    nextQuestion: "症状は改善されましたか？まだ問題が残っていますか？",
    options: ["完全に解決", "部分的に改善", "変化なし", "悪化した"],
    priority: 'action',
    requiresInput: true,
    phase: 'completed'
  };
}

function generateCompletedResponse(state: DiagnosisState): InteractiveResponse {
  return {
    message: `🎉 **診断・処置完了**\n\n今回の対応内容をまとめました。\n\n何か他にご質問があれば、いつでもお声がけください。`,
    priority: 'info',
    requiresInput: false,
    phase: 'completed'
  };
}

// ユーティリティ関数群
function extractSymptoms(response: string): string[] {
  const symptomPatterns = [
    { pattern: /始動.*しない|エンジン.*かからない/, symptom: 'エンジン始動不良' },
    { pattern: /異音|音.*おかしい|変な音/, symptom: '異音' },
    { pattern: /動かない|作動.*しない|操作.*効かない/, symptom: '動作不良' },
    { pattern: /煙|発煙|臭い/, symptom: '異常発熱・煙' },
    { pattern: /警告.*点灯|ランプ.*光/, symptom: '警告表示' },
    { pattern: /振動|ガタガタ|ブレ/, symptom: '異常振動' },
    { pattern: /漏れ|オイル.*出/, symptom: '油圧・油脂漏れ' }
  ];
  
  return symptomPatterns
    .filter(({ pattern }) => pattern.test(response))
    .map(({ symptom }) => symptom);
}

function detectVehicleType(response: string): string | null {
  const vehiclePatterns = [
    { pattern: /タイタンパー|突固|整正/, type: 'マルチプルタイタンパー' },
    { pattern: /モータカー|軌道車/, type: '軌道モータカー' },
    { pattern: /バラスト|配石/, type: 'バラストレギュレーター' },
    { pattern: /削正|レール削/, type: 'レール削正車' },
    { pattern: /溶接/, type: 'レール溶接車' }
  ];
  
  const match = vehiclePatterns.find(({ pattern }) => pattern.test(response));
  return match ? match.type : null;
}

function detectSafetyStatus(response: string): string | null {
  if (/安全|大丈夫|停止/.test(response)) return 'safe';
  if (/危険|不安|動いている/.test(response)) return 'unsafe';
  return null;
}

function assessUrgency(info: DiagnosisState['collectedInfo']): DiagnosisState['collectedInfo']['urgency'] {
  const criticalSymptoms = ['異常発熱・煙', '異常振動'];
  const urgentSymptoms = ['エンジン始動不良', '動作不良'];
  
  if (info.symptoms.some(s => criticalSymptoms.includes(s))) return 'critical';
  if (info.symptoms.some(s => urgentSymptoms.includes(s))) return 'high';
  if (info.symptoms.length > 1) return 'medium';
  return 'low';
}

function generateSuspectedCauses(info: DiagnosisState['collectedInfo']): string[] {
  const causes = [];
  
  if (info.symptoms.includes('エンジン始動不良')) {
    causes.push('バッテリー不良', '燃料系統トラブル', 'スターター故障');
  }
  if (info.symptoms.includes('異音')) {
    causes.push('ベアリング摩耗', 'エンジン内部異常', 'ベルト不良');
  }
  if (info.symptoms.includes('動作不良')) {
    causes.push('油圧系統異常', '電気系統故障', '機械的故障');
  }
  
  return causes.slice(0, 3);
}

function determineNextPhase(state: DiagnosisState): DiagnosisState['phase'] {
  const { symptoms, vehicleType, safetyStatus } = state.collectedInfo;
  
  if (!safetyStatus && state.collectedInfo.urgency !== 'low') return 'investigation';
  if (symptoms.length === 0) return 'initial';
  if (!vehicleType) return 'investigation';
  if (state.suspectedCauses.length === 0) return 'investigation';
  if (state.confidence < 0.6) return 'investigation';
  if (state.confidence >= 0.6) return 'diagnosis';
  
  return 'action';
}

function calculateDiagnosisConfidence(state: DiagnosisState): number {
  let confidence = 0.2;
  
  if (state.collectedInfo.symptoms.length > 0) confidence += 0.3;
  if (state.collectedInfo.vehicleType) confidence += 0.2;
  if (state.collectedInfo.safetyStatus) confidence += 0.1;
  if (state.suspectedCauses.length > 0) confidence += 0.2;
  
  return Math.min(confidence, 1.0);
}

function generateSpecificQuestions(symptoms: string[], vehicleType: string): string[] {
  const questions = [];
  
  if (symptoms.includes('エンジン始動不良')) {
    questions.push("スターターは回りますか？バッテリーランプは点灯していますか？");
  }
  if (symptoms.includes('異音') && vehicleType === 'マルチプルタイタンパー') {
    questions.push("異音は突固作業中ですか？それとも走行中ですか？");
  }
  if (symptoms.includes('動作不良')) {
    questions.push("油圧計の圧力は正常ですか？作動油の量は十分ですか？");
  }
  
  return questions;
}

function generateInitialActions(cause: string): string[] {
  const actionMap: Record<string, string[]> = {
    'バッテリー不良': ['バッテリー電圧確認', '端子清掃', '充電またはジャンプスタート'],
    '燃料系統トラブル': ['燃料残量確認', '燃料フィルター点検', '水分除去'],
    '油圧系統異常': ['油圧計確認', '作動油量点検', '漏れ箇所確認'],
  };
  
  return actionMap[cause] || ['基本点検', '専門家連絡'];
}

function generateStepByStepActions(cause: string, vehicleType: string | null): string[] {
  // 車両タイプと原因に応じた詳細なステップを生成
  const baseActions = generateInitialActions(cause);
  return baseActions.map((action, index) => 
    `${action}（${vehicleType || '保守用車'}専用手順に従って実施）`
  );
}
