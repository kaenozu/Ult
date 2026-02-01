import { useTradingStore } from './tradingStore';

/**
 * Order Execution Store - Wrapper for trading store order execution
 */
export const useOrderExecutionStore = () => {
    const executeOrderAtomic = useTradingStore((state) => state.executeOrderAtomic);
    return { executeOrderAtomic };
};
