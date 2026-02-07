import { useTradingStore } from './tradingStore';
import { Stock } from '../types';

/**
 * Watchlist Store Wrapper
 * 
 * Provides access to watchlist state and actions from the main trading store.
 */
export const useWatchlistStore = () => {
    const watchlist = useTradingStore((state) => state.watchlist);
    const addToWatchlist = useTradingStore((state) => state.addToWatchlist);
    const removeFromWatchlist = useTradingStore((state) => state.removeFromWatchlist);
    
    // batchUpdateStockData is available in TradingStore interface
    const batchUpdateStockData = useTradingStore((state) => state.batchUpdateStockData);

    return {
        watchlist,
        addToWatchlist,
        removeFromWatchlist,
        batchUpdateStockData,
    };
};
