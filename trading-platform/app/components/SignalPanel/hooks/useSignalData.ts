import { useEffect, useMemo, useCallback } from 'react';
import { Stock, Signal, PaperTrade } from '@/app/types';
import { useAIStore } from '@/app/store/aiStore';
import { useAIPerformance } from '@/app/hooks/useAIPerformance';
import { useSignalAlerts } from '@/app/hooks/useSignalAlerts';

export function useSignalData(stock: Stock, signal: Signal | null, liveSignal: Signal | null) {
  const { processAITrades, trades } = useAIStore();
  const { preciseHitRate, calculatingHitRate, error } = useAIPerformance(stock);

  const displaySignal = liveSignal || signal;

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

  // Memoized process trades function
  const processTradesCallback = useCallback(() => {
    if (displaySignal && stock.price && processAITrades) {
      processAITrades(stock.symbol, stock.price, displaySignal);
    }
  }, [displaySignal, stock.price, stock.symbol, processAITrades]);

  // 自動売買プロセスをトリガー - Use callback
  useEffect(() => {
    processTradesCallback();
  }, [processTradesCallback]);

  // Memoized trades transformation
  const aiTrades: PaperTrade[] = useMemo(() => {
    return trades
      .filter(t => t.symbol === stock.symbol)
      .map(o => ({
        id: o.id,
        symbol: o.symbol,
        type: (o.side === 'BUY' || o.side === 'LONG') ? 'BUY' : 'SELL',
        entryPrice: o.price || 0,
        quantity: o.quantity,
        status: o.status === 'FILLED' ? 'CLOSED' : 'OPEN',
        entryDate: o.date,
        profitPercent: 0,
      }));
  }, [trades, stock.symbol]);

  // Memoized status data
  const aiStatusData = useMemo(() => ({
    virtualBalance: 10000000,
    totalProfit: 0,
    trades: aiTrades
  }), [aiTrades]);

  return {
    displaySignal,
    preciseHitRate,
    calculatingHitRate,
    error,
    aiTrades,
    aiStatusData
  };
}