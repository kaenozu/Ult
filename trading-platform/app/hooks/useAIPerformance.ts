import { useState, useEffect } from 'react';
import { Stock, OHLCV } from '@/app/types';
import { calculateAIHitRate } from '@/app/lib/analysis';

export function useAIPerformance(stock: Stock, ohlcv: OHLCV[] = []) {
  const [calculatingHitRate, setCalculatingHitRate] = useState(false);
  const [preciseHitRate, setPreciseHitRate] = useState<{ hitRate: number, trades: number }>({ hitRate: 0, trades: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    // Capture the current symbol to detect race conditions
    const currentSymbol = stock.symbol;
    const currentMarket = stock.market;

    const calculateFullPerformance = async () => {
      if (isMounted) {
        setCalculatingHitRate(true);
        setError(null);
      }

      if (!currentSymbol) {
        if (isMounted) {
          setCalculatingHitRate(false);
        }
        return;
      }

      try {
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        const startDate = twoYearsAgo.toISOString().split('T')[0];

        const response = await fetch(`/api/market?type=history&symbol=${currentSymbol}&market=${currentMarket}&startDate=${startDate}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch history: ${response.statusText}`);
        }

        const resultData = await response.json();

        // Verify the symbol hasn't changed (race condition check)
        if (isMounted && stock.symbol === currentSymbol && stock.market === currentMarket) {
          if (resultData.data && resultData.data.length > 100) {
            const result = calculateAIHitRate(currentSymbol, resultData.data, currentMarket);
            setPreciseHitRate({ hitRate: result.hitRate, trades: result.totalTrades });
          } else {
            // データが不十分な場合は表示用データで代用試行
            const result = calculateAIHitRate(currentSymbol, ohlcv, currentMarket);
            setPreciseHitRate({ hitRate: result.hitRate, trades: result.totalTrades });
          }
        }
      } catch (e) {
        console.error('Precise hit rate fetch failed:', e);
        // Verify the symbol hasn't changed before setting error state
        if (isMounted && stock.symbol === currentSymbol && stock.market === currentMarket) {
          // Fallback to provided OHLCV
          try {
             const result = calculateAIHitRate(currentSymbol, ohlcv, currentMarket);
             setPreciseHitRate({ hitRate: result.hitRate, trades: result.totalTrades });
          } catch {
             setError('的中率の計算に失敗しました');
          }
        }
      } finally {
        // Only update loading state if still on the same symbol
        if (isMounted && stock.symbol === currentSymbol && stock.market === currentMarket) {
          setCalculatingHitRate(false);
        }
      }
    };

    calculateFullPerformance();

    return () => {
      isMounted = false;
    };
  }, [stock.symbol, stock.market, ohlcv]); // ohlcvを依存配列に含める

  return { preciseHitRate, calculatingHitRate, error };
}
