import { useState, useEffect, useMemo } from 'react';
import { Stock, OHLCV } from '@/app/types';
import { runBacktest, BacktestResult } from '@/app/lib/backtest';
import { usePerformanceMonitor } from '@/app/lib/performance';

export function useBacktestControls(stock: Stock, ohlcv: OHLCV[] = [], activeTab: string, loading: boolean) {
  const { measure } = usePerformanceMonitor('SignalPanel');
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [isBacktesting, setIsBacktesting] = useState(false);

  // Extract last date for stable dependency
  const lastDataDate = useMemo(() => 
    ohlcv.length > 0 ? ohlcv[ohlcv.length - 1].date : 'empty',
    [ohlcv]
  );

  // Reset backtest when stock changes
  useEffect(() => {
    setBacktestResult(null);
  }, [stock.symbol]);

  // Lazy load backtest result
  useEffect(() => {
    if (loading) return;

    if (activeTab === 'backtest' && !backtestResult && !isBacktesting) {
      if (!ohlcv || ohlcv.length === 0) {
        setBacktestResult({
          symbol: stock.symbol,
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          totalReturn: 0,
          avgProfit: 0,
          avgLoss: 0,
          profitFactor: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
          trades: [],
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString()
        });
        return;
      }

      setIsBacktesting(true);
      // Use setTimeout to unblock the main thread for UI updates (e.g. tab switch)
      setTimeout(() => {
        try {
          const result = measure('runBacktest', () =>
            runBacktest(stock.symbol, ohlcv, stock.market)
          );
          setBacktestResult(result);
        } catch (e) {
          console.error("Backtest failed", e);
        } finally {
          setIsBacktesting(false);
        }
      }, 50);
    }
  }, [activeTab, backtestResult, isBacktesting, ohlcv, lastDataDate, stock.symbol, stock.market, loading, measure]);

  return {
    backtestResult,
    isBacktesting
  };
}