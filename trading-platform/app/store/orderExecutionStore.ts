import { useTradingStore } from './tradingStore';
import { OrderRequest, OrderResult } from '../types/order';

// Re-export specific selectors or the whole store for execution
export const useOrderExecutionStore = useTradingStore;

// Re-export specific functions for type safety
export const useExecuteOrderAtomicV2 = (): ((order: OrderRequest) => OrderResult) => {
  return useTradingStore((state) => state.executeOrderAtomicV2);
};
