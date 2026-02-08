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
      clearWatchlist: () => set({
        watchlist: [],
        selectedStock: null,
      }),
      setSelectedStock: (stock) => set({ selectedStock: stock }),
      batchUpdateStockData: (updates) => set((state) => {
        const updateMap = new Map(updates.map((u) => [u.symbol, u.data]));

        const newWatchlist = state.watchlist.map((stock) => {
          const update = updateMap.get(stock.symbol);
          if (!update) return stock;
          return { ...stock, ...update };
        });

        // 新しい銘柄がある場合は追加
        const existingSymbols = new Set(newWatchlist.map((s) => s.symbol));
        const newStocks = updates
          .filter((u) => !existingSymbols.has(u.symbol))
          .map((u): Stock => {
            // 最小限のStockオブジェクトを作成
            // marketは'japan'または'usa'のみ許容されるため、デフォルトは'usa'
            const market: 'japan' | 'usa' = u.data.market === 'japan' ? 'japan' : 'usa';
            return {
              symbol: u.symbol,
              name: u.data.name ?? u.symbol,
              market,
              sector: u.data.sector ?? '',
              price: u.data.price ?? 0,
              change: u.data.change ?? 0,
              changePercent: u.data.changePercent ?? 0,
              volume: u.data.volume ?? 0,
              high52w: u.data.high52w,
              low52w: u.data.low52w,
            };
          });

        const updatedWatchlist = [...newWatchlist, ...newStocks];

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