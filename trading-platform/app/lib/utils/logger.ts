/**
 * Centralized Development Logger
 * 
 * 開発環境でのみ動作するロギングユーティリティ
 * 本番環境ではログ出力を抑制します
 */

export const isDev = process.env.NODE_ENV !== 'production';

/**
 * Development-only log
 * 開発環境でのみconsole.logを出力
 */
export const devLog = (...args: unknown[]): void => {
  if (isDev) {
    console.log(...args);
  }
};

/**
 * Development-only warning
 * 開発環境でのみconsole.warnを出力
 */
export const devWarn = (...args: unknown[]): void => {
  if (isDev) {
    console.warn(...args);
  }
};

/**
 * Development-only error
 * 開発環境でのみconsole.errorを出力
 */
export const devError = (...args: unknown[]): void => {
  if (isDev) {
    console.error(...args);
  }
};

/**
 * Development-only debug
 * 開発環境でのみconsole.debugを出力
 */
export const devDebug = (...args: unknown[]): void => {
  if (isDev) {
    console.debug(...args);
  }
};
