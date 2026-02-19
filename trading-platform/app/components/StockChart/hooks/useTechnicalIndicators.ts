import { useState, useEffect } from 'react';
import { indicatorWorkerService } from '@/app/lib/services/IndicatorWorkerService';
import { OHLCV } from '@/app/types';

export const useTechnicalIndicators = (data: OHLCV[], prices: number[]) => {
  const [indicators, setIndicators] = useState<{
    sma20: number[];
    upper: number[];
    lower: number[];
    preCalculated?: {
      rsi: Map<number, number[]>;
      sma: Map<number, number[]>;
      atr: number[];
    };
  }>({
    sma20: [],
    upper: [],
    lower: []
  });

  useEffect(() => {
    if (!prices || prices.length === 0) return;

    let mounted = true;

    const calculate = async () => {
      try {
        const results = await indicatorWorkerService.calculate(data);
        if (mounted) {
          setIndicators({
            sma20: results.sma20,
            upper: results.bb?.upper || [],
            lower: results.bb?.lower || [],
            preCalculated: {
              rsi: results.rsi,
              sma: results.sma,
              atr: results.atr
            }
          });
        }
      } catch (error) {
        console.error('[useTechnicalIndicators] Worker calculation failed:', error);
      }
    };

    calculate();

    return () => {
      mounted = false;
    };
  }, [data]); // Trigger on data change

  return indicators;
};
