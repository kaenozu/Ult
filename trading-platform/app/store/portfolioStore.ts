import { useTradingStore } from './tradingStore';
import { useJournalStore } from './journalStore';

export const usePortfolioStore = () => {
    const portfolio = useTradingStore((state) => state.portfolio);
    const updatePortfolio = useTradingStore((state) => state.updatePortfolio);
    const addPosition = useTradingStore((state) => state.addPosition);
    const executeOrder = useTradingStore((state) => state.executeOrder);
    const closePosition = useTradingStore((state) => state.closePosition);
    const setCash = useTradingStore((state) => state.setCash);
    const updatePositionPrices = useTradingStore((state) => state.batchUpdateStockData);

    // Journal from separate store
    const journal = useJournalStore((state) => state.journal);
    const addJournalEntry = useJournalStore((state) => state.addJournalEntry);

    return {
        portfolio,
        journal,
        updatePortfolio,
        addPosition,
        executeOrder,
        closePosition,
        setCash,
        addJournalEntry,
        updatePositionPrices,
    };
};
