
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

// 繝ｭ繧ｰ繝ｬ繝吶Ν險ｭ螳・
const level = 'info'; // 繝・ヵ繧ｩ繝ｫ繝医Ο繧ｰ繝ｬ繝吶Ν・・ITE_LOG_LEVEL縺ｮ蜿ら・繧貞炎髯､・・

/**
 * 繝・ヰ繝・げ繝ｬ繝吶Ν縺ｮ繝ｭ繧ｰ蜃ｺ蜉・
 */
export const logDebug = (...args: any[]): void => {
  if (level === 'debug') {
    console.log('[DEBUG]', ...args);
  }
};

/**
 * 諠・ｱ繝ｬ繝吶Ν縺ｮ繝ｭ繧ｰ蜃ｺ蜉・
 */
export const logInfo = (...args: any[]): void => {
  if (level === 'info') {
    console.log('[INFO]', ...args);
  }
};

/**
 * 隴ｦ蜻翫Ξ繝吶Ν縺ｮ繝ｭ繧ｰ蜃ｺ蜉・
 */
export const logWarn = (...args: any[]): void => {
  if (level === 'warn') {
    console.warn('[WARN]', ...args);
  }
};

/**
 * 繧ｨ繝ｩ繝ｼ繝ｬ繝吶Ν縺ｮ繝ｭ繧ｰ蜃ｺ蜉・
 */
export const logError = (...args: any[]): void => {
  if (level === 'error') {
    console.error('[ERROR]', ...args);
  }
};
