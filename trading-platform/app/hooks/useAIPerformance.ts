import { useState, useEffect } from 'react';
import { Stock, OHLCV } from '@/app/types';
import { calculateAIHitRate } from '@/app/lib/analysis';

export function useAIPerformance(stock: Stock, ohlcv: OHLCV[] = []) {
  const [calculatingHitRate, setCalculatingHitRate] = useState(false);
  const [preciseHitRate, setPreciseHitRate] = useState<{ hitRate: number, trades: number }>({ hitRate: 0, trades: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const calculateFullPerformance = async () => {
      if (!stock.symbol) return;

      if (isMounted) {
        setCalculatingHitRate(true);
        setError(null);
      }

      try {
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        const startDate = twoYearsAgo.toISOString().split('T')[0];

        const response = await fetch(`/api/market?type=history&symbol=${stock.symbol}&market=${stock.market}&startDate=${startDate}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch history: ${response.statusText}`);
        }

        const resultData = await response.json();

        if (isMounted) {
          if (resultData.data && resultData.data.length > 100) {
            const result = calculateAIHitRate(stock.symbol, resultData.data, stock.market);
            setPreciseHitRate({ hitRate: result.hitRate, trades: result.totalTrades });
          } else {
            // データが不十分な場合は表示用データで代用試行
            const result = calculateAIHitRate(stock.symbol, ohlcv, stock.market);
            setPreciseHitRate({ hitRate: result.hitRate, trades: result.totalTrades });
          }
        }
      } catch (e) {
        console.error('Precise hit rate fetch failed:', e);
        if (isMounted) {
          // Fallback to provided OHLCV
          try {
             const result = calculateAIHitRate(stock.symbol, ohlcv, stock.market);
             setPreciseHitRate({ hitRate: result.hitRate, trades: result.totalTrades });
          } catch (fallbackError) {
             setError('的中率の計算に失敗しました');
          }
        }
      } finally {
        if (isMounted) {
          setCalculatingHitRate(false);
        }
      }
    };

    calculateFullPerformance();

    return () => {
      isMounted = false;
    };
  }, [stock.symbol, stock.market]); // ohlcvへの依存を外し、銘柄変更時のみ実行

  return { preciseHitRate, calculatingHitRate, error };
}
