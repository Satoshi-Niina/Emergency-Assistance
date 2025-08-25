/**
 * 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｨ繝ｩ繝ｼ繧偵Θ繝ｼ繧ｶ繝ｼ繝輔Ξ繝ｳ繝峨Μ繝ｼ縺ｪ繝｡繝・そ繝ｼ繧ｸ縺ｫ螟画鋤
 */
export function formatValidationError(error: any): string {
    return error.errors.map((err: any) => err.message).join(', ');
}
/**
 * API繝ｬ繧ｹ繝昴Φ繧ｹ縺ｮ謌仙粥繝ｬ繧ｹ繝昴Φ繧ｹ繧剃ｽ懈・
 */
export function createSuccessResponse(data: any, message: any): any {
    return {
        success: true,
        data,
        message
    };
}
/**
 * API繝ｬ繧ｹ繝昴Φ繧ｹ縺ｮ繧ｨ繝ｩ繝ｼ繝ｬ繧ｹ繝昴Φ繧ｹ繧剃ｽ懈・
 */
export function createErrorResponse(error: any, data: any): any {
    return {
        success: false,
        error,
        data
    };
}
/**
 * 讀懃ｴ｢邨先棡繧剃ｽ懈・
 */
export function createSearchResult(items: any, total: any, page: any, limit: any): any {
    return {
        items,
        total,
        page,
        limit,
        hasMore: page * limit < total
    };
}
/**
 * 繝輔ぃ繧､繝ｫ繧ｵ繧､繧ｺ繧剃ｺｺ髢薙′隱ｭ縺ｿ繧・☆縺・ｽ｢蠑上↓螟画鋤
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}
/**
 * 譌･莉倥ｒ繝輔か繝ｼ繝槭ャ繝・
 */
export function formatDate(date: any, format: any = 'short') {
    const d: any = typeof date === 'string' ? new Date(date) : date;
    switch (format) {
        case 'long':
            return d.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        case 'iso':
            return d.toISOString();
        default:
            return d.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
    }
}
/**
 * 譁・ｭ怜・繧貞ｮ牙・縺ｫ蛻・ｊ隧ｰ繧√ｋ
 */
export function truncateString(str: any, maxLength: any, suffix: any = '...') {
    if (str.length <= maxLength)
        return str;
    return str.substring(0, maxLength - suffix.length) + suffix;
}
/**
 * UUID繧堤函謌・
 */
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r: any = Math.random() * 16 | 0;
        const v: any = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
/**
 * 繝輔ぃ繧､繝ｫ諡｡蠑ｵ蟄舌ｒ蜿門ｾ・
 */
export function getFileExtension(filename: string): string {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}
/**
 * MIME繧ｿ繧､繝励°繧峨ヵ繧｡繧､繝ｫ繧ｿ繧､繝励ｒ蛻､螳・
 */
export function getFileTypeFromMime(mimeType: string): string {
    if (mimeType.startsWith('image/'))
        return 'image';
    if (mimeType.startsWith('video/'))
        return 'video';
    if (mimeType.startsWith('audio/'))
        return 'audio';
    return 'document';
}
/**
 * 繝輔ぃ繧､繝ｫ縺檎判蜒上°縺ｩ縺・°繧貞愛螳・
 */
export function isImageFile(filename: string): boolean {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const ext: string = getFileExtension(filename).toLowerCase();
    return imageExtensions.includes(ext);
}
/**
 * 繝代せ繝ｯ繝ｼ繝峨・蠑ｷ蠎ｦ繧偵メ繧ｧ繝・け
 */
export function validatePasswordStrength(password: string): { isValid: boolean, score: number, feedback: string[] } {
    const feedback: string[] = [];
    let score = 0;
    if (password.length >= 8)
        score += 1;
    else
        feedback.push('繝代せ繝ｯ繝ｼ繝峨・8譁・ｭ嶺ｻ･荳翫〒縺ゅｋ蠢・ｦ√′縺ゅｊ縺ｾ縺・);
    if (/[a-z]/.test(password))
        score += 1;
    else
        feedback.push('蟆乗枚蟄励ｒ蜷ｫ繧√ｋ蠢・ｦ√′縺ゅｊ縺ｾ縺・);
    if (/[A-Z]/.test(password))
        score += 1;
    else
        feedback.push('螟ｧ譁・ｭ励ｒ蜷ｫ繧√ｋ蠢・ｦ√′縺ゅｊ縺ｾ縺・);
    if (/[0-9]/.test(password))
        score += 1;
    else
        feedback.push('謨ｰ蟄励ｒ蜷ｫ繧√ｋ蠢・ｦ√′縺ゅｊ縺ｾ縺・);
    if (/[^A-Za-z0-9]/.test(password))
        score += 1;
    else
        feedback.push('迚ｹ谿頑枚蟄励ｒ蜷ｫ繧√ｋ縺薙→繧呈耳螂ｨ縺励∪縺・);
    return {
        isValid: score >= 3,
        score,
        feedback
    };
}
/**
 * 迺ｰ蠅・､画焚縺九ｉ繧ｷ繧ｹ繝・Β險ｭ螳壹ｒ蜿門ｾ・
 */
export function getSystemConfig() {
    // Node.js迺ｰ蠅・〒縺ｮ縺ｿprocess.env縺ｫ繧｢繧ｯ繧ｻ繧ｹ
    const isNode = typeof process !== 'undefined' && process.env;
    
    return {
        version: isNode ? (process.env.VERSION || '1.0.0') : '1.0.0',
        environment: isNode ? (process.env.NODE_ENV || 'development') : 'development',
        features: {
            chat: true,
            emergencyGuide: true,
            troubleshooting: true,
            knowledgeBase: true,
            voiceAssistant: isNode ? (process.env.ENABLE_VOICE_ASSISTANT === 'true') : false
        },
        limits: {
            maxFileSize: isNode ? parseInt(process.env.MAX_FILE_SIZE || '10485760') : 10485760, // 10MB
            maxUploadFiles: isNode ? parseInt(process.env.MAX_UPLOAD_FILES || '5') : 5,
            maxChatHistory: isNode ? parseInt(process.env.MAX_CHAT_HISTORY || '100') : 100
        }
    };
}
/**
 * 繝・ヰ繧ｦ繝ｳ繧ｹ髢｢謨ｰ
 */
export function debounce(func: (...args: any[]) => void, wait: number): (...args: any[]) => void {
    let timeout: any;
    return (...args: any[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
/**
 * 繧ｹ繝ｭ繝・ヨ繝ｫ髢｢謨ｰ
 */
export function throttle(func: (...args: any[]) => void, limit: number): (...args: any[]) => void {
    let inThrottle: any;
    return (...args: any[]) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
/**
 * 豺ｱ縺・が繝悶ず繧ｧ繧ｯ繝医・豈碑ｼ・
 */
export function deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2)
        return true;
    if (obj1 == null || obj2 == null)
        return false;
    if (typeof obj1 !== typeof obj2)
        return false;
    if (typeof obj1 !== 'object')
        return false;
    const keys1: string[] = Object.keys(obj1);
    const keys2: string[] = Object.keys(obj2);
    if (keys1.length !== keys2.length)
        return false;
    for (const key of keys1) {
        if (!keys2.includes(key))
            return false;
        if (!deepEqual(obj1[key], obj2[key]))
            return false;
    }
    return true;
}
/**
 * 繧ｪ繝悶ず繧ｧ繧ｯ繝医・豺ｱ縺・さ繝斐・
 */
export function deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object')
        return obj;
    if (obj instanceof Date)
        return new Date(obj.getTime());
    if (obj instanceof Array)
        return obj.map((item: any) => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj: { [key: string]: any } = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
    return obj;
}
/**
 * 驟榊・繧呈欠螳壹＆繧後◆繧ｵ繧､繧ｺ縺ｮ繝√Ε繝ｳ繧ｯ縺ｫ蛻・牡
 */
export function chunkArray(array: any[], size: number): any[][] {
    const chunks: any[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
/**
 * 驟榊・縺九ｉ驥崎､・ｒ髯､蜴ｻ
 */
export function removeDuplicates(array: any[], key?: string): any[] {
    if (key) {
        const seen: Set<any> = new Set();
        return array.filter((item: any) => {
            const value: any = item[key];
            if (seen.has(value))
                return false;
            seen.add(value);
            return true;
        });
    }
    return [...new Set(array)];
}
/**
 * 髱槫酔譛溷・逅・・繝ｪ繝医Λ繧､讖溯・
 */
export async function retry(fn: any, maxAttempts: number = 3, delay: number = 1000) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (attempt === maxAttempts)
                break;
            await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
    }
    throw lastError;
}


