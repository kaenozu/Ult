import { useTradingStore } from './tradingStore';

export const useWatchlistStore = () => {
    const watchlist = useTradingStore((state) => state.watchlist);
    const addToWatchlist = useTradingStore((state) => state.addToWatchlist);
    const removeFromWatchlist = useTradingStore((state) => state.removeFromWatchlist);
    const updateStockData = useTradingStore((state) => state.updateStockData);
    const batchUpdateStockData = useTradingStore((state) => state.batchUpdateStockData);

    return {
        watchlist,
        addToWatchlist,
        removeFromWatchlist,
        updateStockData,
        batchUpdateStockData,
    };
};
