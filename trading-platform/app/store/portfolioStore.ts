import { useTradingStore } from './tradingStore';

export const usePortfolioStore = () => {
    const portfolio = useTradingStore((state) => state.portfolio);
    // Optimized: specific components should access journal directly via useJournalStore/useTradingStore
    // const journal = useTradingStore((state) => state.journal);
    const updatePortfolio = useTradingStore((state) => state.updatePortfolio);
    const addPosition = useTradingStore((state) => state.addPosition);
    const executeOrder = useTradingStore((state) => state.executeOrder);
    const closePosition = useTradingStore((state) => state.closePosition);
    const setCash = useTradingStore((state) => state.setCash);
    const addJournalEntry = useTradingStore((state) => state.addJournalEntry);
    const updatePositionPrices = useTradingStore((state) => state.batchUpdateStockData);

    return {
        portfolio,
        // journal,
        updatePortfolio,
        addPosition,
        executeOrder,
        closePosition,
        setCash,
        addJournalEntry,
        updatePositionPrices,
    };
};
