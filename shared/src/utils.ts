/**
 * バリデーションエラーをユーザーフレンドリーなメッセージに変換
 */
export function formatValidationError(error: any): string {
    return error.errors.map((err: any) => err.message).join(', ');
}
/**
 * APIレスポンスの成功レスポンスを作成
 */
export function createSuccessResponse(data: any, message: any): any {
    return {
        success: true,
        data,
        message
    };
}
/**
 * APIレスポンスのエラーレスポンスを作成
 */
export function createErrorResponse(error: any, data: any): any {
    return {
        success: false,
        error,
        data
    };
}
/**
 * 検索結果を作成
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
 * ファイルサイズを人間が読みやすい形式に変換
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}
/**
 * 日付をフォーマット
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
 * 文字列を安全に切り詰める
 */
export function truncateString(str: any, maxLength: any, suffix: any = '...') {
    if (str.length <= maxLength)
        return str;
    return str.substring(0, maxLength - suffix.length) + suffix;
}
/**
 * UUIDを生成
 */
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r: any = Math.random() * 16 | 0;
        const v: any = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
/**
 * ファイル拡張子を取得
 */
export function getFileExtension(filename: string): string {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}
/**
 * MIMEタイプからファイルタイプを判定
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
 * ファイルが画像かどうかを判定
 */
export function isImageFile(filename: string): boolean {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const ext: string = getFileExtension(filename).toLowerCase();
    return imageExtensions.includes(ext);
}
/**
 * パスワードの強度をチェック
 */
export function validatePasswordStrength(password: string): { isValid: boolean, score: number, feedback: string[] } {
    const feedback: string[] = [];
    let score = 0;
    if (password.length >= 8)
        score += 1;
    else
        feedback.push('パスワードは8文字以上である必要があります');
    if (/[a-z]/.test(password))
        score += 1;
    else
        feedback.push('小文字を含める必要があります');
    if (/[A-Z]/.test(password))
        score += 1;
    else
        feedback.push('大文字を含める必要があります');
    if (/[0-9]/.test(password))
        score += 1;
    else
        feedback.push('数字を含める必要があります');
    if (/[^A-Za-z0-9]/.test(password))
        score += 1;
    else
        feedback.push('特殊文字を含めることを推奨します');
    return {
        isValid: score >= 3,
        score,
        feedback
    };
}
/**
 * 環境変数からシステム設定を取得
 */
export function getSystemConfig() {
    return {
        version: process.env.VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        features: {
            chat: true,
            emergencyGuide: true,
            troubleshooting: true,
            knowledgeBase: true,
            voiceAssistant: process.env.ENABLE_VOICE_ASSISTANT === 'true'
        },
        limits: {
            maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
            maxUploadFiles: parseInt(process.env.MAX_UPLOAD_FILES || '5'),
            maxChatHistory: parseInt(process.env.MAX_CHAT_HISTORY || '100')
        }
    };
}
/**
 * デバウンス関数
 */
export function debounce(func: (...args: any[]) => void, wait: number): (...args: any[]) => void {
    let timeout: any;
    return (...args: any[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
/**
 * スロットル関数
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
 * 深いオブジェクトの比較
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
 * オブジェクトの深いコピー
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
 * 配列を指定されたサイズのチャンクに分割
 */
export function chunkArray(array: any[], size: number): any[][] {
    const chunks: any[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
/**
 * 配列から重複を除去
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
 * 非同期処理のリトライ機能
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
