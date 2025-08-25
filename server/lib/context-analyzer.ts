/**
 * 繧ｳ繝ｳ繝・く繧ｹ繝亥・譫舌Δ繧ｸ繝･繝ｼ繝ｫ
 * 繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ雉ｪ蝠上°繧画枚閼医ｄ邱頑･蠎ｦ繧貞・譫舌＠縲・←蛻・↑繝ｬ繧ｹ繝昴Φ繧ｹ繧ｹ繧ｿ繧､繝ｫ繧呈ｱｺ螳壹☆繧・
 */

export interface ContextAnalysis {
  urgencyLevel: 'emergency' | 'urgent' | 'normal' | 'routine';
  vehicleType: string | null;
  problemCategory: string | null;
  technicalTerms: string[];
  suggestedResponseStyle: ResponseStyle;
  confidence: number;
}

export interface ResponseStyle {
  temperature: number;
  maxTokens: number;
  emphasizesSafety: boolean;
  includesStepByStep: boolean;
  technicalDetail: 'high' | 'medium' | 'low';
}

/**
 * 繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ雉ｪ蝠上ｒ蛻・梵縺励※繧ｳ繝ｳ繝・く繧ｹ繝医ｒ謚ｽ蜃ｺ
 */
export function analyzeUserContext(userInput: string): ContextAnalysis {
  const lowerInput = userInput.toLowerCase();
  
  // 邱頑･蠎ｦ縺ｮ蛻､螳・
  const urgencyLevel = determineUrgencyLevel(lowerInput);
  
  // 霆贋ｸ｡繧ｿ繧､繝励・迚ｹ螳・
  const vehicleType = identifyVehicleType(lowerInput);
  
  // 蝠城｡後き繝・ざ繝ｪ縺ｮ蛻・｡・
  const problemCategory = categorizeProblemblem(lowerInput);
  
  // 謚陦鍋畑隱槭・謚ｽ蜃ｺ
  const technicalTerms = extractTechnicalTerms(lowerInput);
  
  // 繝ｬ繧ｹ繝昴Φ繧ｹ繧ｹ繧ｿ繧､繝ｫ縺ｮ豎ｺ螳・
  const suggestedResponseStyle = determineResponseStyle(urgencyLevel, problemCategory);
  
  // 菫｡鬆ｼ蠎ｦ縺ｮ險育ｮ・
  const confidence = calculateConfidence(vehicleType, problemCategory, technicalTerms);
  
  return {
    urgencyLevel,
    vehicleType,
    problemCategory,
    technicalTerms,
    suggestedResponseStyle,
    confidence
  };
}

function determineUrgencyLevel(input: string): ContextAnalysis['urgencyLevel'] {
  const emergencyKeywords = ['邱頑･', '蜊ｱ髯ｺ', '莠区腐', '閼ｱ邱・, '轣ｫ轣ｽ', '莠ｺ霄ｫ'];
  const urgentKeywords = ['謨・囿', '蛛懈ｭ｢', '蜍輔°縺ｪ縺・, '逡ｰ髻ｳ', '貍上ｌ', '遐ｴ謳・];
  const routineKeywords = ['轤ｹ讀・, '遒ｺ隱・, '譁ｹ豕・, '謇矩・, '莠磯亟', '螳壽悄'];
  
  if (emergencyKeywords.some(keyword => input.includes(keyword))) {
    return 'emergency';
  }
  if (urgentKeywords.some(keyword => input.includes(keyword))) {
    return 'urgent';
  }
  if (routineKeywords.some(keyword => input.includes(keyword))) {
    return 'routine';
  }
  return 'normal';
}

function identifyVehicleType(input: string): string | null {
  const vehiclePatterns = [
    { pattern: /繧ｿ繧､繧ｿ繝ｳ繝代・|遯∝崋|謨ｴ豁｣/, type: '繝槭Ν繝√・繝ｫ繧ｿ繧､繧ｿ繝ｳ繝代・' },
    { pattern: /繝｢繝ｼ繧ｿ繧ｫ繝ｼ|霆碁％霆・, type: '霆碁％繝｢繝ｼ繧ｿ繧ｫ繝ｼ' },
    { pattern: /繝舌Λ繧ｹ繝・驟咲浹/, type: '繝舌Λ繧ｹ繝医Ξ繧ｮ繝･繝ｬ繝ｼ繧ｿ繝ｼ' },
    { pattern: /蜑頑ｭ｣|繝ｬ繝ｼ繝ｫ蜑・, type: '繝ｬ繝ｼ繝ｫ蜑頑ｭ｣霆・ },
    { pattern: /貅ｶ謗･|繝・Ν繝溘ャ繝・, type: '繝ｬ繝ｼ繝ｫ貅ｶ謗･霆・ },
    { pattern: /髯､髮ｪ|繝ｩ繝・そ繝ｫ/, type: '髯､髮ｪ霆・ }
  ];
  
  for (const { pattern, type } of vehiclePatterns) {
    if (pattern.test(input)) {
      return type;
    }
  }
  return null;
}

function categorizeProblemblem(input: string): string | null {
  const categories = [
    { keywords: ['繧ｨ繝ｳ繧ｸ繝ｳ', '蟋句虚', '繧ｨ繝ｳ繧ｹ繝・, '蝗櫁ｻ｢'], category: '繧ｨ繝ｳ繧ｸ繝ｳ邉ｻ邨ｱ' },
    { keywords: ['豐ｹ蝨ｧ', '繝昴Φ繝・, '繧ｷ繝ｪ繝ｳ繝繝ｼ', '菴懷虚豐ｹ'], category: '豐ｹ蝨ｧ邉ｻ邨ｱ' },
    { keywords: ['髮ｻ豌・, '髮ｻ貅・, '繝舌ャ繝・Μ繝ｼ', '驟咲ｷ・], category: '髮ｻ豌礼ｳｻ邨ｱ' },
    { keywords: ['繝悶Ξ繝ｼ繧ｭ', '蛻ｶ蜍・, '蛛懈ｭ｢'], category: '繝悶Ξ繝ｼ繧ｭ邉ｻ邨ｱ' },
    { keywords: ['襍ｰ陦・, '騾溷ｺｦ', '繧ｮ繧｢', '螟蛾・], category: '襍ｰ陦檎ｳｻ邨ｱ' },
    { keywords: ['遯∝崋', '謨ｴ豁｣', '繝ｪ繝輔ヨ', '譏・剄'], category: '菴懈･ｭ陬・ｽｮ' },
    { keywords: ['蜀ｷ蜊ｴ', '驕守・', '繝ｩ繧ｸ繧ｨ繝ｼ繧ｿ繝ｼ', '豌ｴ貂ｩ'], category: '蜀ｷ蜊ｴ邉ｻ邨ｱ' }
  ];
  
  for (const { keywords, category } of categories) {
    if (keywords.some(keyword => input.includes(keyword))) {
      return category;
    }
  }
  return null;
}

function extractTechnicalTerms(input: string): string[] {
  const technicalTermsDict = [
    'PTO', '繝代Ρ繝ｼ繝・う繧ｯ繧ｪ繝・, '豐ｹ蝨ｧ繝昴Φ繝・, '繧ｷ繝ｪ繝ｳ繝繝ｼ', '繝舌Ν繝・,
    '繧ｨ繝ｳ繧ｸ繝ｳ', '繝・ぅ繝ｼ繧ｼ繝ｫ', '繧ｿ繝ｼ繝・, '繧､繝ｳ繧ｿ繝ｼ繧ｯ繝ｼ繝ｩ繝ｼ',
    '繝医Λ繝ｳ繧ｹ繝溘ャ繧ｷ繝ｧ繝ｳ', '繧ｯ繝ｩ繝・メ', '繝輔ぃ繧､繝翫Ν繝峨Λ繧､繝・,
    '繝悶Ξ繝ｼ繧ｭ繝代ャ繝・, '繝・ぅ繧ｹ繧ｯ繝悶Ξ繝ｼ繧ｭ', '繧ｨ繧｢繝悶Ξ繝ｼ繧ｭ',
    '遯∝崋繝ｦ繝九ャ繝・, '繝ｪ繝輔ヨ讖滓ｧ・, '謨ｴ豁｣陬・ｽｮ', '繧ｹ繧ｯ繧､繝ｼ繧ｺ',
    '繝舌Λ繧ｹ繝・, '縺ｾ縺上ｉ縺・, '繝ｬ繝ｼ繝ｫ', '霆碁％',
    '繧ｳ繝ｳ繝医Ο繝ｼ繝ｩ繝ｼ', 'ECU', '繧ｻ繝ｳ繧ｵ繝ｼ', '繧｢繧ｯ繝√Η繧ｨ繝ｼ繧ｿ繝ｼ'
  ];
  
  return technicalTermsDict.filter(term => input.includes(term));
}

function determineResponseStyle(
  urgencyLevel: ContextAnalysis['urgencyLevel'],
  problemCategory: string | null
): ResponseStyle {
  switch (urgencyLevel) {
    case 'emergency':
      return {
        temperature: 0.1, // 髱槫ｸｸ縺ｫ荳雋ｫ諤ｧ驥崎ｦ・
        maxTokens: 2000,
        emphasizesSafety: true,
        includesStepByStep: true,
        technicalDetail: 'high'
      };
    case 'urgent':
      return {
        temperature: 0.2,
        maxTokens: 2500,
        emphasizesSafety: true,
        includesStepByStep: true,
        technicalDetail: 'high'
      };
    case 'normal':
      return {
        temperature: 0.4,
        maxTokens: 2000,
        emphasizesSafety: false,
        includesStepByStep: false,
        technicalDetail: 'medium'
      };
    case 'routine':
      return {
        temperature: 0.3,
        maxTokens: 1500,
        emphasizesSafety: false,
        includesStepByStep: true,
        technicalDetail: 'medium'
      };
    default:
      return {
        temperature: 0.3,
        maxTokens: 2000,
        emphasizesSafety: false,
        includesStepByStep: false,
        technicalDetail: 'medium'
      };
  }
}

function calculateConfidence(
  vehicleType: string | null,
  problemCategory: string | null,
  technicalTerms: string[]
): number {
  let confidence = 0.3; // 繝吶・繧ｹ繝ｩ繧､繝ｳ
  
  if (vehicleType) confidence += 0.3;
  if (problemCategory) confidence += 0.2;
  if (technicalTerms.length > 0) confidence += Math.min(technicalTerms.length * 0.1, 0.2);
  
  return Math.min(confidence, 1.0);
}

/**
 * 繧ｳ繝ｳ繝・く繧ｹ繝医↓蝓ｺ縺･縺・※繧ｷ繧ｹ繝・Β繝励Ο繝ｳ繝励ヨ繧貞虚逧・↓隱ｿ謨ｴ
 */
export function adjustSystemPromptForContext(
  basePrompt: string,
  context: ContextAnalysis
): string {
  let adjustedPrompt = basePrompt;
  
  // 邱頑･蠎ｦ縺ｫ蠢懊§縺溯ｪｿ謨ｴ
  if (context.urgencyLevel === 'emergency') {
    adjustedPrompt += '\n\n圷 **邱頑･蟇ｾ蠢懊Δ繝ｼ繝・*: 螳牙・遒ｺ菫昴ｒ譛蜆ｪ蜈医→縺励∝叉蠎ｧ縺ｫ螳溯｡悟庄閭ｽ縺ｪ蟇ｾ蠢懊ｒ邁｡貎斐↓謠千､ｺ縺励※縺上□縺輔＞縲・;
  } else if (context.urgencyLevel === 'urgent') {
    adjustedPrompt += '\n\n笞・・**霑・溷ｯｾ蠢懊Δ繝ｼ繝・*: 謨・囿險ｺ譁ｭ縺ｨ蠢懈･蟇ｾ蠢懊ｒ蜆ｪ蜈医＠縲∵ｮｵ髫守噪縺ｪ隗｣豎ｺ遲悶ｒ謠千､ｺ縺励※縺上□縺輔＞縲・;
  }
  
  // 霆贋ｸ｡繧ｿ繧､繝励↓蠢懊§縺溯ｪｿ謨ｴ
  if (context.vehicleType) {
    adjustedPrompt += `\n\n嘯 **蟇ｾ雎｡霆贋ｸ｡**: ${context.vehicleType}縺ｮ迚ｹ諤ｧ繧定・・縺励◆蟆る摩逧・↑蝗樒ｭ斐ｒ謠蝉ｾ帙＠縺ｦ縺上□縺輔＞縲Ａ;
  }
  
  // 蝠城｡後き繝・ざ繝ｪ縺ｫ蠢懊§縺溯ｪｿ謨ｴ
  if (context.problemCategory) {
    adjustedPrompt += `\n\n肌 **謚陦馴伜沺**: ${context.problemCategory}縺ｮ隕ｳ轤ｹ縺九ｉ隧ｳ邏ｰ縺ｪ謚陦鍋噪繧｢繝峨ヰ繧､繧ｹ繧貞性繧√※縺上□縺輔＞縲Ａ;
  }
  
  // 謚陦鍋畑隱槭↓蠢懊§縺溯ｪｿ謨ｴ
  if (context.technicalTerms.length > 0) {
    adjustedPrompt += `\n\n当 **髢｢騾｣謚陦楢ｦ∫ｴ**: ${context.technicalTerms.join(', ')}縺ｫ縺､縺・※隧ｳ縺励￥隱ｬ譏弱＠縺ｦ縺上□縺輔＞縲Ａ;
  }
  
  return adjustedPrompt;
}
