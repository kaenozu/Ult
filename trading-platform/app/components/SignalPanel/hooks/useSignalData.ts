import { useState, useEffect, useMemo } from 'react';
import { Stock, Signal, PaperTrade } from '@/app/types';
import { useAIStore } from '@/app/store/aiStore';
import { useAIPerformance } from '@/app/hooks/useAIPerformance';
import { useSignalAlerts } from '@/app/hooks/useSignalAlerts';

export function useSignalData(stock: Stock, signal: Signal | null, liveSignal: Signal | null) {
  const { aiStatus: aiStateString, processAITrades, trades } = useAIStore();
  const { preciseHitRate, calculatingHitRate, error } = useAIPerformance(stock);

  const displaySignal = liveSignal || signal;

  // Alert Logic Hook
  useSignalAlerts({
    stock,
    displaySignal,
    preciseHitRate: { hitRate: preciseHitRate?.hitRate || 0, trades: preciseHitRate?.trades || 0 },
    calculatingHitRate
  });

  // 自動売買プロセスをトリガー
  useEffect(() => {
    if (displaySignal && stock.price && processAITrades) {
      processAITrades(stock.symbol, stock.price, displaySignal);
    }
  }, [stock.symbol, stock.price, displaySignal, processAITrades]);

  const aiTrades: PaperTrade[] = useMemo(() => {
    return trades
      .filter(t => t.symbol === stock.symbol)
      .map(o => ({
        id: o.id,
        symbol: o.symbol,
        type: (o.side === 'BUY' || o.side === 'LONG' as any) ? 'BUY' : 'SELL',
        entryPrice: o.price || 0,
        quantity: o.quantity,
        status: o.status === 'FILLED' ? 'CLOSED' : 'OPEN',
        entryDate: o.date,
        profitPercent: 0,
      }));
  }, [trades, stock.symbol]);

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