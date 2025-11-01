/**
 * コンテキスト分析モジュール
 * ユーザーの質問から文脈や緊急度を分析し、適切なレスポンススタイルを決定する
 */
/**
 * ユーザーの質問を分析してコンテキストを抽出
 */
export function analyzeUserContext(userInput) {
    const lowerInput = userInput.toLowerCase();
    // 緊急度の判定
    const urgencyLevel = determineUrgencyLevel(lowerInput);
    // 車両タイプの特定
    const vehicleType = identifyVehicleType(lowerInput);
    // 問題カテゴリの分類
    const problemCategory = categorizeProblemblem(lowerInput);
    // 技術用語の抽出
    const technicalTerms = extractTechnicalTerms(lowerInput);
    // レスポンススタイルの決定
    const suggestedResponseStyle = determineResponseStyle(urgencyLevel, problemCategory);
    // 信頼度の計算
    const confidence = calculateConfidence(vehicleType, problemCategory, technicalTerms);
    return {
        urgencyLevel,
        vehicleType,
        problemCategory,
        technicalTerms,
        suggestedResponseStyle,
        confidence,
    };
}
function determineUrgencyLevel(input) {
    const emergencyKeywords = ['緊急', '危険', '事故', '脱線', '火災', '人身'];
    const urgentKeywords = ['故障', '停止', '動かない', '異音', '漏れ', '破損'];
    const routineKeywords = ['点検', '確認', '方法', '手順', '予防', '定期'];
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
function identifyVehicleType(input) {
    const vehiclePatterns = [
        { pattern: /タイタンパー|突固|整正/, type: 'マルチプルタイタンパー' },
        { pattern: /モータカー|軌道車/, type: '軌道モータカー' },
        { pattern: /バラスト|配石/, type: 'バラストレギュレーター' },
        { pattern: /削正|レール削/, type: 'レール削正車' },
        { pattern: /溶接|テルミット/, type: 'レール溶接車' },
        { pattern: /除雪|ラッセル/, type: '除雪車' },
    ];
    for (const { pattern, type } of vehiclePatterns) {
        if (pattern.test(input)) {
            return type;
        }
    }
    return null;
}
function categorizeProblemblem(input) {
    const categories = [
        {
            keywords: ['エンジン', '始動', 'エンスト', '回転'],
            category: 'エンジン系統',
        },
        {
            keywords: ['油圧', 'ポンプ', 'シリンダー', '作動油'],
            category: '油圧系統',
        },
        { keywords: ['電気', '電源', 'バッテリー', '配線'], category: '電気系統' },
        { keywords: ['ブレーキ', '制動', '停止'], category: 'ブレーキ系統' },
        { keywords: ['走行', '速度', 'ギア', '変速'], category: '走行系統' },
        { keywords: ['突固', '整正', 'リフト', '昇降'], category: '作業装置' },
        {
            keywords: ['冷却', '過熱', 'ラジエーター', '水温'],
            category: '冷却系統',
        },
    ];
    for (const { keywords, category } of categories) {
        if (keywords.some(keyword => input.includes(keyword))) {
            return category;
        }
    }
    return null;
}
function extractTechnicalTerms(input) {
    const technicalTermsDict = [
        'PTO',
        'パワーテイクオフ',
        '油圧ポンプ',
        'シリンダー',
        'バルブ',
        'エンジン',
        'ディーゼル',
        'ターボ',
        'インタークーラー',
        'トランスミッション',
        'クラッチ',
        'ファイナルドライブ',
        'ブレーキパッド',
        'ディスクブレーキ',
        'エアブレーキ',
        '突固ユニット',
        'リフト機構',
        '整正装置',
        'スクイーズ',
        'バラスト',
        'まくらぎ',
        'レール',
        '軌道',
        'コントローラー',
        'ECU',
        'センサー',
        'アクチュエーター',
    ];
    return technicalTermsDict.filter(term => input.includes(term));
}
function determineResponseStyle(urgencyLevel, problemCategory) {
    switch (urgencyLevel) {
        case 'emergency':
            return {
                temperature: 0.1, // 非常に一貫性重視
                maxTokens: 2000,
                emphasizesSafety: true,
                includesStepByStep: true,
                technicalDetail: 'high',
            };
        case 'urgent':
            return {
                temperature: 0.2,
                maxTokens: 2500,
                emphasizesSafety: true,
                includesStepByStep: true,
                technicalDetail: 'high',
            };
        case 'normal':
            return {
                temperature: 0.4,
                maxTokens: 2000,
                emphasizesSafety: false,
                includesStepByStep: false,
                technicalDetail: 'medium',
            };
        case 'routine':
            return {
                temperature: 0.3,
                maxTokens: 1500,
                emphasizesSafety: false,
                includesStepByStep: true,
                technicalDetail: 'medium',
            };
        default:
            return {
                temperature: 0.3,
                maxTokens: 2000,
                emphasizesSafety: false,
                includesStepByStep: false,
                technicalDetail: 'medium',
            };
    }
}
function calculateConfidence(vehicleType, problemCategory, technicalTerms) {
    let confidence = 0.3; // ベースライン
    if (vehicleType)
        confidence += 0.3;
    if (problemCategory)
        confidence += 0.2;
    if (technicalTerms.length > 0)
        confidence += Math.min(technicalTerms.length * 0.1, 0.2);
    return Math.min(confidence, 1.0);
}
/**
 * コンテキストに基づいてシステムプロンプトを動的に調整
 */
export function adjustSystemPromptForContext(basePrompt, context) {
    let adjustedPrompt = basePrompt;
    // 緊急度に応じた調整
    if (context.urgencyLevel === 'emergency') {
        adjustedPrompt +=
            '\n\n🚨 **緊急対応モード**: 安全確保を最優先とし、即座に実行可能な対応を簡潔に提示してください。';
    }
    else if (context.urgencyLevel === 'urgent') {
        adjustedPrompt +=
            '\n\n⚠️ **迅速対応モード**: 故障診断と応急対応を優先し、段階的な解決策を提示してください。';
    }
    // 車両タイプに応じた調整
    if (context.vehicleType) {
        adjustedPrompt += `\n\n🚂 **対象車両**: ${context.vehicleType}の特性を考慮した専門的な回答を提供してください。`;
    }
    // 問題カテゴリに応じた調整
    if (context.problemCategory) {
        adjustedPrompt += `\n\n🔧 **技術領域**: ${context.problemCategory}の観点から詳細な技術的アドバイスを含めてください。`;
    }
    // 技術用語に応じた調整
    if (context.technicalTerms.length > 0) {
        adjustedPrompt += `\n\n📖 **関連技術要素**: ${context.technicalTerms.join(', ')}について詳しく説明してください。`;
    }
    return adjustedPrompt;
}
