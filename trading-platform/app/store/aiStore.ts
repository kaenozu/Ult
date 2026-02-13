import { usePortfolioStore } from './portfolioStore';
import { Order } from '../types';

/**
 * AI Store Wrapper
 * 
 * Provides access to AI-related state and actions from the main trading store.
 */
export const useAIStore = () => {
    const aiStatus = usePortfolioStore((state) => state.aiStatus);
    const toggleAI = usePortfolioStore((state) => state.toggleAI);
    const trades = usePortfolioStore((state) => state.portfolio.orders);

    return {
        aiStatus,
        toggleAI,
        trades,
    };
};
