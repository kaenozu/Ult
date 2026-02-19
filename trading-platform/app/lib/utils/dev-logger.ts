/**
 * Development Logger Utility
 * 
 * Simple helper functions for development-only logging.
 * These functions only log in development mode (NODE_ENV !== 'production').
 * 
 * Usage:
 * ```typescript
 * import { devLog, devWarn, devError } from '@/app/lib/utils/dev-logger';
 * 
 * devLog('Debug message', data);
 * devWarn('Warning message', context);
 * devError('Error occurred', error);
 * ```
 */

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Log a debug message in development mode
 */
export const devLog = (...args: unknown[]): void => {
  if (isDev) {
    console.log(...args);
  }
};

/**
 * Log a warning message in development mode
 */
export const devWarn = (...args: unknown[]): void => {
  if (isDev) {
    console.warn(...args);
  }
};

/**
 * Log an error message in development mode
 */
export const devError = (...args: unknown[]): void => {
  if (isDev) {
    console.error(...args);
  }
};

/**
 * Log an info message in development mode
 */
export const devInfo = (...args: unknown[]): void => {
  if (isDev) {
    console.info(...args);
  }
};

/**
 * Log a debug message in development mode
 */
export const devDebug = (...args: unknown[]): void => {
  if (isDev) {
    console.debug(...args);
  }
};
