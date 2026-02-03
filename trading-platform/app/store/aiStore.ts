// @ts-nocheck - Temporary
import { useTradingStore } from './tradingStore';

export const useAIStore = () => {
    const aiStatus = useTradingStore((state) => state.aiStatus);
    const processAITrades = useTradingStore((state) => state.processAITrades);
    const trades = useTradingStore((state) => state.portfolio.orders);

    return {
        aiStatus,
        processAITrades,
        trades,
    };
};
