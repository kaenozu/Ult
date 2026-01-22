import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Stock, Position, Portfolio, JournalEntry, Theme } from '../types';
import { JAPAN_STOCKS, USA_STOCKS } from '../data/stocks';

interface TradingStore {
  theme: Theme;
  toggleTheme: () => void;
  watchlist: Stock[];
  addToWatchlist: (stock: Stock) => void;
  removeFromWatchlist: (symbol: string) => void;
  updateStockData: (symbol: string, data: Partial<Stock>) => void;
  portfolio: Portfolio;
  updatePortfolio: (positions: Position[]) => void;
  addPosition: (position: Position) => void;
  closePosition: (symbol: string, exitPrice: number) => void;
  journal: JournalEntry[];
  addJournalEntry: (entry: JournalEntry) => void;
  selectedStock: Stock | null;
  setSelectedStock: (stock: Stock | null) => void;
  isConnected: boolean;
  toggleConnection: () => void;
}

const initialPortfolio: Portfolio = {
  positions: [
    {
      symbol: 'NVDA',
      name: 'NVIDIA Corp.',
      market: 'usa',
      side: 'LONG',
      quantity: 10,
      avgPrice: 850.00,
      currentPrice: 875.40,
      entryDate: '2024-01-15',
    },
    {
      symbol: '7203',
      name: 'トヨタ自動車',
      market: 'japan',
      side: 'LONG',
      quantity: 100,
      avgPrice: 3500,
      currentPrice: 3580,
      entryDate: '2024-01-10',
    },
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      market: 'usa',
      side: 'LONG',
      quantity: 5,
      avgPrice: 180.00,
      currentPrice: 185.50,
      entryDate: '2024-01-20',
    },
  ],
  totalValue: 0,
  totalProfit: 0,
  dailyPnL: 0,
  cash: 250000,
};

export const useTradingStore = create<TradingStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

      watchlist: [...JAPAN_STOCKS.slice(0, 5), ...USA_STOCKS.slice(0, 5)],

      addToWatchlist: (stock) => set((state) => {
        if (state.watchlist.find(s => s.symbol === stock.symbol)) {
          return state;
        }
        return { watchlist: [...state.watchlist, stock] };
      }),

      removeFromWatchlist: (symbol) => set((state) => ({
        watchlist: state.watchlist.filter(s => s.symbol !== symbol),
      })),

      updateStockData: (symbol, data) => set((state) => ({
        watchlist: state.watchlist.map(s => 
          s.symbol === symbol ? { ...s, ...data } : s
        ),
        // Also update portfolio current prices if matched
        portfolio: {
          ...state.portfolio,
          positions: state.portfolio.positions.map(p => 
            p.symbol === symbol && data.price ? { ...p, currentPrice: data.price } : p
          )
        }
      })),

      portfolio: initialPortfolio,

      updatePortfolio: (positions) => set((state) => {
        const totalValue = positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);
        const totalProfit = positions.reduce((sum, p) => sum + (p.currentPrice - p.avgPrice) * p.quantity, 0);
        const dailyPnL = positions.reduce((sum, p) => {
          const prevPrice = p.currentPrice * 0.995;
          return sum + (p.currentPrice - prevPrice) * p.quantity;
        }, 0);
        return {
          portfolio: {
            ...state.portfolio,
            positions,
            totalValue,
            totalProfit,
            dailyPnL,
          },
        };
      }),

      addPosition: (position) => set((state) => {
        const positions = [...state.portfolio.positions, position];
        const totalValue = positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);
        const totalProfit = positions.reduce((sum, p) => sum + (p.currentPrice - p.avgPrice) * p.quantity, 0);
        return {
          portfolio: {
            ...state.portfolio,
            positions,
            totalValue,
            totalProfit,
          },
        };
      }),

      closePosition: (symbol, exitPrice) => set((state) => {
        const position = state.portfolio.positions.find(p => p.symbol === symbol);
        if (!position) return state;

        const profit = (exitPrice - position.avgPrice) * position.quantity;
        const profitPercent = ((exitPrice - position.avgPrice) / position.avgPrice) * 100;

        const entry: JournalEntry = {
          id: Date.now().toString(),
          symbol,
          date: position.entryDate,
          signalType: position.side === 'LONG' ? 'BUY' : 'SELL',
          entryPrice: position.avgPrice,
          exitPrice,
          quantity: position.quantity,
          profit,
          profitPercent,
          notes: '',
          status: 'CLOSED',
        };

        const positions = state.portfolio.positions.filter(p => p.symbol !== symbol);
        const totalValue = positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);
        const totalProfit = positions.reduce((sum, p) => sum + (p.currentPrice - p.avgPrice) * p.quantity, 0);

        return {
          portfolio: {
            ...state.portfolio,
            positions,
            totalValue,
            totalProfit,
          },
          journal: [...state.journal, entry],
        };
      }),

      journal: [],

      addJournalEntry: (entry) => set((state) => ({
        journal: [...state.journal, entry],
      })),

      selectedStock: null,

      setSelectedStock: (stock) => set({ selectedStock: stock }),

      isConnected: true,

      toggleConnection: () => set((state) => ({ isConnected: !state.isConnected })),
    }),
    {
      name: 'trading-platform-storage',
      partialize: (state) => ({
        theme: state.theme,
        watchlist: state.watchlist,
        journal: state.journal,
        portfolio: state.portfolio,
      }),
    }
  )
);
