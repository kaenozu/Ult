/**
 * Trading Store - Unified store for trading platform
 * 
 * This file provides a unified interface for all trading-related stores.
 * It re-exports all store hooks and types for convenient access.
 */

// Re-export all stores from index
export {
  useThemeStore,
  useWatchlistStore,
  usePortfolioStore,
  useOrderExecutionStore,
  useJournalStore,
  useUIStore,
  useAIStore,
} from './index';

// Re-export types from orderExecutionStore
export type {
  OrderExecutionResult,
  OrderErrorCode,
  OrderExecutionOptions,
} from './orderExecutionStore';

// Legacy compatibility: export useTradingStore as default
export { useTradingStore as default } from './index';
