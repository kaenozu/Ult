import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useThemeStore } from './themeStore';
import { useWatchlistStore } from './watchlistStore';
import { usePortfolioStore } from './portfolioStore';
import { useOrderExecutionStore } from './orderExecutionStore';
import { useJournalStore } from './journalStore';
import { useUIStore } from './uiStore';
import { useAIStore } from './aiStore';

export const useTradingStore = create<{}>()(
  persist(
    () => ({}),
    {
      name: 'trading-platform-storage',
      partialize: () => {
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

export { useTradingStore as default };

export {
  useThemeStore,
  useWatchlistStore,
  usePortfolioStore,
  useOrderExecutionStore,
  useJournalStore,
  useUIStore,
  useAIStore,
};
