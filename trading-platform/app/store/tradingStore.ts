import { useUIStore } from './uiStore';
import { useWatchlistStore } from './watchlistStore';
import { usePortfolioStore } from './portfolioStore';
import { Stock, Portfolio, Position, Order, Theme as AppTheme, Signal as AIAnalysis } from '../types';
import { OrderRequest, OrderResult } from '../types/order';
import { PositionSizeRecommendation } from '../types/risk';
import { kellyCalculator } from '../lib/risk/KellyCalculator';
import { calculateTradingStats } from '../lib/utils/trading-stats';
import { useMemo } from 'react';

// Legacy interface for compatibility
interface TradingStore {
  theme: AppTheme;
  toggleTheme: () => void;
  watchlist: Stock[];
  addToWatchlist: (stock: Stock) => void;
  removeFromWatchlist: (symbol: string) => void;
  clearWatchlist: () => void;
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
 * Performance-optimized Legacy Trading Store Hook
 * Proxies to specialized stores for backward compatibility with memoization.
 * This ensures existing components continue to work while we transition to specialized stores.
 */
export function useTradingStore(): TradingStore;
export function useTradingStore<T>(selector: (state: TradingStore) => T): T;
export function useTradingStore<T>(selector?: (state: TradingStore) => T): TradingStore | T {
  const ui = useUIStore();
  const watchlist = useWatchlistStore();
  const portfolio = usePortfolioStore();

  // Performance optimization: Memoize expensive calculations
  const memoizedState = useMemo(() => {
    const state: TradingStore = {
      theme: ui.theme,
      toggleTheme: ui.toggleTheme,
      isConnected: ui.isConnected,

      watchlist: watchlist.watchlist,
      addToWatchlist: watchlist.addToWatchlist,
      removeFromWatchlist: watchlist.removeFromWatchlist,
      clearWatchlist: watchlist.clearWatchlist,
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
        // Performance optimization: Cache portfolio stats calculation
        const stats = calculateTradingStats(portfolio.portfolio.orders);
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
        return calculateTradingStats(portfolio.portfolio.orders);
      }
    };

    return state;
  }, [ui, watchlist, portfolio]);

  return selector ? selector(memoizedState) : memoizedState;
}
