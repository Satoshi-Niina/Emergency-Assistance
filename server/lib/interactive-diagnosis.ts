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
  /** 短期的に使用した可変フレーズの履歴（"group:index" 形式） */
  phraseHistory?: string[];
  /** 直近に提示した質問（重複抑止用） */
  lastQuestion?: string | null;
}

export interface InteractiveResponse {
  /** ユーザーにまず表示する端的なメッセージ（1～3行） */
  message: string;
  /** 次に投げる単一の質問 */
  nextQuestion?: string;
  /** 追加の詳しい説明（ユーザーが「詳細」等を要求した時に統合表示可能） */
  details?: string;
  /** 業務ログ用のフォーマル版メッセージ */
  formalMessage?: string;
  /** 業務ログ用のフォーマル版質問 */
  formalNextQuestion?: string;
  /** 業務ログ用のフォーマル版詳細 */
  formalDetails?: string;
  /** 推奨アクション一覧 */
  suggestedActions?: string[];
  /** 即時選択肢 */
  options?: string[];
  /** 優先度タグ */
  priority: 'safety' | 'diagnosis' | 'action' | 'info';
  /** 追加入力が必要か */
  requiresInput: boolean;
  /** 現在フェーズ */
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

  // ステップ進行: verificationで「成功/変化なし/悪化」等の入力が来たらnextActionsにpush
  if (currentState.phase === 'action' && userResponse) {
    // 直前のactionで案内したステップを履歴に追加
    const lastStepIdx = currentState.nextActions.length;
    const actions = generateStepByStepActions(
      currentState.suspectedCauses[0],
      currentState.collectedInfo.vehicleType
    );
    if (actions[lastStepIdx]) {
      newState.nextActions = [...currentState.nextActions, actions[lastStepIdx]];
    }
  }
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
  const detailRequested = !!userResponse && /詳細|もっと詳しく|くわしく|詳しく教/.test(userResponse);

  // 安全確認が最優先
  if (state.collectedInfo.urgency === 'critical' && !state.collectedInfo.safetyStatus) {
    return decorateWithDetail({
      message: '🚨 緊急安全確認: まず安全を確保してください。',
      nextQuestion: '現場は安全ですか？ 人の立入りなし / 機械は完全停止 / 火気・漏れなし を確認してください。',
      priority: 'safety',
      requiresInput: true,
      phase: 'investigation'
    }, state, detailRequested);
  }

  let base: InteractiveResponse;
  switch (state.phase) {
    case 'initial':
      base = generateInitialResponse(state); break;
    case 'investigation':
      base = generateInvestigationResponse(state, userResponse); break;
    case 'diagnosis':
      base = generateDiagnosisResponse(state); break;
    case 'action':
      base = generateActionResponse(state); break;
    case 'verification':
      base = generateVerificationResponse(state); break;
    default:
      base = generateCompletedResponse(state); break;
  }
  // 重複質問検知 & 再表現
  if (base.nextQuestion && state.lastQuestion && normalizeQ(base.nextQuestion) === normalizeQ(state.lastQuestion)) {
    base.nextQuestion = rephraseQuestion(base.nextQuestion);
    base.message += '\n(前回と同趣旨の質問を再表現しています)';
  }
  const withDetail = decorateWithDetail(base, state, detailRequested);
  return attachFormalVariants(withDetail);
}

/** 端的メッセージに「詳細」要求時の深掘りを付加 */
function decorateWithDetail(base: InteractiveResponse, state: DiagnosisState, detailRequested: boolean): InteractiveResponse {
  // 既に details が生成されている場合はそのまま
  if (detailRequested) {
    const detailParts: string[] = [];
    if (state.collectedInfo.symptoms.length) {
      detailParts.push(`症状: ${state.collectedInfo.symptoms.join(' / ')}`);
    }
    if (state.suspectedCauses.length) {
      detailParts.push(`想定原因TOP3:\n${state.suspectedCauses.map((c,i)=>`${i+1}. ${c}`).join('\n')}`);
    }
    detailParts.push(`緊急度: ${state.collectedInfo.urgency}  信頼度: ${Math.round(state.confidence*100)}%`);
    if (base.suggestedActions && base.suggestedActions.length) {
      detailParts.push(`推奨アクション候補:\n- ${base.suggestedActions.slice(0,5).join('\n- ')}`);
    }
    const details = detailParts.join('\n\n');
    return {
      ...base,
      details,
      message: base.message + '\n\n' + details,
      // 「詳細」要求後は再び詳細を繰り返さないため nextQuestion はそのまま
      options: enrichOptions(base.options, true)
    };
  }

  return {
    ...base,
    // 詳細未要求時: 端的メッセージにヒントを付加（改行1つまでで抑制）
    message: base.message.trim(),
    options: enrichOptions(base.options, false)
  };
}

function enrichOptions(options: string[] | undefined, detailRequested: boolean): string[] | undefined {
  const base = options ? [...options] : [];
  if (!detailRequested && !base.includes('詳細')) base.push('詳細');
  if (!base.includes('別の可能性')) base.push('別の可能性');
  if (!base.includes('安全再確認')) base.push('安全再確認');
  return base;
}

// ---------- フォーマル変換 & 重複処理ユーティリティ ----------
function attachFormalVariants(resp: InteractiveResponse): InteractiveResponse {
  const formalMessage = toFormal(resp.message);
  const formalNext = resp.nextQuestion ? toFormal(resp.nextQuestion) : undefined;
  const formalDetails = resp.details ? toFormal(resp.details) : undefined;
  // 画面表示用: カジュアル + 業務ログ併記
  const combinedMessage = resp.message.includes('[業務ログ]')
    ? resp.message
    : `${resp.message}\n[業務ログ] ${formalMessage}`;
  return {
    ...resp,
    message: combinedMessage,
    formalMessage,
    formalNextQuestion: formalNext,
    formalDetails
  };
}

function toFormal(text: string): string {
  if (!text) return text;
  let t = text;
  // 絵文字除去（使用中のものを対象）
  t = t.replace(/[🚨🔧⚠️💡🛠️✅🎉]/g, '');
  // カジュアル語尾の簡易正規化
  t = t.replace(/(しましょう|していきますね|していきます|進めていきますね|進めてくださいね|進めてください)/g, 'します');
  t = t.replace(/(見ていきましょう|確認しましょう|一緒に見ていきましょう)/g, '確認します');
  t = t.replace(/(教えてくださいね|教えてくださいね。|教えてください。?|教えてください)/g, '提示してください');
  t = t.replace(/(くださいね|ください。)/g, 'ください');
  t = t.replace(/ね。/g, '。');
  t = t.replace(/ね/g, '');
  t = t.replace(/！/g, '。');
  // 余分な空白と句点整形
  t = t.replace(/\s+/g, ' ').trim();
  t = t.replace(/。。+/g, '。');
  return t.trim();
}

function normalizeQ(q: string): string {
  return q.replace(/[？?\s]/g,'').toLowerCase();
}

function rephraseQuestion(original: string): string {
  // シンプルな再表現: 末尾に具体化依頼を追加
  if (/具体|詳/.test(original)) return original + '（前回答との差分を明確にしてください）';
  return original.replace(/？?$/,'') + 'を、より具体的な名詞または数値で示してください。';
}

function generateInitialResponse(state: DiagnosisState): InteractiveResponse {
  const openers = [
    '🔧 まず状況の共有から始めましょうね。',
    '🔧 わかりました、症状を一つずつ一緒に見ていきましょう。',
    '🔧 診断スタートです。落ち着いて順番に進めていきます。'
  ];
  const ask = [
    '最初に「一番気になること」を短く教えてくださいね。',
    '今いちばん困っていることを一言で教えてくださいね。',
    'まず最初に気になる点を端的に教えてくださいね。'
  ];
  return {
    message: `${v(state,'initial.opener',openers)} ${v(state,'initial.ask',ask)}`.trim(),
    details: '例: 始動不可 / 異音 / 作業装置不作動 / 警告灯点灯 など。複数は重要度順に。',
    nextQuestion: v(state,'initial.next',[
      '最初に気になることは何でしょうか？',
      '一番最初に挙げる現象は何でしょうか？',
      'まず一つ気になる点を教えてくださいね。'
    ]),
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
      message: v(state,'safety.msg',[
        '⚠️ まずは安全が最優先なので確認させてくださいね。',
        '⚠️ 念のため安全状態を最初にチェックしましょう。',
        '⚠️ 作業を続ける前に安全が確保できているか見ておきましょう。'
      ]),
      nextQuestion: v(state,'safety.q',[
        '現場は完全停止・人員退避済みでしょうか？',
        '機械停止・人員離隔・漏れなしはクリアしていますか？',
        '停止 / 人離隔 / 漏れ無し の安全条件は揃っていますか？'
      ]),
      priority: 'safety',
      requiresInput: true,
      phase: 'investigation'
    };
  }

  // 車両タイプが不明な場合
  if (!vehicleType && symptoms.length > 0) {
    // 症状・現象・状態などの同義語が連続しないよう1回のみ表示
    const symptomText = symptoms.length ? symptoms[0] : '';
    return {
      message: `${symptomText} を確認しました。車種がわかると精度が上がります。`,
      nextQuestion: v(state,'veh.q',[
        'ご利用中の保守用車の種類を教えてくださいね。',
        '車両タイプは何でしょうか？',
        'どの種類の保守用車か教えていただけますか？'
      ]),
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
        message: `${vehicleType}で${symptoms[0]}について詳しく確認しますね。`,
        nextQuestion: specificQuestions[0].replace(/\?$/, 'でしょうか？'),
        priority: 'diagnosis',
        requiresInput: true,
        phase: 'diagnosis'
      };
    }
  }

  // デフォルトの調査継続
  return {
    message: v(state,'investigate.more',[
      'もう少し具体的な手がかりを頂けると助かります。',
      '追加で一つだけ補足してもらえますか？',
      '原因絞り込みのため、あと一歩情報をくださいね。'
    ]),
    nextQuestion: v(state,'investigate.q',[
      '発生タイミング（起動直後 / 負荷中 / 長時間後）を教えてくださいね。',
      '直前に行っていた操作や環境の変化はありましたか？',
      '再現条件（こうすると必ず起きる 等）はありますか？'
    ]),
    priority: 'info',
    requiresInput: true,
    phase: 'investigation'
  };
}

function generateDiagnosisResponse(state: DiagnosisState): InteractiveResponse {
  const { suspectedCauses, confidence } = state;
  
  // 一定の情報が揃ったら自動で応急処置フェーズへ遷移
  if (confidence >= 0.7 && suspectedCauses.length > 0) {
    const primaryCause = suspectedCauses[0];
    return {
      message: v(state,'diag.primary',[
        `💡 今の最有力候補は ${primaryCause} です。`,
        `💡 現段階で一番濃いのは ${primaryCause} です。`,
        `💡 いま優勢なのは ${primaryCause} の線ですね。`
      ]) + `（信頼度 ${Math.round(confidence*100)}%）`,
      details: `他の候補: ${state.suspectedCauses.slice(1).join(' / ') || 'なし'}\n安全状態: ${state.collectedInfo.safetyStatus || '未確認'}\n→ このまま処置へ進みます。`,
      nextQuestion: '応急処置のSTEP1からご案内しますね。よろしいでしょうか？',
      suggestedActions: generateInitialActions(primaryCause),
      options: ['はい、進めてください', 'もう少し詳しく調査', '専門家に連絡'],
      priority: 'action',
      requiresInput: true,
      phase: 'action'
    };
  } else {
    return {
      message: v(state,'diag.multi',[
        '🤔 候補がいくつか並んでいますね。',
        '🤔 まだ複数パターンが拮抗しています。',
        '🤔 ここから候補を一つ深掘りしましょう。'
      ]),
      details: suspectedCauses.length ? suspectedCauses.map((c,i)=>`${i+1}. ${c}`).join('\n') : 'まだ十分な特徴がありません。',
      nextQuestion: v(state,'diag.multi.q',[
        'まずどれを確認してみましょうか？',
        '最初に焦点を当てる候補を選んでください。',
        '一番確かめたい候補はどれでしょう？'
      ]),
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
  // 1ステップずつ案内
  let stepIdx = (state.nextActions && state.nextActions.length) ? state.nextActions.length : 0;
  if (stepIdx >= stepByStepActions.length) stepIdx = stepByStepActions.length - 1;
  const stepMsg = stepByStepActions[stepIdx] || stepByStepActions[0];
  return {
    message: `🛠️ 応急処置STEP${stepIdx+1}をご案内しますね。「${stepMsg}」を実施してください。`,
    details: `STEP${stepIdx+1}: ${stepMsg}\n（全体: ${stepByStepActions.length}ステップ）`,
    nextQuestion: `STEP${stepIdx+1}の結果はいかがでしょうか？（成功/変化なし/悪化など）`,
    suggestedActions: [stepMsg],
    priority: 'action',
    requiresInput: true,
    phase: 'verification'
  };
}

function generateVerificationResponse(state: DiagnosisState): InteractiveResponse {
  // まだ未実施のステップがあれば action に戻す
  const { suspectedCauses, collectedInfo, nextActions } = state;
  const actions = generateStepByStepActions(suspectedCauses[0], collectedInfo.vehicleType);
  if (nextActions.length < actions.length) {
    return generateActionResponse(state);
  }
  return {
    message: v(state,'verify.msg',[
      '✅ 効果を一緒に確認しましょう。',
      '✅ このタイミングで状態をチェックします。',
      '✅ 処置後の変化を教えてくださいね。'
    ]),
    details: '例: 完全に解決 / 部分的に改善(どこが残存) / 変化なし / 悪化(追加症状)',
    nextQuestion: v(state,'verify.q',['結果はいかがですか？','変化はありましたか？','現在の状態を教えてください。']),
    options: ['完全に解決', '部分的に改善', '変化なし', '悪化した'],
    priority: 'action',
    requiresInput: true,
    phase: 'completed'
  };
}

function generateCompletedResponse(state: DiagnosisState): InteractiveResponse {
  return {
    message: v(state,'complete.msg',[
      '🎉 ここまでの応急対応お疲れさまでした。',
      '🎉 一次的な処置は完了です。ご協力ありがとうございます。',
      '🎉 応急フェーズは完了です。ナイス対応でした。'
    ]),
    details: 'ログ保存推奨: 1) 点検周期の見直し 2) 兆候の早期共有 3) 恒久対策が必要なら計画化しましょう。',
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

// ---------- 可変表現ユーティリティ ----------
function v(state: DiagnosisState, group: string, arr: string[]): string {
  if (!arr.length) return '';
  if (arr.length === 1) return arr[0];
  const history = state.phraseHistory || [];
  const recent = history.slice(-12); // 直近12件で重複避け
  // 利用可能候補（同じ group の未使用 or 使用回数最少）
  const candidates = arr.map((text, idx) => ({ text, key: `${group}:${idx}`, idx }));
  // グループ内使用回数算出
  const counts: Record<string, number> = {};
  for (const k of history) {
    if (k.startsWith(group+':')) counts[k] = (counts[k]||0)+1;
  }
  const minCount = Math.min(...candidates.map(c => counts[c.key]||0));
  let filtered = candidates.filter(c => (counts[c.key]||0) === minCount);
  // さらに直近出現を避ける
  filtered = filtered.filter(c => !recent.includes(c.key)) || filtered;
  const pickIdx = Math.floor(Math.random() * filtered.length);
  const chosen = filtered[pickIdx];
  // 履歴更新（呼び出し元で state を mutate しないので注意: ここで push しても元の参照を編集）
  if (!state.phraseHistory) state.phraseHistory = [];
  state.phraseHistory.push(chosen.key);
  if (state.phraseHistory.length > 100) state.phraseHistory.splice(0, state.phraseHistory.length - 100);
  return chosen.text;
}
