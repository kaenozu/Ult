import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Stock } from '../types';

interface WatchlistState {
  watchlist: Stock[];
  selectedStock: Stock | null;
  addToWatchlist: (stock: Stock) => void;
  removeFromWatchlist: (symbol: string) => void;
  setSelectedStock: (stock: Stock | null) => void;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set) => ({
      watchlist: [],
      selectedStock: null,
      addToWatchlist: (stock) => set((state) => {
        if (state.watchlist.some((s) => s.symbol === stock.symbol)) return state;
        return { watchlist: [...state.watchlist, stock] };
      }),
      removeFromWatchlist: (symbol) => set((state) => ({
        watchlist: state.watchlist.filter((s) => s.symbol !== symbol),
        selectedStock: state.selectedStock?.symbol === symbol ? null : state.selectedStock,
      })),
      setSelectedStock: (stock) => set({ selectedStock: stock }),
    }),
    {
      name: 'trader-pro-watchlist-storage',
    }
  )
);