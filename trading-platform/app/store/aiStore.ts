import { useTradingStore } from './tradingStore';
import { Order } from '../types';

/**
 * AI Store Wrapper
 * 
 * Provides access to AI-related state and actions from the main trading store.
 */
export const useAIStore = () => {
    const aiStatus = useTradingStore((state) => state.aiStatus);
    const toggleAI = useTradingStore((state) => state.toggleAI);
    const trades = useTradingStore((state) => state.portfolio.orders);

    return {
        aiStatus,
        toggleAI,
        trades,
    };
};
