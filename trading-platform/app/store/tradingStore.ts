import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Stock, Portfolio, Position, Order, AIStatus, Theme as AppTheme, Signal as AIAnalysis, OHLCV as MarketData } from '../types';
import { AI_TRADING } from '../lib/constants';

// Define the comprehensive state interface used by legacy components
interface TradingStore {
  // Theme
  theme: AppTheme;
  toggleTheme: () => void;

  // Watchlist
  watchlist: Stock[];
  addToWatchlist: (stock: Stock) => void;
  removeFromWatchlist: (symbol: string) => void;

  // Portfolio
  portfolio: Portfolio;
  updatePortfolio: (positions: Position[]) => void;
  addPosition: (position: Position) => void;
  closePosition: (symbol: string, exitPrice: number) => void;
  setCash: (amount: number) => void;

  // AI & Analysis
  aiStatus: 'active' | 'stopped';
  toggleAI: () => void;

  // Order Execution
  executeOrder: (symbol: string, side: 'LONG' | 'SHORT', quantity: number, price: number) => Promise<boolean>;
  executeOrderAtomic: (order: Order) => void;

  // Deprecated but potentially used fields
  selectedStock: Stock | null;
  setSelectedStock: (stock: Stock | null) => void;

  // Connection Status (Mock for now)
  isConnected: boolean;
  toggleConnection: () => void;

  // Market Data (Mock for compatibility)
  batchUpdateStockData: (data: any[]) => void;
}

// Helper for portfolio stats
function calculatePortfolioStats(positions: Position[]) {
  const totalValue = positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);
  const totalProfit = positions.reduce((sum, p) => {
    const pnl = p.side === 'LONG'
      ? (p.currentPrice - p.avgPrice) * p.quantity
      : (p.avgPrice - p.currentPrice) * p.quantity;
    return sum + pnl;
  }, 0);
  const dailyPnL = positions.reduce((sum, p) => sum + (p.change * p.quantity), 0);
  return { totalValue, totalProfit, dailyPnL };
}

export const useTradingStore = create<TradingStore>()(
  persist(
    (set, get) => ({
      // Theme Defaults
      theme: 'dark',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

      // Watchlist Defaults
      watchlist: [],
      addToWatchlist: (stock) => set((state) => {
        if (state.watchlist.some((s) => s.symbol === stock.symbol)) return state;
        return { watchlist: [...state.watchlist, stock] };
      }),
      removeFromWatchlist: (symbol) => set((state) => ({
        watchlist: state.watchlist.filter((s) => s.symbol !== symbol),
      })),

      // Portfolio Defaults
      portfolio: {
        positions: [],
        orders: [],
        totalValue: 0,
        totalProfit: 0,
        dailyPnL: 0,
        cash: AI_TRADING.INITIAL_VIRTUAL_BALANCE,
      },
      updatePortfolio: (positions) => set((state) => {
        const stats = calculatePortfolioStats(positions);
        return {
          portfolio: { ...state.portfolio, positions, ...stats }
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

        const stats = calculatePortfolioStats(positions);
        return {
          portfolio: { ...state.portfolio, positions, ...stats }
        };
      }),
      closePosition: (symbol, exitPrice) => set((state) => {
        const position = state.portfolio.positions.find(p => p.symbol === symbol);
        if (!position) return state;

        const profit = position.side === 'LONG'
          ? (exitPrice - position.avgPrice) * position.quantity
          : (position.avgPrice - exitPrice) * position.quantity;

        const positions = state.portfolio.positions.filter(p => p.symbol !== symbol);
        const stats = calculatePortfolioStats(positions);

        return {
          portfolio: {
            ...state.portfolio,
            positions,
            ...stats,
            cash: state.portfolio.cash + (position.avgPrice * position.quantity) + profit,
          },
        };
      }),
      setCash: (amount) => set((state) => ({
        portfolio: { ...state.portfolio, cash: amount },
      })),

      // AI Status
      aiStatus: 'active',
      toggleAI: () => set((state) => ({
        aiStatus: state.aiStatus === 'active' ? 'stopped' : 'active'
      })),

      // Order Execution
      executeOrder: async (symbol, side, quantity, price) => {
        const order: Order = {
          id: `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          symbol,
          side: side === 'LONG' ? 'BUY' : 'SELL',
          type: 'MARKET',
          quantity,
          price,
          status: 'FILLED',
          date: new Date().toISOString(),
          timestamp: Date.now()
        };

        get().executeOrderAtomic(order);
        return true;
      },

      executeOrderAtomic: (order) => set((state) => {
         const { portfolio } = state;
         const price = order.price || 0;
         const orderCost = price * order.quantity;

         // Basic validation
         if ((order.side === 'BUY' || order.side === 'LONG' as any) && portfolio.cash < orderCost) {
           return state; // Insufficient funds
         }

         // Update cash
         let newCash = portfolio.cash;
         if (order.side === 'BUY' || order.side === 'LONG' as any) {
           newCash -= orderCost;
         } else {
           // Short selling logic often requires margin, keeping simple here
           newCash += orderCost;
         }

         // Add position
         const newPosition: Position = {
           symbol: order.symbol,
           name: order.symbol,
           side: (order.side === 'BUY' || order.side === 'LONG' as any) ? 'LONG' : 'SHORT',
           quantity: order.quantity,
           avgPrice: price,
           currentPrice: price,
           change: 0,
           // profit: 0,
           // profitPercent: 0,
           market: 'japan', // Default
           // sector: 'Unknown',
           // volume: 0,
           entryDate: new Date().toISOString(),
         };

         // Reuse addPosition logic inside
         const positions = [...portfolio.positions];
         const existingIndex = positions.findIndex(p => p.symbol === newPosition.symbol && p.side === newPosition.side);

         if (existingIndex >= 0) {
           const existing = positions[existingIndex];
           const totalCost = (existing.avgPrice * existing.quantity) + (newPosition.avgPrice * newPosition.quantity);
           const totalQty = existing.quantity + newPosition.quantity;
           positions[existingIndex] = {
             ...existing,
             quantity: totalQty,
             avgPrice: totalCost / totalQty,
             currentPrice: newPosition.currentPrice
           };
         } else {
           positions.push(newPosition);
         }

         const stats = calculatePortfolioStats(positions);

         return {
           portfolio: {
             ...portfolio,
             positions,
             cash: newCash,
             orders: [...portfolio.orders, order],
             ...stats
           }
         };
      }),

      selectedStock: null,
      setSelectedStock: (stock) => set({ selectedStock: stock }),

      isConnected: true,
      toggleConnection: () => set((state) => ({ isConnected: !state.isConnected })),

      batchUpdateStockData: () => { /* Mock implementation */ },
    }),
    {
      name: 'trading-platform-storage-legacy',
    }
  )
);
