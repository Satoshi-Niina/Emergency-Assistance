export function fixJsonString(jsonString: string): string {
    try {
        // 基本的なJSON修正
        let fixed = jsonString.trim();
        
        // 末尾のカンマを削除
        fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
        
        // 未終了の文字列を修正
        fixed = fixed.replace(/"([^"]*)$/, '"$1"');
        
        // 未終了のオブジェクトを修正
        if (fixed.includes('{') && !fixed.includes('}')) {
            fixed += '}';
        }
        
        // 未終了の配列を修正
        if (fixed.includes('[') && !fixed.includes(']')) {
            fixed += ']';
        }
        
        // JSONとして解析可能かテスト
        JSON.parse(fixed);
        
        return fixed;
    } catch (error) {
        console.error('JSON修正エラー:', error);
        return jsonString;
    }
}

export function safeJsonParse(jsonString: string): any {
    try {
        const fixed = fixJsonString(jsonString);
        return JSON.parse(fixed);
    } catch (error) {
        console.error('JSON解析エラー:', error);
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