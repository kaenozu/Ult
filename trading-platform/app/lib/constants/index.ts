/**
 * Centralized Constants Export
 * 
 * This file provides a single entry point for all application constants.
 * Constants are organized by category in separate files for better maintainability.
 * 
 * Usage:
 * ```typescript
 * // Import from specific category (recommended)
 * import { RSI_CONFIG } from '@/app/lib/constants/technical-indicators';
 * 
 * // Import from main index (backward compatible)
 * import { RSI_CONFIG } from '@/app/lib/constants';
 * ```
 */

// Re-export all constants for backward compatibility
export * from './prediction';
export * from './technical-indicators';
export * from './risk-management';
export * from './chart';
export * from './api';
export * from './ui';
export * from './backtest';
export * from './trading';
export * from './common';
export * from './intervals';
