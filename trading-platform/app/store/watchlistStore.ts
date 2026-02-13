import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Stock } from '../types';

interface WatchlistState {
  watchlist: Stock[];
  selectedStock: Stock | null;
  addToWatchlist: (stock: Stock) => void;
  removeFromWatchlist: (symbol: string) => void;
  clearWatchlist: () => void;
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
        return { watchlist: [stock, ...state.watchlist] };
      }),
      removeFromWatchlist: (symbol) => set((state) => ({
        watchlist: state.watchlist.filter((s) => s.symbol !== symbol),
        selectedStock: state.selectedStock?.symbol === symbol ? null : state.selectedStock,
      })),
      clearWatchlist: () => set({
        watchlist: [],
        selectedStock: null,
      }),
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
        const updateMap = new Map(updates.map((u) => [u.symbol, u.data]));

        // 現在のウォッチリストにある銘柄のみを更新対象とする（全削除後の復活を防ぐため）
        const updatedWatchlist = state.watchlist.map((stock) => {
          const update = updateMap.get(stock.symbol);
          if (!update) return stock;
          return { ...stock, ...update };
        });

        // selectedStockも更新
        let newSelectedStock = state.selectedStock;
        if (state.selectedStock) {
          const update = updateMap.get(state.selectedStock.symbol);
          if (update) {
            newSelectedStock = { ...state.selectedStock, ...update };
          }
        }

        return {
          watchlist: updatedWatchlist,
          selectedStock: newSelectedStock,
        };
      }),
    }),
    {
      name: 'trader-pro-watchlist-storage',
    }
  )
);
