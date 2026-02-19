import { useMemo } from 'react';
import { Stock, Signal, PaperTrade, OHLCV, Order } from '@/app/types';
import { useAIStore } from '@/app/store/aiStore';
import { useJournalStore } from '@/app/store/journalStore';
import { useSymbolAccuracy } from '@/app/hooks/useSymbolAccuracy';
import { useSignalAlerts } from '@/app/hooks/useSignalAlerts';
import { calculateAIStatusMetrics } from '../aiStatus';

/**
 * Hook to manage signal-related data and performance metrics
 */
export function useSignalData(stock: Stock, signal: Signal | null, ohlcv: OHLCV[] = []) {
  const { trades } = useAIStore();
  const journal = useJournalStore((state) => state.journal);
  const { accuracy, loading: accuracyLoading } = useSymbolAccuracy(stock, ohlcv);
  
  const calculatingHitRate = accuracyLoading;
  const error: string | null = null; // useSymbolAccuracy doesn't return error

  const displaySignal = signal;

  // Memoized hit rate object to prevent unnecessary re-renders
  const hitRateData = useMemo(() => ({
    hitRate: accuracy?.hitRate || 0,
    directionalAccuracy: accuracy?.directionalAccuracy || 0,
    trades: accuracy?.totalTrades || 0
  }), [accuracy?.hitRate, accuracy?.directionalAccuracy, accuracy?.totalTrades]);

  // Alert Logic Hook
  useSignalAlerts({
    stock,
    displaySignal,
    preciseHitRate: hitRateData,
    calculatingHitRate
  });

  // Memoized trades transformation
  const aiTrades: PaperTrade[] = useMemo(() => {
    return (trades || [])
      .filter((t: Order) => t.symbol === stock.symbol)
      .map((o: Order) => ({
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
    preciseHitRate: hitRateData,
    calculatingHitRate,
    error,
    aiTrades,
    aiStatusData
  };
}
