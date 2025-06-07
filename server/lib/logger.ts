
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

// 環境変数からログレベルを取得（デフォルトはERROR）
const getLogLevel = (): LogLevel => {
  const level = process.env.LOG_LEVEL?.toUpperCase();
  switch (level) {
    case 'DEBUG': return LogLevel.DEBUG;
    case 'INFO': return LogLevel.INFO;
    case 'WARN': return LogLevel.WARN;
    case 'ERROR': return LogLevel.ERROR;
    default: return LogLevel.ERROR; // 本番環境ではERRORのみ
  }
};

const currentLogLevel = getLogLevel();

/**
 * デバッグレベルのログ出力
 */
export const logDebug = (...args: any[]): void => {
  if (currentLogLevel >= LogLevel.DEBUG) {
    console.log('[DEBUG]', ...args);
  }
};

/**
 * 情報レベルのログ出力
 */
export const logInfo = (...args: any[]): void => {
  if (currentLogLevel >= LogLevel.INFO) {
    console.log('[INFO]', ...args);
  }
};

/**
 * 警告レベルのログ出力
 */
export const logWarn = (...args: any[]): void => {
  if (currentLogLevel >= LogLevel.WARN) {
    console.warn('[WARN]', ...args);
  }
};

/**
 * エラーレベルのログ出力
 */
export const logError = (...args: any[]): void => {
  if (currentLogLevel >= LogLevel.ERROR) {
    console.error('[ERROR]', ...args);
  }
};

/**
 * ログレベルの設定状況を表示
 */
export const showLogConfig = (): void => {
  const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
  logInfo(`ログレベル設定: ${levelNames[currentLogLevel]}`);
};
