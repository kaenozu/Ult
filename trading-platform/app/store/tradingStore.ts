import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Stock, Position, Portfolio, JournalEntry, Theme } from '../types';

interface TradingStore {
  theme: Theme;
  toggleTheme: () => void;
  watchlist: Stock[];
  addToWatchlist: (stock: Stock) => void;
  removeFromWatchlist: (symbol: string) => void;
  updateStockData: (symbol: string, data: Partial<Stock>) => void;
  batchUpdateStockData: (updates: { symbol: string, data: Partial<Stock> }[]) => void;
  portfolio: Portfolio;
  updatePortfolio: (positions: Position[]) => void;
  addPosition: (position: Position) => void;
  closePosition: (symbol: string, exitPrice: number) => void;
  setCash: (amount: number) => void;
  journal: JournalEntry[];
  addJournalEntry: (entry: JournalEntry) => void;
  selectedStock: Stock | null;
  setSelectedStock: (stock: Stock | null) => void;
  isConnected: boolean;
  toggleConnection: () => void;
}

const initialPortfolio: Portfolio = {
  positions: [],
  orders: [],
  totalValue: 0,
  totalProfit: 0,
  dailyPnL: 0,
  cash: 1000000, // 1M JPY initial capital
};

export const useTradingStore = create<TradingStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

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
        
        const newPositions = state.portfolio.positions.map(p => 
          p.symbol === symbol ? { 
            ...p, 
            currentPrice: data.price ?? p.currentPrice,
            change: data.change ?? p.change 
          } : p
        );

        const dailyPnL = newPositions.reduce((sum, p) => sum + (p.change * p.quantity), 0);

        return {
          watchlist: newWatchlist,
          portfolio: {
            ...state.portfolio,
            positions: newPositions,
            dailyPnL
          }
        };
      }),

      batchUpdateStockData: (updates) => set((state) => {
        const updateMap = new Map(updates.map(u => [u.symbol, u.data]));

        return {
          watchlist: state.watchlist.map(s => {
            const update = updateMap.get(s.symbol);
            return update ? { ...s, ...update } : s;
          }),
          portfolio: {
            ...state.portfolio,
            positions: state.portfolio.positions.map(p => {
              const update = updateMap.get(p.symbol);
              return update && update.price ? { ...p, currentPrice: update.price } : p;
            })
          }
        };
      }),

      portfolio: initialPortfolio,

      updatePortfolio: (positions) => set((state) => {
        const totalValue = positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);
        const totalProfit = positions.reduce((sum, p) => sum + (p.currentPrice - p.avgPrice) * p.quantity, 0);
        const dailyPnL = positions.reduce((sum, p) => sum + (p.change * p.quantity), 0);
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

      addPosition: (newPosition) => set((state) => {
        const positions = [...state.portfolio.positions];
        const existingIndex = positions.findIndex(p => p.symbol === newPosition.symbol && p.side === newPosition.side);

        if (existingIndex >= 0) {
          const existing = positions[existingIndex];
          const totalCost = (existing.avgPrice * existing.quantity) + (newPosition.avgPrice * newPosition.quantity);
          const totalQty = existing.quantity + newPosition.quantity;
          
          positions[existingIndex] = {
            ...existing,
            quantity: totalQty,
            avgPrice: totalCost / totalQty,
            currentPrice: newPosition.currentPrice,
            change: newPosition.change
          };
        } else {
          positions.push(newPosition);
        }

        const totalValue = positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);
        const totalProfit = positions.reduce((sum, p) => {
          const pnl = p.side === 'LONG' 
            ? (p.currentPrice - p.avgPrice) * p.quantity
            : (p.avgPrice - p.currentPrice) * p.quantity;
          return sum + pnl;
        }, 0);
        const dailyPnL = positions.reduce((sum, p) => sum + (p.change * p.quantity), 0);
        
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

      closePosition: (symbol, exitPrice) => set((state) => {
        const position = state.portfolio.positions.find(p => p.symbol === symbol);
        if (!position) return state;

        const profit = position.side === 'LONG'
          ? (exitPrice - position.avgPrice) * position.quantity
          : (position.avgPrice - exitPrice) * position.quantity;
          
        const profitPercent = position.side === 'LONG'
          ? ((exitPrice - position.avgPrice) / position.avgPrice) * 100
          : ((position.avgPrice - exitPrice) / position.avgPrice) * 100;

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
        const totalProfit = positions.reduce((sum, p) => {
          const pnl = p.side === 'LONG' 
            ? (p.currentPrice - p.avgPrice) * p.quantity
            : (p.avgPrice - p.currentPrice) * p.quantity;
          return sum + pnl;
        }, 0);
        const dailyPnL = positions.reduce((sum, p) => sum + (p.change * p.quantity), 0);

        return {
          portfolio: {
            ...state.portfolio,
            positions,
            totalValue,
            totalProfit,
            dailyPnL,
            // Return capital + profit to cash
            cash: state.portfolio.cash + (position.avgPrice * position.quantity) + profit, 
          },
          journal: [...state.journal, entry],
        };
      }),

      setCash: (amount) => set((state) => ({
        portfolio: {
          ...state.portfolio,
          cash: amount,
        },
      })),

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
