import { useThemeStore } from './themeStore';
import { useWatchlistStore } from './watchlistStore';
import { usePortfolioStore } from './portfolioStore';
import { useOrderExecutionStore } from './orderExecutionStore';
import { useJournalStore } from './journalStore';
import { useUIStore } from './uiStore';
import { useAIStore } from './aiStore';
import { useBehavioralWarningStore } from './behavioralWarningStore';
import { useExtendedJournalStore } from './journalStoreExtended';

// 以前の useTradingStore は廃止されました。
// 代わりに各機能に特化した個別のストアを使用してください。
// import { usePortfolioStore } from '@/app/store/portfolioStore';
// import { useWatchlistStore } from '@/app/store/watchlistStore';
// など

export {
  useThemeStore,
  useWatchlistStore,
  usePortfolioStore,
  useOrderExecutionStore,
  useJournalStore,
  useUIStore,
  useAIStore,
  useBehavioralWarningStore,
  useExtendedJournalStore,
};
