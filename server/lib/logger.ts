enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

// 環境変数からログレベルを取得（デフォルトはERROR）
const getLogLevel = (): LogLevel => {
  const level = process.env.LOG_LEVEL?.toUpperCase();
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (!isDevelopment) {
    return LogLevel.ERROR; // 本番環境では常にERRORのみ
  }

  switch (level) {
    case 'DEBUG':
      return LogLevel.DEBUG;
    case 'INFO':
      return LogLevel.INFO;
    case 'WARN':
      return LogLevel.WARN;
    case 'ERROR':
      return LogLevel.ERROR;
    default:
      return LogLevel.WARN; // 開発環境のデフォルトはWARN（重要な情報のみ表示）
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
  if (process.env.NODE_ENV === 'development') {
    const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
    logInfo(`ログレベル設定: ${levelNames[currentLogLevel]}`);
  }
};

/**
 * セキュリティ関連の情報をマスクする関数
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
 * セキュリティを考慮したログ出力関数
 */
export const logSecure = (
  level: 'debug' | 'info' | 'warn' | 'error',
  ...args: any[]
): void => {
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
