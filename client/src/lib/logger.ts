
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

// ログレベル設定
const level = 'info'; // デフォルトログレベル（VITE_LOG_LEVELの参照を削除）

/**
 * デバッグレベルのログ出力
 */
export const logDebug = (...args: any[]): void => {
  if (level === 'debug') {
    console.log('[DEBUG]', ...args);
  }
};

/**
 * 情報レベルのログ出力
 */
export const logInfo = (...args: any[]): void => {
  if (level === 'info') {
    console.log('[INFO]', ...args);
  }
};

/**
 * 警告レベルのログ出力
 */
export const logWarn = (...args: any[]): void => {
  if (level === 'warn') {
    console.warn('[WARN]', ...args);
  }
};

/**
 * エラーレベルのログ出力
 */
export const logError = (...args: any[]): void => {
  if (level === 'error') {
    console.error('[ERROR]', ...args);
  }
};
