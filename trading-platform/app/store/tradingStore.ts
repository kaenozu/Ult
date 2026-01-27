/**
 * tradingStore.ts - レガシー互換レイヤー
 * このファイルは、既存のテストコードが壊れないようにするために残されています。
 * 内部的には新しく分割された各ストア（useThemeStore, useWatchlistStore等）を呼び出します。
 * ⚠️ 新規開発では各專門ストアを直接使用してください。
 */

import { useThemeStore } from './themeStore';
import { useWatchlistStore } from './watchlistStore';
import { usePortfolioStore } from './portfolioStore';
import { useUIStore } from './uiStore';
import { useAIStore } from './aiStore';

export const useTradingStore = () => {
  const themeStore = useThemeStore();
  const watchlistStore = useWatchlistStore();
  const portfolioStore = usePortfolioStore();
  const uiStore = useUIStore();
  const aiStore = useAIStore();

  return {
    // Theme
    theme: themeStore.theme,
    toggleTheme: themeStore.toggleTheme,

    // Watchlist
    watchlist: watchlistStore.watchlist,
    addToWatchlist: watchlistStore.addToWatchlist,
    removeFromWatchlist: watchlistStore.removeFromWatchlist,
    updateStockData: watchlistStore.updateStockData,
    batchUpdateStockData: (updates: any) => {
      watchlistStore.batchUpdateStockData(updates);
      // ポートフォリオ側の価格更新も連動（旧ストアの挙動）
      portfolioStore.updatePositionPrices(updates);
    },

    // Portfolio
    portfolio: portfolioStore.portfolio,
    updatePortfolio: portfolioStore.updatePortfolio,
    addPosition: portfolioStore.addPosition,
    closePosition: portfolioStore.closePosition,
    setCash: portfolioStore.setCash,

    // Journal
    journal: portfolioStore.journal,
    addJournalEntry: portfolioStore.addJournalEntry,

    // UI
    selectedStock: uiStore.selectedStock,
    setSelectedStock: uiStore.setSelectedStock,
    isConnected: uiStore.isConnected,
    toggleConnection: uiStore.toggleConnection,

    // AI
    aiStatus: aiStore.aiStatus,
    processAITrades: aiStore.processAITrades,
  };
};