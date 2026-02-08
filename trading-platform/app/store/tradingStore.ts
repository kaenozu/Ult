import { useUIStore } from './uiStore';
import { useWatchlistStore } from './watchlistStore';
import { usePortfolioStore } from './portfolioStore';
import { Stock, Portfolio, Position, Order, Theme as AppTheme, Signal as AIAnalysis } from '../types';
import { OrderRequest, OrderResult } from '../types/order';
import { PositionSizeRecommendation } from '../types/risk';
import { kellyCalculator } from '../lib/risk/KellyCalculator';

// Legacy interface for compatibility
interface TradingStore {
  theme: AppTheme;
  toggleTheme: () => void;
  watchlist: Stock[];
  addToWatchlist: (stock: Stock) => void;
  removeFromWatchlist: (symbol: string) => void;
  portfolio: Portfolio;
  updatePortfolio: (positions: Position[]) => void;
  closePosition: (symbol: string, exitPrice: number) => OrderResult;
  executeOrder: (order: OrderRequest) => OrderResult;
  aiStatus: 'active' | 'stopped';
  toggleAI: () => void;
  selectedStock: Stock | null;
  setSelectedStock: (stock: Stock | null) => void;
  isConnected: boolean;
  setCash: (amount: number) => void;
  // Stats
  calculatePositionSize: (symbol: string, signal?: AIAnalysis) => PositionSizeRecommendation | null;
  getPortfolioStats: () => { winRate: number; avgWin: number; avgLoss: number; totalTrades: number };
}

/**
 * Legacy Trading Store Hook
 * Proxies to specialized stores for backward compatibility.
 * This ensures existing components continue to work while we transition to specialized stores.
 */
export function useTradingStore(): TradingStore;
export function useTradingStore<T>(selector: (state: TradingStore) => T): T;
export function useTradingStore<T>(selector?: (state: TradingStore) => T): TradingStore | T {
  const ui = useUIStore();
  const watchlist = useWatchlistStore();
  const portfolio = usePortfolioStore();

  const state: TradingStore = {
    theme: ui.theme,
    toggleTheme: ui.toggleTheme,
    isConnected: ui.isConnected,

    watchlist: watchlist.watchlist,
    addToWatchlist: watchlist.addToWatchlist,
    removeFromWatchlist: watchlist.removeFromWatchlist,
    selectedStock: watchlist.selectedStock,
    setSelectedStock: watchlist.setSelectedStock,

    portfolio: portfolio.portfolio,
    aiStatus: portfolio.aiStatus,
    updatePortfolio: portfolio.updatePortfolio,
    executeOrder: portfolio.executeOrder,
    closePosition: portfolio.closePosition,
    toggleAI: portfolio.toggleAI,
    setCash: portfolio.setCash,

    calculatePositionSize: (symbol, signal) => {
      const stats = state.getPortfolioStats();
      if (stats.totalTrades < 10) return null;
      const portfolioValue = portfolio.portfolio.cash + portfolio.portfolio.totalValue;
      return kellyCalculator.getRecommendation(
        { winRate: stats.winRate, avgWin: stats.avgWin, avgLoss: stats.avgLoss, portfolioValue },
        symbol,
        signal?.atr,
        portfolio.portfolio.positions.map(p => ({ symbol: p.symbol, value: p.currentPrice * p.quantity }))
      );
    },

    getPortfolioStats: () => {
      const orders = portfolio.portfolio.orders.filter(o => o.status === 'FILLED');
      if (orders.length === 0) return { winRate: 0.5, avgWin: 0, avgLoss: 0, totalTrades: 0 };

      const winningTrades = orders.filter(o => o.side === 'SELL' && (o.price || 0) > 100); // Simple mock logic
      return {
        winRate: winningTrades.length / orders.length || 0.5,
        avgWin: 100,
        avgLoss: 50,
        totalTrades: orders.length
      };
    }
  };

  return selector ? selector(state) : state;
}