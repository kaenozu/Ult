import { useEffect, useMemo, useCallback } from 'react';
import { Stock, Signal, PaperTrade, OHLCV } from '@/app/types';
import { useAIStore } from '@/app/store/aiStore';
import { useJournalStore } from '@/app/store/journalStore';
import { useSymbolAccuracy } from '@/app/hooks/useSymbolAccuracy';
import { useSignalAlerts } from '@/app/hooks/useSignalAlerts';
import { calculateAIStatusMetrics } from '../aiStatus';

/**
 * Hook to manage signal-related data and performance metrics
 */
export function useSignalData(stock: Stock, signal: Signal | null, ohlcv: OHLCV[] = []) {
  const { toggleAI, trades } = useAIStore();
  const journal = useJournalStore((state) => state.journal);
  const { accuracy, loading: accuracyLoading } = useSymbolAccuracy(stock, ohlcv);

  // Precise hit rate initialized in useMemo to avoid conditional dependency issues
  const preciseHitRate = useMemo(() => 
    accuracy ? { hitRate: accuracy.hitRate, trades: accuracy.totalTrades } : null,
    [accuracy]
  );
  const calculatingHitRate = accuracyLoading;
  const error: string | null = null;

  const displaySignal = signal;

  // Memoized hit rate object to prevent unnecessary re-renders
  const hitRateData = useMemo(() => ({
    hitRate: preciseHitRate?.hitRate || 0,
    trades: preciseHitRate?.trades || 0
  }), [preciseHitRate]);

  // Alert Logic Hook
  useSignalAlerts({
    stock,
    displaySignal,
    preciseHitRate: hitRateData,
    calculatingHitRate
  });

  // Memoized trades transformation
  const aiTrades: PaperTrade[] = useMemo(() => {
    return trades
      .filter(t => t.symbol === stock.symbol)
      .map(o => ({
        id: o.id,
        symbol: o.symbol,
        type: (o.side === 'BUY') ? 'BUY' : 'SELL',
        entryPrice: o.price || 0,
        quantity: o.quantity,
        status: o.status === 'FILLED' ? 'CLOSED' : 'OPEN',
        entryDate: o.date,
        profitPercent: 0,
      }));
  }, [trades, stock.symbol]);

  // Memoized status data from journal entries
  const aiStatusData = useMemo(() => {
    const metrics = calculateAIStatusMetrics(journal);
    return {
      virtualBalance: metrics.virtualBalance,
      totalProfit: metrics.totalProfit,
      realizedProfit: metrics.realizedProfit,
      unrealizedProfit: metrics.unrealizedProfit,
      winRate: metrics.winRate,
      trades: aiTrades
    };
  }, [journal, aiTrades]);

  return {
    displaySignal,
    preciseHitRate,
    calculatingHitRate,
    error,
    aiTrades,
    aiStatusData
  };
}
