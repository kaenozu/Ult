import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useThemeStore } from './themeStore';
import { useWatchlistStore } from './watchlistStore';
import { usePortfolioStore } from './portfolioStore';
import { useOrderExecutionStore } from './orderExecutionStore';
import { useJournalStore } from './journalStore';
import { useUIStore } from './uiStore';
import { useAIStore } from './aiStore';

// Master Store - 全てのストアを統合
export const useTradingStore = create<{}>()(
  persist(
    () => ({}),
    {
      name: 'trading-platform-storage',
      partialize: () => {
        // 各ストアのpartializeを統合
        const themeState = useThemeStore.getState();
        const watchlistState = useWatchlistStore.getState();
        const portfolioState = usePortfolioStore.getState();
        const journalState = useJournalStore.getState();
        const aiState = useAIStore.getState();
        
        return {
          theme: themeState.theme,
          watchlist: watchlistState.watchlist,
          journal: journalState.journal,
          portfolio: portfolioState.portfolio,
          aiStatus: aiState.aiStatus,
        };
      },
    }
  )
);

// 各ストアの状態とアクションをエクスポート
export {
  useThemeStore,
  useWatchlistStore,
  usePortfolioStore,
  useOrderExecutionStore,
  useJournalStore,
  useUIStore,
  useAIStore,
};