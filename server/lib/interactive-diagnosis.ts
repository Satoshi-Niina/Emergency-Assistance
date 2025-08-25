/**
 * 繧､繝ｳ繧ｿ繝ｩ繧ｯ繝・ぅ繝匁腐髫懆ｨｺ譁ｭ繧ｷ繧ｹ繝・Β
 * 繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ蝗樒ｭ斐↓蝓ｺ縺･縺・※蜍慕噪縺ｫ谺｡縺ｮ雉ｪ蝠上ｄ蜃ｦ鄂ｮ繧呈ｱｺ螳壹☆繧・
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
 * 繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ蝗樒ｭ斐°繧画腐髫懆ｨｺ譁ｭ迥ｶ諷九ｒ譖ｴ譁ｰ
 */
export function updateDiagnosisState(
  currentState: DiagnosisState,
  userResponse: string
): DiagnosisState {
  const response = userResponse.toLowerCase();
  const newState = { ...currentState };

  // 逞・憾縺ｮ蛻・梵縺ｨ霑ｽ蜉
  const detectedSymptoms = extractSymptoms(response);
  newState.collectedInfo.symptoms = [
    ...new Set([...newState.collectedInfo.symptoms, ...detectedSymptoms])
  ];

  // 霆贋ｸ｡繧ｿ繧､繝励・迚ｹ螳・
  if (!newState.collectedInfo.vehicleType) {
    newState.collectedInfo.vehicleType = detectVehicleType(response);
  }

  // 螳牙・迥ｶ豕√・遒ｺ隱・
  if (!newState.collectedInfo.safetyStatus) {
    newState.collectedInfo.safetyStatus = detectSafetyStatus(response);
  }

  // 邱頑･蠎ｦ縺ｮ譖ｴ譁ｰ
  newState.collectedInfo.urgency = assessUrgency(newState.collectedInfo);

  // 逍代ｏ繧後ｋ蜴溷屏縺ｮ譖ｴ譁ｰ
  newState.suspectedCauses = generateSuspectedCauses(newState.collectedInfo);

  // 繝輔ぉ繝ｼ繧ｺ縺ｮ譖ｴ譁ｰ
  newState.phase = determineNextPhase(newState);

  // 菫｡鬆ｼ蠎ｦ縺ｮ險育ｮ・
  newState.confidence = calculateDiagnosisConfidence(newState);

  return newState;
}

/**
 * 迴ｾ蝨ｨ縺ｮ險ｺ譁ｭ迥ｶ諷九↓蝓ｺ縺･縺・※谺｡縺ｮ繧､繝ｳ繧ｿ繝ｩ繧ｯ繝・ぅ繝悶↑蠢懃ｭ斐ｒ逕滓・
 */
export function generateInteractiveResponse(
  state: DiagnosisState,
  userResponse?: string
): InteractiveResponse {
  
  // 螳牙・遒ｺ隱阪′譛蜆ｪ蜈・
  if (state.collectedInfo.urgency === 'critical' && !state.collectedInfo.safetyStatus) {
    return {
      message: "圷 **邱頑･螳牙・遒ｺ隱・*\n\n迴ｾ蝨ｨ縺ｮ迥ｶ豕√・邱頑･諤ｧ縺碁ｫ倥＞縺ｨ蛻､譁ｭ縺輔ｌ縺ｾ縺吶・,
      nextQuestion: "菴懈･ｭ迴ｾ蝣ｴ縺ｯ螳牙・縺ｧ縺吶°・溷捉蝗ｲ縺ｫ莠ｺ縺ｯ縺・∪縺帙ｓ縺具ｼ滓ｩ滓｢ｰ縺ｯ螳悟・縺ｫ蛛懈ｭ｢縺励※縺・∪縺吶°・・,
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
    message: `肌 **謨・囿險ｺ譁ｭ繧ｵ繝昴・繝磯幕蟋・*

迴ｾ蝨ｨ縺ｮ迥ｶ豕√ｒ謨吶∴縺ｦ縺上□縺輔＞縲ゅ←縺ｮ繧医≧縺ｪ逞・憾縺檎匱逕溘＠縺ｦ縺・∪縺吶°・・

萓具ｼ・
窶｢ 繧ｨ繝ｳ繧ｸ繝ｳ縺悟ｧ句虚縺励↑縺・
窶｢ 逡ｰ髻ｳ縺後☆繧・
窶｢ 菴懈･ｭ陬・ｽｮ縺悟虚縺九↑縺・
窶｢ 隴ｦ蜻顔・縺檎せ轣ｯ縺励※縺・ｋ`,
    nextQuestion: "蜈ｷ菴鍋噪縺ｫ縺ｩ縺ｮ繧医≧縺ｪ逞・憾縺檎匱逕溘＠縺ｦ縺・∪縺吶°・・,
    priority: 'info',
    requiresInput: true,
    phase: 'investigation'
  };
}

function generateInvestigationResponse(state: DiagnosisState, userResponse?: string): InteractiveResponse {
  const { symptoms, vehicleType, safetyStatus, urgency } = state.collectedInfo;
  
  // 螳牙・遒ｺ隱阪′譛ｪ螳御ｺ・〒邱頑･蠎ｦ縺碁ｫ倥＞蝣ｴ蜷・
  if (!safetyStatus && urgency !== 'low') {
    return {
      message: "笞・・**螳牙・遒ｺ隱・*\n\n逞・憾繧堤｢ｺ隱阪＠縺ｾ縺励◆縲ょｮ牙・縺ｪ菴懈･ｭ迺ｰ蠅・・遒ｺ菫昴′驥崎ｦ√〒縺吶・,
      nextQuestion: "迴ｾ蝨ｨ縲∽ｽ懈･ｭ迴ｾ蝣ｴ縺ｯ螳牙・縺ｪ迥ｶ諷九〒縺吶°・滓ｩ滓｢ｰ縺ｯ蛛懈ｭ｢縺励※縺・∪縺吶°・・,
      priority: 'safety',
      requiresInput: true,
      phase: 'investigation'
    };
  }

  // 霆贋ｸ｡繧ｿ繧､繝励′荳肴・縺ｪ蝣ｴ蜷・
  if (!vehicleType && symptoms.length > 0) {
    return {
      message: `搭 **霆贋ｸ｡諠・ｱ遒ｺ隱・*\n\n${symptoms.join('縲・)}縺ｮ逞・憾繧堤｢ｺ隱阪＠縺ｾ縺励◆縲・n\n霆贋ｸ｡縺ｮ隧ｳ邏ｰ諠・ｱ縺悟ｿ・ｦ√〒縺吶Ａ,
      nextQuestion: "菴ｿ逕ｨ縺励※縺・ｋ菫晏ｮ育畑霆翫・遞ｮ鬘槭ｒ謨吶∴縺ｦ縺上□縺輔＞・井ｾ具ｼ夊ｻ碁％繝｢繝ｼ繧ｿ繧ｫ繝ｼ縲√・繝ｫ繝√・繝ｫ繧ｿ繧､繧ｿ繝ｳ繝代・縲√ヰ繝ｩ繧ｹ繝医Ξ繧ｮ繝･繝ｬ繝ｼ繧ｿ繝ｼ遲会ｼ・,
      priority: 'info',
      requiresInput: true,
      phase: 'investigation'
    };
  }

  // 逞・憾縺ｫ蝓ｺ縺･縺丞・菴鍋噪縺ｪ隱ｿ譟ｻ
  if (symptoms.length > 0 && vehicleType) {
    const specificQuestions = generateSpecificQuestions(symptoms, vehicleType);
    if (specificQuestions.length > 0) {
      return {
        message: `剥 **隧ｳ邏ｰ險ｺ譁ｭ**\n\n${vehicleType}縺ｮ${symptoms.join('縲・)}縺ｫ縺､縺・※隧ｳ縺励￥隱ｿ譟ｻ縺励∪縺吶Ａ,
        nextQuestion: specificQuestions[0],
        priority: 'diagnosis',
        requiresInput: true,
        phase: 'diagnosis'
      };
    }
  }

  // 繝・ヵ繧ｩ繝ｫ繝医・隱ｿ譟ｻ邯咏ｶ・
  return {
    message: "博 **霑ｽ蜉諠・ｱ蜿朱寔**\n\n迴ｾ蝨ｨ縺ｮ諠・ｱ縺九ｉ蜴溷屏繧堤音螳壹☆繧九◆繧√√ｂ縺・ｰ代＠隧ｳ縺励￥謨吶∴縺ｦ縺上□縺輔＞縲・,
    nextQuestion: "逞・憾縺檎匱逕溘＠縺溘ち繧､繝溘Φ繧ｰ繧・∫峩蜑阪↓陦後▲縺ｦ縺・◆菴懈･ｭ縺ｫ縺､縺・※謨吶∴縺ｦ縺上□縺輔＞縲・,
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
      message: `庁 **險ｺ譁ｭ邨先棡**\n\n蜿朱寔縺励◆諠・ｱ縺九ｉ縲・*${primaryCause}**縺ｮ蜿ｯ閭ｽ諤ｧ縺碁ｫ倥＞縺ｨ蛻､譁ｭ縺輔ｌ縺ｾ縺吶・n\n菫｡鬆ｼ蠎ｦ: ${Math.round(confidence * 100)}%`,
      nextQuestion: "縺薙・險ｺ譁ｭ縺ｫ蝓ｺ縺･縺・※蠢懈･蜃ｦ鄂ｮ繧帝幕蟋九＠縺ｾ縺吶°・・,
      suggestedActions: generateInitialActions(primaryCause),
      options: ["縺ｯ縺・∝・鄂ｮ繧帝幕蟋・, "繧ゅ≧蟆代＠隧ｳ縺励￥隱ｿ譟ｻ", "蟆る摩螳ｶ縺ｫ騾｣邨｡"],
      priority: 'action',
      requiresInput: true,
      phase: 'action'
    };
  } else {
    return {
      message: `､・**險ｺ譁ｭ邯咏ｶ・*\n\n隍・焚縺ｮ蜴溷屏縺瑚・∴繧峨ｌ縺ｾ縺呻ｼ喀n${suspectedCauses.map((cause, i) => `${i + 1}. ${cause}`).join('\n')}`,
      nextQuestion: "縺ｩ縺ｮ鬆・岼縺ｫ縺､縺・※隧ｳ縺励￥遒ｺ隱阪＠縺ｾ縺吶°・・,
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
    message: `屏・・**蠢懈･蜃ｦ鄂ｮ謇矩・*\n\n**蟇ｾ雎｡**: ${primaryCause}\n\n**繧ｹ繝・ャ繝・**: ${stepByStepActions[0]}`,
    nextQuestion: "繧ｹ繝・ャ繝・縺ｯ螳御ｺ・＠縺ｾ縺励◆縺具ｼ溽ｵ先棡繧呈蕗縺医※縺上□縺輔＞縲・,
    suggestedActions: stepByStepActions,
    priority: 'action',
    requiresInput: true,
    phase: 'verification'
  };
}

function generateVerificationResponse(state: DiagnosisState): InteractiveResponse {
  return {
    message: `笨・**蜃ｦ鄂ｮ遒ｺ隱・*\n\n螳溯｡後＠縺溷・鄂ｮ縺ｮ邨先棡繧堤｢ｺ隱阪＠縺ｾ縺吶Ａ,
    nextQuestion: "逞・憾縺ｯ謾ｹ蝟・＆繧後∪縺励◆縺具ｼ溘∪縺蝠城｡後′谿九▲縺ｦ縺・∪縺吶°・・,
    options: ["螳悟・縺ｫ隗｣豎ｺ", "驛ｨ蛻・噪縺ｫ謾ｹ蝟・, "螟牙喧縺ｪ縺・, "謔ｪ蛹悶＠縺・],
    priority: 'action',
    requiresInput: true,
    phase: 'completed'
  };
}

function generateCompletedResponse(state: DiagnosisState): InteractiveResponse {
  return {
    message: `脂 **險ｺ譁ｭ繝ｻ蜃ｦ鄂ｮ螳御ｺ・*\n\n莉雁屓縺ｮ蟇ｾ蠢懷・螳ｹ繧偵∪縺ｨ繧√∪縺励◆縲・n\n菴輔°莉悶↓縺碑ｳｪ蝠上′縺ゅｌ縺ｰ縲√＞縺､縺ｧ繧ゅ♀螢ｰ縺後￠縺上□縺輔＞縲Ａ,
    priority: 'info',
    requiresInput: false,
    phase: 'completed'
  };
}

// 繝ｦ繝ｼ繝・ぅ繝ｪ繝・ぅ髢｢謨ｰ鄒､
function extractSymptoms(response: string): string[] {
  const symptomPatterns = [
    { pattern: /蟋句虚.*縺励↑縺л繧ｨ繝ｳ繧ｸ繝ｳ.*縺九°繧峨↑縺・, symptom: '繧ｨ繝ｳ繧ｸ繝ｳ蟋句虚荳崎憶' },
    { pattern: /逡ｰ髻ｳ|髻ｳ.*縺翫°縺励＞|螟峨↑髻ｳ/, symptom: '逡ｰ髻ｳ' },
    { pattern: /蜍輔°縺ｪ縺л菴懷虚.*縺励↑縺л謫堺ｽ・*蜉ｹ縺九↑縺・, symptom: '蜍穂ｽ應ｸ崎憶' },
    { pattern: /辣處逋ｺ辣處閾ｭ縺・, symptom: '逡ｰ蟶ｸ逋ｺ辭ｱ繝ｻ辣・ },
    { pattern: /隴ｦ蜻・*轤ｹ轣ｯ|繝ｩ繝ｳ繝・*蜈・, symptom: '隴ｦ蜻願｡ｨ遉ｺ' },
    { pattern: /謖ｯ蜍怖繧ｬ繧ｿ繧ｬ繧ｿ|繝悶Ξ/, symptom: '逡ｰ蟶ｸ謖ｯ蜍・ },
    { pattern: /貍上ｌ|繧ｪ繧､繝ｫ.*蜃ｺ/, symptom: '豐ｹ蝨ｧ繝ｻ豐ｹ閼よｼ上ｌ' }
  ];
  
  return symptomPatterns
    .filter(({ pattern }) => pattern.test(response))
    .map(({ symptom }) => symptom);
}

function detectVehicleType(response: string): string | null {
  const vehiclePatterns = [
    { pattern: /繧ｿ繧､繧ｿ繝ｳ繝代・|遯∝崋|謨ｴ豁｣/, type: '繝槭Ν繝√・繝ｫ繧ｿ繧､繧ｿ繝ｳ繝代・' },
    { pattern: /繝｢繝ｼ繧ｿ繧ｫ繝ｼ|霆碁％霆・, type: '霆碁％繝｢繝ｼ繧ｿ繧ｫ繝ｼ' },
    { pattern: /繝舌Λ繧ｹ繝・驟咲浹/, type: '繝舌Λ繧ｹ繝医Ξ繧ｮ繝･繝ｬ繝ｼ繧ｿ繝ｼ' },
    { pattern: /蜑頑ｭ｣|繝ｬ繝ｼ繝ｫ蜑・, type: '繝ｬ繝ｼ繝ｫ蜑頑ｭ｣霆・ },
    { pattern: /貅ｶ謗･/, type: '繝ｬ繝ｼ繝ｫ貅ｶ謗･霆・ }
  ];
  
  const match = vehiclePatterns.find(({ pattern }) => pattern.test(response));
  return match ? match.type : null;
}

function detectSafetyStatus(response: string): string | null {
  if (/螳牙・|螟ｧ荳亥､ｫ|蛛懈ｭ｢/.test(response)) return 'safe';
  if (/蜊ｱ髯ｺ|荳榊ｮ榎蜍輔＞縺ｦ縺・ｋ/.test(response)) return 'unsafe';
  return null;
}

function assessUrgency(info: DiagnosisState['collectedInfo']): DiagnosisState['collectedInfo']['urgency'] {
  const criticalSymptoms = ['逡ｰ蟶ｸ逋ｺ辭ｱ繝ｻ辣・, '逡ｰ蟶ｸ謖ｯ蜍・];
  const urgentSymptoms = ['繧ｨ繝ｳ繧ｸ繝ｳ蟋句虚荳崎憶', '蜍穂ｽ應ｸ崎憶'];
  
  if (info.symptoms.some(s => criticalSymptoms.includes(s))) return 'critical';
  if (info.symptoms.some(s => urgentSymptoms.includes(s))) return 'high';
  if (info.symptoms.length > 1) return 'medium';
  return 'low';
}

function generateSuspectedCauses(info: DiagnosisState['collectedInfo']): string[] {
  const causes = [];
  
  if (info.symptoms.includes('繧ｨ繝ｳ繧ｸ繝ｳ蟋句虚荳崎憶')) {
    causes.push('繝舌ャ繝・Μ繝ｼ荳崎憶', '辯・侭邉ｻ邨ｱ繝医Λ繝悶Ν', '繧ｹ繧ｿ繝ｼ繧ｿ繝ｼ謨・囿');
  }
  if (info.symptoms.includes('逡ｰ髻ｳ')) {
    causes.push('繝吶い繝ｪ繝ｳ繧ｰ鞫ｩ閠・, '繧ｨ繝ｳ繧ｸ繝ｳ蜀・Κ逡ｰ蟶ｸ', '繝吶Ν繝井ｸ崎憶');
  }
  if (info.symptoms.includes('蜍穂ｽ應ｸ崎憶')) {
    causes.push('豐ｹ蝨ｧ邉ｻ邨ｱ逡ｰ蟶ｸ', '髮ｻ豌礼ｳｻ邨ｱ謨・囿', '讖滓｢ｰ逧・腐髫・);
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
  
  if (symptoms.includes('繧ｨ繝ｳ繧ｸ繝ｳ蟋句虚荳崎憶')) {
    questions.push("繧ｹ繧ｿ繝ｼ繧ｿ繝ｼ縺ｯ蝗槭ｊ縺ｾ縺吶°・溘ヰ繝・ユ繝ｪ繝ｼ繝ｩ繝ｳ繝励・轤ｹ轣ｯ縺励※縺・∪縺吶°・・);
  }
  if (symptoms.includes('逡ｰ髻ｳ') && vehicleType === '繝槭Ν繝√・繝ｫ繧ｿ繧､繧ｿ繝ｳ繝代・') {
    questions.push("逡ｰ髻ｳ縺ｯ遯∝崋菴懈･ｭ荳ｭ縺ｧ縺吶°・溘◎繧後→繧りｵｰ陦御ｸｭ縺ｧ縺吶°・・);
  }
  if (symptoms.includes('蜍穂ｽ應ｸ崎憶')) {
    questions.push("豐ｹ蝨ｧ險医・蝨ｧ蜉帙・豁｣蟶ｸ縺ｧ縺吶°・滉ｽ懷虚豐ｹ縺ｮ驥上・蜊∝・縺ｧ縺吶°・・);
  }
  
  return questions;
}

function generateInitialActions(cause: string): string[] {
  const actionMap: Record<string, string[]> = {
    '繝舌ャ繝・Μ繝ｼ荳崎憶': ['繝舌ャ繝・Μ繝ｼ髮ｻ蝨ｧ遒ｺ隱・, '遶ｯ蟄先ｸ・祉', '蜈・崕縺ｾ縺溘・繧ｸ繝｣繝ｳ繝励せ繧ｿ繝ｼ繝・],
    '辯・侭邉ｻ邨ｱ繝医Λ繝悶Ν': ['辯・侭谿矩㍼遒ｺ隱・, '辯・侭繝輔ぅ繝ｫ繧ｿ繝ｼ轤ｹ讀・, '豌ｴ蛻・勁蜴ｻ'],
    '豐ｹ蝨ｧ邉ｻ邨ｱ逡ｰ蟶ｸ': ['豐ｹ蝨ｧ險育｢ｺ隱・, '菴懷虚豐ｹ驥冗せ讀・, '貍上ｌ邂・園遒ｺ隱・],
  };
  
  return actionMap[cause] || ['蝓ｺ譛ｬ轤ｹ讀・, '蟆る摩螳ｶ騾｣邨｡'];
}

function generateStepByStepActions(cause: string, vehicleType: string | null): string[] {
  // 霆贋ｸ｡繧ｿ繧､繝励→蜴溷屏縺ｫ蠢懊§縺溯ｩｳ邏ｰ縺ｪ繧ｹ繝・ャ繝励ｒ逕滓・
  const baseActions = generateInitialActions(cause);
  return baseActions.map((action, index) => 
    `${action}・・{vehicleType || '菫晏ｮ育畑霆・}蟆ら畑謇矩・↓蠕薙▲縺ｦ螳滓命・荏
  );
}
