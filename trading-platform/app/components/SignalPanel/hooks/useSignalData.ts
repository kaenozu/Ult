import { useEffect, useMemo, useCallback } from 'react';
import { Stock, Signal, PaperTrade } from '@/app/types';
import { useAIStore } from '@/app/store/aiStore';
import { useJournalStore } from '@/app/store/journalStore';
import { useAIPerformance } from '@/app/hooks/useAIPerformance';
import { useSignalAlerts } from '@/app/hooks/useSignalAlerts';
import { calculateAIStatusMetrics } from '../aiStatus';

export function useSignalData(stock: Stock, signal: Signal | null) {
  const { toggleAI, trades } = useAIStore();
  const journal = useJournalStore((state) => state.journal);
  const { preciseHitRate, calculatingHitRate, error } = useAIPerformance(stock);

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

  // AIPerformance handles signal evaluation, no need for processAITrades here
  // removed processTradesCallback as it relied on non-existent processAITrades

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