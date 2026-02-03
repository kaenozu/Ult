// @ts-nocheck - Temporary: needs type fixes
import { useTradingStore } from './tradingStore';

export const useWatchlistStore = () => {
    const watchlist = useTradingStore((state) => state.watchlist);
    const addToWatchlist = useTradingStore((state) => state.addToWatchlist);
    const removeFromWatchlist = useTradingStore((state) => state.removeFromWatchlist);
    const batchUpdateStockData = useTradingStore((state) => state.batchUpdateStockData);

    return {
        watchlist,
        addToWatchlist,
        removeFromWatchlist,
        batchUpdateStockData,
    };
};
