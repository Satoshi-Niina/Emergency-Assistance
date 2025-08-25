/**
 * JSON繝ｬ繧ｹ繝昴Φ繧ｹ縺ｮ蜃ｦ逅・→菫ｮ蠕ｩ繧定｡後≧繝倥Ν繝代・髢｢謨ｰ
 * 莉･荳九・繧ｱ繝ｼ繧ｹ縺ｫ蟇ｾ蠢・
 * 1. 繝槭・繧ｯ繝繧ｦ繝ｳ繧ｳ繝ｼ繝峨ヶ繝ｭ繝・け(```json縲～``)縺ｮ髯､蜴ｻ
 * 2. JSON莉･螟悶・繝・く繧ｹ繝郁ｪｬ譏弱・髯､蜴ｻ
 * 3. JavaScript譁・ｳ輔お繝ｩ繝ｼ縺ｮ菫ｮ豁｣(菴吝・縺ｪ繧ｫ繝ｳ繝槭↑縺ｩ)
 * 4. 髢峨§諡ｬ蠑ｧ縺ｮ荳崎ｶｳ繧呈､懷・縺励※菫ｮ豁｣
 * 5. 迚ｹ谿頑枚蟄励ｄUnicode譁・ｭ励・蜃ｦ逅・
 * 6. 荳榊ｮ悟・縺ｪ驟榊・繧・ｸｭ譁ｭ縺輔ｌ縺滓ｧ矩縺ｮ陬懷ｮ・
 */

/**
 * OpenAI API縺九ｉ縺ｮ繝ｬ繧ｹ繝昴Φ繧ｹ縺九ｉ繝槭・繧ｯ繝繧ｦ繝ｳ縺ｮ陬・｣ｾ繧貞炎髯､縺励※縲∵怏蜉ｹ縺ｪJSON繧呈歓蜃ｺ縺吶ｋ
 * @param response OpenAI API縺九ｉ縺ｮ繝ｬ繧ｹ繝昴Φ繧ｹ譁・ｭ怜・
 * @returns 蜃ｦ逅・ｸ医∩縺ｮ譛牙柑縺ｪJSON譁・ｭ怜・
 */
export function cleanJsonResponse(response: string): string {
    if (!response) return '';
    
    console.log('逕溘・繝ｬ繧ｹ繝昴Φ繧ｹ (荳驛ｨ):', response.substring(0, 100) + '...');
    
    // 繝槭・繧ｯ繝繧ｦ繝ｳ縺ｮ繧ｳ繝ｼ繝峨ヶ繝ｭ繝・け險俶ｳ輔ｒ蜑企勁
    let cleanedResponse = response
        .replace(/```json\s*/g, '') // 縺吶∋縺ｦ縺ｮ```json
        .replace(/```\s*/g, '') // 縺吶∋縺ｦ縺ｮ```
        .replace(/```/g, '') // 縺吶∋縺ｦ縺ｮ```・磯哩縺倥ｋ逕ｨ・・
        .trim();
    
    // 蜈磯ｭ縺ｨ譛ｫ蟆ｾ縺ｮ菴吝・縺ｪ譁・ｭ怜・繧貞炎髯､・井ｾ・ "JSON繝・・繧ｿ縺ｯ莉･荳九・騾壹ｊ縺ｧ縺呻ｼ・縺ｪ縺ｩ縺ｮ隱ｬ譏取枚・・
    cleanedResponse = cleanedResponse.replace(/^[^{[]*([{[])/, '$1');
    cleanedResponse = cleanedResponse.replace(/([}\]])[^}\]]*$/, '$1');
    
    console.log('繧ｯ繝ｪ繝ｼ繝九Φ繧ｰ蠕後・繝ｬ繧ｹ繝昴Φ繧ｹ (荳驛ｨ):', cleanedResponse.substring(0, 100) + '...');
    
    // 霑ｽ蜉縺ｮ讀懆ｨｼ
    try {
        // 隧ｦ縺励↓繝代・繧ｹ縺励※讀懆ｨｼ
        JSON.parse(cleanedResponse);
        console.log("JSON繝輔か繝ｼ繝槭ャ繝医・讀懆ｨｼ: 譛牙柑");
        return cleanedResponse;
    } catch (error: any) {
        console.error("JSON繝輔か繝ｼ繝槭ャ繝医・讀懆ｨｼ: 螟ｱ謨・, error.message);
        
        // 繧ｨ繝ｩ繝ｼ縺ｮ菴咲ｽｮ繧堤音螳壹＠縺ｦ隧ｳ邏ｰ縺ｫ菫ｮ蠕ｩ
        const posMatch = error.message.match(/position\s+(\d+)/i);
        const errorPosition = posMatch ? parseInt(posMatch[1], 10) : -1;
        
        if (errorPosition >= 0) {
            console.log(`繧ｨ繝ｩ繝ｼ菴咲ｽｮ: ${errorPosition}`);
            const contextStart = Math.max(0, errorPosition - 30);
            const contextEnd = Math.min(cleanedResponse.length, errorPosition + 30);
            console.log(`蝠城｡後・縺ゅｋ邂・園: "${cleanedResponse.substring(contextStart, errorPosition)}<<<HERE>>>${cleanedResponse.substring(errorPosition, contextEnd)}"`);
            
            // 讒矩蛻・梵縺ｨ菫ｮ蠕ｩ
            cleanedResponse = repairJsonAtPosition(cleanedResponse, errorPosition);
        }
        
        // 蝓ｺ譛ｬ逧・↑讒区枚菫ｮ蠕ｩ・亥燕霑ｰ縺ｮ菴咲ｽｮ繝吶・繧ｹ菫ｮ蠕ｩ縺悟､ｱ謨励＠縺溷ｴ蜷医・繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ・・
        cleanedResponse = cleanedResponse
            // 繧ｳ繝ｳ繝槭・蠕後ｍ縺碁哩縺倥き繝・さ縺ｮ蝣ｴ蜷医∽ｽ吝・縺ｪ繧ｳ繝ｳ繝槭ｒ蜑企勁
            .replace(/,\s*([}\]])/g, '$1')
            // 螻樊ｧ縺ｨ蛟､縺ｮ髢薙・縲・縲阪・蜑榊ｾ後↓遨ｺ逋ｽ縺後↑縺・ｴ蜷医↓霑ｽ蜉
            .replace(/([^"'\s]):/g, '$1: ')
            .replace(/:([^"'\s\[\{])/g, ': $1');
        
        // 荳崎ｶｳ縺励※縺・ｋ蜿ｯ閭ｽ諤ｧ縺ｮ縺ゅｋ髢峨§繧ｫ繝・さ繧定ｿｽ蜉
        const openBraces = (cleanedResponse.match(/\{/g) || []).length;
        const closeBraces = (cleanedResponse.match(/\}/g) || []).length;
        if (openBraces > closeBraces) {
            const diff = openBraces - closeBraces;
            cleanedResponse = cleanedResponse + '}'.repeat(diff);
            console.log(`髢峨§繧ｫ繝・さ繧・{diff}蛟玖ｿｽ蜉縺励∪縺励◆`);
        }
        
        const openBrackets = (cleanedResponse.match(/\[/g) || []).length;
        const closeBrackets = (cleanedResponse.match(/\]/g) || []).length;
        if (openBrackets > closeBrackets) {
            const diff = openBrackets - closeBrackets;
            cleanedResponse = cleanedResponse + ']'.repeat(diff);
            console.log(`髢峨§隗偵き繝・さ繧・{diff}蛟玖ｿｽ蜉縺励∪縺励◆`);
        }
        
        // 菫ｮ蠕ｩ縺輔ｌ縺櫟SON繧呈､懆ｨｼ
        try {
            JSON.parse(cleanedResponse);
            console.log("JSON繝輔か繝ｼ繝槭ャ繝医・菫ｮ蠕ｩ: 謌仙粥");
        } catch (repairError: any) {
            console.error("JSON繝輔か繝ｼ繝槭ャ繝医・菫ｮ蠕ｩ: 螟ｱ謨・, repairError.message);
            
            // 譛邨よ焔谿ｵ: 驛ｨ蛻・噪縺ｫ豁｣縺励＞JSON縺ｮ縺ｿ繧呈歓蜃ｺ
            try {
                const result = extractValidJsonPart(cleanedResponse);
                if (result && result.length > cleanedResponse.length / 2) { // 蜈・・JSON縺ｮ蜊雁・莉･荳翫ｒ謚ｽ蜃ｺ縺ｧ縺阪◆蝣ｴ蜷・
                    cleanedResponse = result;
                    console.log("驛ｨ蛻・噪縺ｪJSON謚ｽ蜃ｺ: 謌仙粥");
                } else {
                    console.error("驛ｨ蛻・噪縺ｪJSON謚ｽ蜃ｺ: 螟ｱ謨・- 譛牙柑縺ｪ驛ｨ蛻・′蟆代↑縺吶℃縺ｾ縺・);
                }
            } catch (extractError) {
                console.error("驛ｨ蛻・噪縺ｪJSON謚ｽ蜃ｺ: 螟ｱ謨・, extractError);
            }
        }
    }
    
    return cleanedResponse;
}

/**
 * 迚ｹ螳壹・菴咲ｽｮ縺ｧJSON繧剃ｿｮ蠕ｩ縺吶ｋ
 * @param json 菫ｮ蠕ｩ縺吶ｋJSON譁・ｭ怜・
 * @param errorPosition 繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺滉ｽ咲ｽｮ
 * @returns 菫ｮ蠕ｩ縺輔ｌ縺櫟SON譁・ｭ怜・
 */
function repairJsonAtPosition(json: string, errorPosition: number): string {
    // 繧ｨ繝ｩ繝ｼ邂・園縺ｮ蜻ｨ霎ｺ繧呈､懈渊
    const beforeError = json.substring(0, errorPosition);
    const afterError = json.substring(errorPosition);
    
    // 繧ｱ繝ｼ繧ｹ1: 驟榊・蜀・・荳埼←蛻・↑隕∫ｴ蛹ｺ蛻・ｊ (萓・ [1, 2 3] -> [1, 2, 3])
    if (afterError.trim().startsWith('}') && beforeError.lastIndexOf('[') > beforeError.lastIndexOf('{')) {
        const fixedJson = beforeError + ',' + afterError;
        console.log("驟榊・隕∫ｴ縺ｮ蛹ｺ蛻・ｊ繧ｳ繝ｳ繝槭ｒ霑ｽ蜉縺励∪縺励◆");
        return fixedJson;
    }
    
    // 繧ｱ繝ｼ繧ｹ2: 荳榊ｮ悟・縺ｪ驟榊・繧・ｸｭ譁ｭ縺輔ｌ縺滓ｧ矩縺ｮ讀懷・
    const lastArrayStart = beforeError.lastIndexOf('[');
    const lastObjectStart = beforeError.lastIndexOf('{');
    if (lastArrayStart > lastObjectStart) {
        // 驟榊・蜀・〒蝠城｡後′逋ｺ逕・
        if (afterError.trim().startsWith(']')) {
            // 荳榊ｮ悟・縺ｪ譛蠕後・隕∫ｴ繧貞炎髯､
            const lastComma = beforeError.lastIndexOf(',');
            if (lastComma > lastArrayStart) {
                const fixedJson = beforeError.substring(0, lastComma) + afterError;
                console.log("驟榊・縺ｮ荳榊ｮ悟・縺ｪ譛蠕後・隕∫ｴ繧貞炎髯､縺励∪縺励◆");
                return fixedJson;
            }
        }
    }
    
    // 繧ｱ繝ｼ繧ｹ3: 驟榊・蜀・・繧ｨ繝ｩ繝ｼ繧剃ｿｮ豁｣ (譛繧ゆｸ闊ｬ逧・↑繧ｱ繝ｼ繧ｹ)
    // 驟榊・蜀・・髢峨§繧峨ｌ縺ｦ縺・↑縺・ｦ∫ｴ繧堤音螳壹＠縺ｦ菫ｮ豁｣
    const balanceInfo = analyzeJsonBalance(beforeError);
    if (balanceInfo.bracketCount > 0 && balanceInfo.lastArrayDelimiter > 0) {
        // 驟榊・蜀・・繧ｨ繝ｩ繝ｼ縺ｨ謗ｨ螳壹＆繧後ｋ蝣ｴ蜷医∵怙蠕後・譛牙柑縺ｪ蛹ｺ蛻・ｊ菴咲ｽｮ縺ｧ蛻・ｊ謐ｨ縺ｦ
        const validPart = beforeError.substring(0, balanceInfo.lastArrayDelimiter + 1);
        const remainingBrackets = balanceInfo.bracketCount;
        // 髢峨§諡ｬ蠑ｧ繧定ｿｽ蜉
        const fixedJson = validPart + ']'.repeat(remainingBrackets) +
            '}'.repeat(balanceInfo.braceCount);
        console.log("荳榊ｮ悟・縺ｪ驟榊・隕∫ｴ繧剃ｿｮ豁｣縺励∪縺励◆");
        return fixedJson;
    }
    
    // 隧ｳ邏ｰ縺ｪ菫ｮ蠕ｩ縺御ｸ榊庄閭ｽ縺ｪ蝣ｴ蜷医∝・縺ｮJSON繧定ｿ斐☆
    return json;
}

/**
 * JSON譁・ｭ怜・縺ｮ諡ｬ蠑ｧ繝舌Λ繝ｳ繧ｹ繧貞・譫・
 */
function analyzeJsonBalance(json: string) {
    let braceBalance = 0; // { 縺ｨ } 縺ｮ繝舌Λ繝ｳ繧ｹ
    let bracketBalance = 0; // [ 縺ｨ ] 縺ｮ繝舌Λ繝ｳ繧ｹ
    let lastValidComma = -1;
    
    for (let i = 0; i < json.length; i++) {
        const char = json[i];
        if (char === '{') braceBalance++;
        else if (char === '}') braceBalance--;
        else if (char === '[') bracketBalance++;
        else if (char === ']') bracketBalance--;
        else if (char === ',' && bracketBalance > 0) {
            // 驟榊・蜀・・繧ｫ繝ｳ繝槭・菴咲ｽｮ繧定ｨ倬鹸
            lastValidComma = i;
        }
    }
    
    return {
        braceCount: braceBalance,
        bracketCount: bracketBalance,
        lastArrayDelimiter: lastValidComma
    };
}

/**
 * 譁・ｭ怜・縺九ｉ譛牙柑縺ｪJSON驛ｨ蛻・ｒ謚ｽ蜃ｺ縺吶ｋ
 */
function extractValidJsonPart(text: string): string {
    // 螟門・縺ｮJSON讒矩繧呈､懃ｴ｢ ({...} 縺ｾ縺溘・ [...])
    const objectMatch = text.match(/\{(?:[^{}]|(?:\{[^{}]*\}))*\}/);
    const arrayMatch = text.match(/\[(?:[^\[\]]|(?:\[[^\[\]]*\]))*\]/);
    let result = '';
    
    if (objectMatch && objectMatch[0]) {
        result = objectMatch[0];
    } else if (arrayMatch && arrayMatch[0]) {
        result = arrayMatch[0];
    }
    
    // 謚ｽ蜃ｺ縺輔ｌ縺滄Κ蛻・′譛牙柑縺ｪJSON縺狗｢ｺ隱・
    try {
        if (result) {
            JSON.parse(result);
            return result;
        }
    } catch (e) {
        // 謚ｽ蜃ｺ縺輔ｌ縺滄Κ蛻・′譛牙柑縺ｪJSON縺ｧ縺ｪ縺・ｴ蜷医・遨ｺ譁・ｭ怜・繧定ｿ斐☆
    }
    
    return '';
}
