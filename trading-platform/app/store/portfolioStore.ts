import { useTradingStore } from './tradingStore';

export const usePortfolioStore = () => {
    const portfolio = useTradingStore((state) => state.portfolio);
    const journal = useTradingStore((state) => state.journal);
    const updatePortfolio = useTradingStore((state) => state.updatePortfolio);
    const addPosition = useTradingStore((state) => state.addPosition);
    const closePosition = useTradingStore((state) => state.closePosition);
    const setCash = useTradingStore((state) => state.setCash);
    const addJournalEntry = useTradingStore((state) => state.addJournalEntry);
    const updatePositionPrices = useTradingStore((state) => state.batchUpdateStockData);
    
    // アトミックな注文実行関数を追加
    const executeOrder = useTradingStore((state) => state.executeOrder);

    return {
        portfolio,
        journal,
        updatePortfolio,
        addPosition,
        closePosition,
        setCash,
        addJournalEntry,
        updatePositionPrices,
        executeOrder, // 新規追加
    };
};
