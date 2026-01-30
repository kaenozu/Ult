import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Stock } from '../types';

interface WatchlistStore {
  watchlist: Stock[];
  addToWatchlist: (stock: Stock) => void;
  removeFromWatchlist: (symbol: string) => void;
  updateStockData: (symbol: string, data: Partial<Stock>) => void;
  batchUpdateStockData: (updates: { symbol: string, data: Partial<Stock> }[]) => void;
}

export const useWatchlistStore = create<WatchlistStore>()(
  persist(
    (set) => ({
      watchlist: [],

      addToWatchlist: (stock) => set((state) => {
        if (state.watchlist.find(s => s.symbol === stock.symbol)) {
          return state;
        }
        return { watchlist: [...state.watchlist, stock] };
      }),

      removeFromWatchlist: (symbol) => set((state) => ({
        watchlist: state.watchlist.filter(s => s.symbol !== symbol),
      })),

      updateStockData: (symbol, data) => set((state) => {
        const newWatchlist = state.watchlist.map(s =>
          s.symbol === symbol ? { ...s, ...data } : s
        );

        return {
          watchlist: newWatchlist,
        };
      }),

      batchUpdateStockData: (updates) => set((state) => {
        const updateMap = new Map(updates.map(u => [u.symbol, u.data]));

        return {
          watchlist: state.watchlist.map(s => {
            const update = updateMap.get(s.symbol);
            return update ? { ...s, ...update } : s;
          }),
        };
      }),
    }),
    {
      name: 'watchlist-storage',
    }
  )
);