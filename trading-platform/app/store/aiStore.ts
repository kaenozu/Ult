import { useTradingStore } from './tradingStore';

export const useAIStore = () => {
    const aiStatus = useTradingStore((state) => state.aiStatus);
    const processAITrades = useTradingStore((state) => state.processAITrades);

    return {
        aiStatus,
        processAITrades,
    };
};
