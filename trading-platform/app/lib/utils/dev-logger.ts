/**
 * Development Logger Utility
 * 
 * @deprecated This file is deprecated. Import from '@/app/lib/utils/logger' instead.
 * This file re-exports from the centralized logger for backward compatibility.
 * 
 * Simple helper functions for development-only logging.
 * These functions only log in development mode (NODE_ENV !== 'production').
 * 
 * Usage:
 * ```typescript
 * import { devLog, devWarn, devError } from '@/app/lib/utils/logger'; // Preferred
 * // OR (deprecated, but still works)
 * import { devLog, devWarn, devError } from '@/app/lib/utils/dev-logger';
 * 
 * devLog('Debug message', data);
 * devWarn('Warning message', context);
 * devError('Error occurred', error);
 * ```
 */

// Re-export from centralized logger to maintain backward compatibility
export { isDev, devLog, devWarn, devError, devDebug } from './logger';

/**
 * Log an info message in development mode
 * @deprecated Use devLog instead for consistency with the centralized logger
 */
export const devInfo = (...args: unknown[]): void => {
  if (process.env.NODE_ENV !== 'production') {
    console.info(...args);
  }
};
