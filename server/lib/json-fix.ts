export function fixJsonString(jsonString: string): string {
    try {
        // 蝓ｺ譛ｬ逧・↑JSON菫ｮ豁｣
        let fixed = jsonString.trim();
        
        // 譛ｫ蟆ｾ縺ｮ繧ｫ繝ｳ繝槭ｒ蜑企勁
        fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
        
        // 譛ｪ邨ゆｺ・・譁・ｭ怜・繧剃ｿｮ豁｣
        fixed = fixed.replace(/"([^"]*)$/, '"$1"');
        
        // 譛ｪ邨ゆｺ・・繧ｪ繝悶ず繧ｧ繧ｯ繝医ｒ菫ｮ豁｣
        if (fixed.includes('{') && !fixed.includes('}')) {
            fixed += '}';
        }
        
        // 譛ｪ邨ゆｺ・・驟榊・繧剃ｿｮ豁｣
        if (fixed.includes('[') && !fixed.includes(']')) {
            fixed += ']';
        }
        
        // JSON縺ｨ縺励※隗｣譫仙庄閭ｽ縺九ユ繧ｹ繝・
        JSON.parse(fixed);
        
        return fixed;
    } catch (error) {
        console.error('JSON菫ｮ豁｣繧ｨ繝ｩ繝ｼ:', error);
        return jsonString;
    }
}

export function safeJsonParse(jsonString: string): any {
    try {
        const fixed = fixJsonString(jsonString);
        return JSON.parse(fixed);
    } catch (error) {
        console.error('JSON隗｣譫舌お繝ｩ繝ｼ:', error);
        return null;
    }
}

export function validateJson(jsonString: string): boolean {
    try {
        JSON.parse(jsonString);
        return true;
    } catch (error) {
        return false;
    }
} 