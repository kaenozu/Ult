import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Stock } from '../types';

interface WatchlistState {
  watchlist: Stock[];
  selectedStock: Stock | null;
  addToWatchlist: (stock: Stock) => void;
  removeFromWatchlist: (symbol: string) => void;
  setSelectedStock: (stock: Stock | null) => void;
  updateStockData: (symbol: string, data: Partial<Stock>) => void;
  batchUpdateStockData: (updates: Array<{ symbol: string; data: Partial<Stock> }>) => void;
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
      updateStockData: (symbol, data) => set((state) => ({
        watchlist: state.watchlist.map((s) =>
          s.symbol === symbol ? { ...s, ...data } : s
        ),
        selectedStock: state.selectedStock?.symbol === symbol
          ? { ...state.selectedStock, ...data }
          : state.selectedStock,
      })),
      batchUpdateStockData: (updates) => set((state) => {
        const updateMap = new Map(updates.map(u => [u.symbol, u.data]));
        return {
          watchlist: state.watchlist.map((s) => {
            const update = updateMap.get(s.symbol);
            return update ? { ...s, ...update } : s;
          }),
          selectedStock: state.selectedStock && updateMap.has(state.selectedStock.symbol)
            ? { ...state.selectedStock, ...updateMap.get(state.selectedStock.symbol) }
            : state.selectedStock,
        };
      }),
    }),
    {
      name: 'trader-pro-watchlist-storage',
    }
  )
);