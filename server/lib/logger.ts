enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3
}

// 迺ｰ蠅・､画焚縺九ｉ繝ｭ繧ｰ繝ｬ繝吶Ν繧貞叙蠕暦ｼ医ョ繝輔か繝ｫ繝医・ERROR・・
const getLogLevel = (): LogLevel => {
    const level = process.env.LOG_LEVEL?.toUpperCase();
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!isDevelopment) {
        return LogLevel.ERROR; // 譛ｬ逡ｪ迺ｰ蠅・〒縺ｯ蟶ｸ縺ｫERROR縺ｮ縺ｿ
    }
    
    switch (level) {
        case 'DEBUG': return LogLevel.DEBUG;
        case 'INFO': return LogLevel.INFO;
        case 'WARN': return LogLevel.WARN;
        case 'ERROR': return LogLevel.ERROR;
        default: return LogLevel.WARN; // 髢狗匱迺ｰ蠅・・繝・ヵ繧ｩ繝ｫ繝医・WARN・磯㍾隕√↑諠・ｱ縺ｮ縺ｿ陦ｨ遉ｺ・・
    }
};

const currentLogLevel = getLogLevel();

/**
 * 繝・ヰ繝・げ繝ｬ繝吶Ν縺ｮ繝ｭ繧ｰ蜃ｺ蜉・
 */
export const logDebug = (...args: any[]): void => {
    if (currentLogLevel >= LogLevel.DEBUG) {
        console.log('[DEBUG]', ...args);
    }
};

/**
 * 諠・ｱ繝ｬ繝吶Ν縺ｮ繝ｭ繧ｰ蜃ｺ蜉・
 */
export const logInfo = (...args: any[]): void => {
    if (currentLogLevel >= LogLevel.INFO) {
        console.log('[INFO]', ...args);
    }
};

/**
 * 隴ｦ蜻翫Ξ繝吶Ν縺ｮ繝ｭ繧ｰ蜃ｺ蜉・
 */
export const logWarn = (...args: any[]): void => {
    if (currentLogLevel >= LogLevel.WARN) {
        console.warn('[WARN]', ...args);
    }
};

/**
 * 繧ｨ繝ｩ繝ｼ繝ｬ繝吶Ν縺ｮ繝ｭ繧ｰ蜃ｺ蜉・
 */
export const logError = (...args: any[]): void => {
    if (currentLogLevel >= LogLevel.ERROR) {
        console.error('[ERROR]', ...args);
    }
};

/**
 * 繝ｭ繧ｰ繝ｬ繝吶Ν縺ｮ險ｭ螳夂憾豕√ｒ陦ｨ遉ｺ
 */
export const showLogConfig = (): void => {
    if (process.env.NODE_ENV === 'development') {
        const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
        logInfo(`繝ｭ繧ｰ繝ｬ繝吶Ν險ｭ螳・ ${levelNames[currentLogLevel]}`);
    }
};

/**
 * 繧ｻ繧ｭ繝･繝ｪ繝・ぅ髢｢騾｣縺ｮ諠・ｱ繧偵・繧ｹ繧ｯ縺吶ｋ髢｢謨ｰ
 */
export const maskSensitiveInfo = (message: string): string => {
    if (process.env.NODE_ENV === 'production') {
        return message
            .replace(/password[=:]\s*[^\s,}]+/gi, 'password=***')
            .replace(/token[=:]\s*[^\s,}]+/gi, 'token=***')
            .replace(/key[=:]\s*[^\s,}]+/gi, 'key=***')
            .replace(/secret[=:]\s*[^\s,}]+/gi, 'secret=***')
            .replace(/api[_-]?key[=:]\s*[^\s,}]+/gi, 'api_key=***');
    }
    return message;
};

/**
 * 繧ｻ繧ｭ繝･繝ｪ繝・ぅ繧定・・縺励◆繝ｭ繧ｰ蜃ｺ蜉幃未謨ｰ
 */
export const logSecure = (level: 'debug' | 'info' | 'warn' | 'error', ...args: any[]): void => {
    const maskedArgs = args.map(arg => 
        typeof arg === 'string' ? maskSensitiveInfo(arg) : arg
    );
    
    switch (level) {
        case 'debug':
            logDebug(...maskedArgs);
            break;
        case 'info':
            logInfo(...maskedArgs);
            break;
        case 'warn':
            logWarn(...maskedArgs);
            break;
        case 'error':
            logError(...maskedArgs);
            break;
    }
};

export { LogLevel };
