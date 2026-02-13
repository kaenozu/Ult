import { usePortfolioStore } from './portfolioStore';
import { OrderRequest, OrderResult } from '../types/order';

// Re-export specific selectors or the whole store for execution
export const useOrderExecutionStore = usePortfolioStore;

// Re-export specific functions for type safety
export const useExecuteOrder = (): ((order: OrderRequest) => OrderResult) => {
  return usePortfolioStore((state) => state.executeOrder);
};

/** @deprecated Use useExecuteOrder instead */
export const useExecuteOrderAtomicV2 = useExecuteOrder;
