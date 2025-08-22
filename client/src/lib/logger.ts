
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

// ログレベル設宁E
const level = 'info'; // チE��ォルトログレベル�E�EITE_LOG_LEVELの参�Eを削除�E�E

/**
 * チE��チE��レベルのログ出劁E
 */
export const logDebug = (...args: any[]): void => {
  if (level === 'debug') {
    console.log('[DEBUG]', ...args);
  }
};

/**
 * 惁E��レベルのログ出劁E
 */
export const logInfo = (...args: any[]): void => {
  if (level === 'info') {
    console.log('[INFO]', ...args);
  }
};

/**
 * 警告レベルのログ出劁E
 */
export const logWarn = (...args: any[]): void => {
  if (level === 'warn') {
    console.warn('[WARN]', ...args);
  }
};

/**
 * エラーレベルのログ出劁E
 */
export const logError = (...args: any[]): void => {
  if (level === 'error') {
    console.error('[ERROR]', ...args);
  }
};
