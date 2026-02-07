import { useTradingStore } from './tradingStore';
import { OrderRequest, OrderResult } from '../types/order';

// Re-export specific selectors or the whole store for execution
export const useOrderExecutionStore = useTradingStore;

// Re-export specific functions for type safety
export const useExecuteOrder = (): ((order: OrderRequest) => OrderResult) => {
  return useTradingStore((state) => state.executeOrder);
};

/** @deprecated Use useExecuteOrder instead */
export const useExecuteOrderAtomicV2 = useExecuteOrder;
